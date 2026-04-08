/**
 * TreeCanvas — D3-based pannable, zoomable canvas showing BranchNodes.
 * Nodes are positioned by generation (vertical) and spread horizontally.
 * Pan-and-snap: after panning ends, the nearest node snaps to center and gains focus.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import type { BranchNode } from '../lib/types';
import { useTheme } from './ThemeContext';

interface Props {
  branchNodes: BranchNode[];
  onBranchClick: (branch: BranchNode) => void;
  focusBranchId: string | null;
  onFocusChange: (branchId: string | null) => void;
}

interface LayoutNode {
  branch: BranchNode;
  x: number;
  y: number;
}

const NODE_WIDTH = 130;
const NODE_HEIGHT = 70;
const H_GAP = 16;
const V_GAP = 80;
const SNAP_DURATION = 400;

export default function TreeCanvas({ branchNodes, onBranchClick, focusBranchId, onFocusChange }: Props) {
  const { colors } = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const layoutRef = useRef<LayoutNode[]>([]);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const focusedIdRef = useRef<string | null>(null);
  const snapTimeoutRef = useRef<number | null>(null);
  const isSnappingRef = useRef(false);
  const colorsRef = useRef(colors);
  colorsRef.current = colors;

  // Keep ref in sync with state so D3 click handlers see the latest value
  focusedIdRef.current = focusedId;

  // Build layout: position nodes by generation with paternal/maternal split.
  // Most recent generation at top; each parent generation splits left (paternal) / right (maternal).
  const buildLayout = useCallback((): LayoutNode[] => {
    if (branchNodes.length === 0) return [];

    const branchMap = new Map(branchNodes.map((n) => [n.id, n]));

    // Group by generation
    const byGen = new Map<number, BranchNode[]>();
    for (const node of branchNodes) {
      if (!byGen.has(node.generation)) byGen.set(node.generation, []);
      byGen.get(node.generation)!.push(node);
    }

    const generations = [...byGen.keys()].sort((a, b) => a - b);
    const maxGen = generations[generations.length - 1];

    // Assign each branch a fractional position [fracStart, fracStart + fracWidth] within [0, 1]
    const positions = new Map<string, { frac: number; width: number }>();

    // Start from the most recent generation (highest number) — these are the "roots" of the visual tree
    const rootGen = byGen.get(maxGen) ?? [];
    const rootWidth = 1 / Math.max(rootGen.length, 1);
    rootGen.forEach((node, i) => {
      positions.set(node.id, { frac: i * rootWidth, width: rootWidth });
    });

    // Classify a node's parent branches as paternal (left) vs maternal (right).
    function classifyParents(node: BranchNode): { paternalIds: string[]; maternalIds: string[] } {
      const parentIds = node.parentBranchIds;
      const paternalIds: string[] = [];
      const maternalIds: string[] = [];

      const primary = node.primaryPerson;
      const secondary = node.secondaryPerson;

      for (const pid of parentIds) {
        const parentBranch = branchMap.get(pid);
        if (!parentBranch) continue;
        const pids = parentBranch.personIds;

        const isPrimaryParent =
          (primary.fatherId != null && pids.includes(primary.fatherId)) ||
          (primary.motherId != null && pids.includes(primary.motherId));

        const isSecondaryParent = secondary != null && (
          (secondary.fatherId != null && pids.includes(secondary.fatherId)) ||
          (secondary.motherId != null && pids.includes(secondary.motherId)));

        if (isPrimaryParent) {
          paternalIds.push(pid);
        } else if (isSecondaryParent) {
          maternalIds.push(pid);
        } else {
          if (paternalIds.length <= maternalIds.length) paternalIds.push(pid);
          else maternalIds.push(pid);
        }
      }

      return { paternalIds, maternalIds };
    }

    const minGen = generations[0];
    for (let g = maxGen; g >= minGen; g--) {
      const nodesAtGen = byGen.get(g);
      if (!nodesAtGen) continue;

      const parentRanges = new Map<string, { minFrac: number; maxFrac: number }>();

      for (const node of nodesAtGen) {
        const pos = positions.get(node.id);
        if (!pos) continue;

        const parentIds = node.parentBranchIds;
        if (parentIds.length === 0) continue;

        if (parentIds.length === 1) {
          const pid = parentIds[0];
          const existing = parentRanges.get(pid);
          if (existing) {
            existing.minFrac = Math.min(existing.minFrac, pos.frac);
            existing.maxFrac = Math.max(existing.maxFrac, pos.frac + pos.width);
          } else {
            parentRanges.set(pid, { minFrac: pos.frac, maxFrac: pos.frac + pos.width });
          }
        } else {
          const { paternalIds, maternalIds } = classifyParents(node);

          const leftCount = paternalIds.length;
          const rightCount = maternalIds.length;
          const leftWidth = rightCount === 0 ? pos.width : leftCount === 0 ? 0 : pos.width / 2;
          const rightWidth = pos.width - leftWidth;

          if (leftCount > 0) {
            const subWidth = leftWidth / leftCount;
            for (let pi = 0; pi < leftCount; pi++) {
              const pid = paternalIds[pi];
              const fracStart = pos.frac + pi * subWidth;
              const existing = parentRanges.get(pid);
              if (existing) {
                existing.minFrac = Math.min(existing.minFrac, fracStart);
                existing.maxFrac = Math.max(existing.maxFrac, fracStart + subWidth);
              } else {
                parentRanges.set(pid, { minFrac: fracStart, maxFrac: fracStart + subWidth });
              }
            }
          }

          if (rightCount > 0) {
            const subWidth = rightWidth / rightCount;
            const rightStart = pos.frac + leftWidth;
            for (let mi = 0; mi < rightCount; mi++) {
              const pid = maternalIds[mi];
              const fracStart = rightStart + mi * subWidth;
              const existing = parentRanges.get(pid);
              if (existing) {
                existing.minFrac = Math.min(existing.minFrac, fracStart);
                existing.maxFrac = Math.max(existing.maxFrac, fracStart + subWidth);
              } else {
                parentRanges.set(pid, { minFrac: fracStart, maxFrac: fracStart + subWidth });
              }
            }
          }
        }
      }

      for (const [pid, range] of parentRanges) {
        if (!positions.has(pid)) {
          positions.set(pid, { frac: range.minFrac, width: range.maxFrac - range.minFrac });
        }
      }
    }

    const layoutNodes: LayoutNode[] = [];

    for (const gen of generations) {
      const nodesAtGen = (byGen.get(gen) ?? [])
        .filter((n) => positions.has(n.id))
        .sort((a, b) => {
          const pa = positions.get(a.id)!;
          const pb = positions.get(b.id)!;
          return (pa.frac + pa.width / 2) - (pb.frac + pb.width / 2);
        });

      const totalWidth = nodesAtGen.length * NODE_WIDTH + (nodesAtGen.length - 1) * H_GAP;
      const startX = -totalWidth / 2;
      const y = (maxGen - gen) * (NODE_HEIGHT + V_GAP);

      for (let i = 0; i < nodesAtGen.length; i++) {
        layoutNodes.push({
          branch: nodesAtGen[i],
          x: startX + i * (NODE_WIDTH + H_GAP),
          y,
        });
      }
    }

    return layoutNodes;
  }, [branchNodes]);

  // Find nearest node to a point
  const findNearestNode = useCallback((centerX: number, centerY: number, layout: LayoutNode[]): LayoutNode | null => {
    let nearest: LayoutNode | null = null;
    let minDist = Infinity;
    for (const ln of layout) {
      const nodeCenterX = ln.x + NODE_WIDTH / 2;
      const nodeCenterY = ln.y + NODE_HEIGHT / 2;
      const dist = Math.sqrt((centerX - nodeCenterX) ** 2 + (centerY - nodeCenterY) ** 2);
      if (dist < minDist) {
        minDist = dist;
        nearest = ln;
      }
    }
    return nearest;
  }, []);

  // Collect all connected ancestor/descendant branch IDs via BFS
  const branchMapRef = useRef(new Map<string, BranchNode>());
  branchMapRef.current = new Map(branchNodes.map((n) => [n.id, n]));

  const getConnectedBranches = useCallback((branchId: string): Set<string> => {
    const bMap = branchMapRef.current;
    const connected = new Set<string>([branchId]);
    const queue = [branchId];
    while (queue.length > 0) {
      const node = bMap.get(queue.shift()!);
      if (!node) continue;
      for (const id of [...node.parentBranchIds, ...node.childBranchIds]) {
        if (!connected.has(id)) {
          connected.add(id);
          queue.push(id);
        }
      }
    }
    return connected;
  }, []);

  // Snap to center on a specific branch node
  const snapToBranch = useCallback((branchId: string) => {
    const svg = svgRef.current;
    if (!svg || !zoomRef.current) return;
    const layout = layoutRef.current;
    const target = layout.find((ln) => ln.branch.id === branchId);
    if (!target) return;

    const width = svg.clientWidth;
    const height = svg.clientHeight;
    const targetCenterX = target.x + NODE_WIDTH / 2;
    const targetCenterY = target.y + NODE_HEIGHT / 2;

    const transform = d3.zoomTransform(svg);
    const newX = width / 2 - targetCenterX * transform.k;
    const newY = height / 2 - targetCenterY * transform.k;

    isSnappingRef.current = true;
    d3.select(svg)
      .transition()
      .duration(SNAP_DURATION)
      .call(
        zoomRef.current.transform,
        d3.zoomIdentity.translate(newX, newY).scale(transform.k)
      )
      .on('end', () => { isSnappingRef.current = false; });

    setFocusedId(branchId);
    onFocusChange(branchId);
  }, [onFocusChange]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent<SVGSVGElement>) => {
    const layout = layoutRef.current;
    if (layout.length === 0) return;

    const focused = layout.find((ln) => ln.branch.id === focusedId);
    if (!focused) return;

    let nextId: string | null = null;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowRight': {
        const sameGen = layout
          .filter((ln) => ln.branch.generation === focused.branch.generation)
          .sort((a, b) => a.x - b.x);
        const idx = sameGen.findIndex((ln) => ln.branch.id === focusedId);
        const nextIdx = event.key === 'ArrowLeft' ? idx - 1 : idx + 1;
        if (nextIdx >= 0 && nextIdx < sameGen.length) {
          nextId = sameGen[nextIdx].branch.id;
        }
        break;
      }
      case 'ArrowUp': {
        const childIds = focused.branch.childBranchIds;
        if (childIds.length > 0) nextId = childIds[0];
        break;
      }
      case 'ArrowDown': {
        const parentIds = focused.branch.parentBranchIds;
        if (parentIds.length > 0) nextId = parentIds[0];
        break;
      }
      case 'Enter':
      case ' ': {
        onBranchClick(focused.branch);
        event.preventDefault();
        return;
      }
      default:
        return;
    }

    event.preventDefault();
    if (nextId) {
      snapToBranch(nextId);
    }
  }, [focusedId, snapToBranch, onBranchClick]);

  // Render the D3 canvas
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || branchNodes.length === 0) return;

    const layout = buildLayout();
    layoutRef.current = layout;

    const svgSel = d3.select(svg);
    svgSel.selectAll('*').remove();

    const g = svgSel.append('g').attr('class', 'canvas-group');

    // Draw connecting lines between parent and child branch nodes
    for (const ln of layout) {
      const branch = ln.branch;
      const parentCenterX = ln.x + NODE_WIDTH / 2;
      const parentBottomY = ln.y + NODE_HEIGHT;

      for (const childId of branch.childBranchIds) {
        const childLn = layout.find((c) => c.branch.id === childId);
        if (!childLn) continue;
        const childCenterX = childLn.x + NODE_WIDTH / 2;
        const childTopY = childLn.y;

        const midY = (parentBottomY + childTopY) / 2;

        g.append('path')
          .attr('class', 'branch-link')
          .attr('data-from', branch.id)
          .attr('data-to', childId)
          .attr('d', `M${parentCenterX},${parentBottomY} C${parentCenterX},${midY} ${childCenterX},${midY} ${childCenterX},${childTopY}`)
          .attr('fill', 'none')
          .attr('stroke', colors.nodeStroke)
          .attr('stroke-width', 2)
          .attr('opacity', 0.6);
      }
    }

    // Draw nodes
    const nodeGroups = g.selectAll<SVGGElement, LayoutNode>('g.branch-node')
      .data(layout, (d) => d.branch.id)
      .enter()
      .append('g')
      .attr('class', 'branch-node')
      .attr('data-branch-id', (d) => d.branch.id)
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer');

    // Node background rect
    nodeGroups.append('rect')
      .attr('width', NODE_WIDTH)
      .attr('height', NODE_HEIGHT)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', colors.nodeBg)
      .attr('stroke', colors.nodeStroke)
      .attr('stroke-width', 1.5);

    // First names line (hidden by default, shown on focus)
    nodeGroups.append('text')
      .attr('class', 'first-names-label')
      .attr('x', NODE_WIDTH / 2)
      .attr('y', 18)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('font-size', '10px')
      .attr('fill', colors.textSecondary)
      .attr('opacity', 0)
      .text('');

    // Surname text (always visible)
    nodeGroups.append('text')
      .attr('class', 'surname-label')
      .attr('x', NODE_WIDTH / 2)
      .attr('y', NODE_HEIGHT / 2 + 2)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Merriweather, Georgia, serif')
      .attr('font-size', '12px')
      .attr('font-weight', '700')
      .attr('fill', colors.text)
      .text((d) => d.branch.displaySurname);

    // Date range (always visible, smaller)
    nodeGroups.append('text')
      .attr('class', 'date-label')
      .attr('x', NODE_WIDTH / 2)
      .attr('y', NODE_HEIGHT / 2 + 16)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('font-size', '9px')
      .attr('fill', colors.textSecondary)
      .text((d) => d.branch.dateRange);

    // Click handler: first click focuses, second click on focused node opens branch view
    nodeGroups.on('click', (_event, d) => {
      if (d.branch.id === focusedIdRef.current) {
        onBranchClick(d.branch);
      } else {
        snapToBranch(d.branch.id);
      }
    });

    // Zoom and pan
    const width = svg.clientWidth;
    const height = svg.clientHeight;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());

        // Debounced snap after zoom/pan ends
        if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
      })
      .on('end', (event) => {
        // Don't snap during a programmatic snap transition
        if (isSnappingRef.current) return;

        // Snap to nearest node after pan ends
        if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
        snapTimeoutRef.current = window.setTimeout(() => {
          // Re-check: a click-to-focus may have started a snap since the timeout was queued
          if (isSnappingRef.current) return;

          const transform = event.transform as d3.ZoomTransform;
          const centerX = (width / 2 - transform.x) / transform.k;
          const centerY = (height / 2 - transform.y) / transform.k;
          const nearest = findNearestNode(centerX, centerY, layout);
          // Use ref for latest focusedId (avoids stale closure)
          if (nearest && nearest.branch.id !== focusedIdRef.current) {
            setFocusedId(nearest.branch.id);
            onFocusChange(nearest.branch.id);

            // Smooth snap
            const targetCenterX = nearest.x + NODE_WIDTH / 2;
            const targetCenterY = nearest.y + NODE_HEIGHT / 2;
            const newX = width / 2 - targetCenterX * transform.k;
            const newY = height / 2 - targetCenterY * transform.k;

            isSnappingRef.current = true;
            svgSel
              .transition()
              .duration(SNAP_DURATION)
              .call(
                zoom.transform,
                d3.zoomIdentity.translate(newX, newY).scale(transform.k)
              )
              .on('end', () => { isSnappingRef.current = false; });
          }
        }, 200);
      });

    zoomRef.current = zoom;
    svgSel.call(zoom);

    // Initial position: fit the 3 most recent generations into view
    const maxGen = Math.max(...branchNodes.map((n) => n.generation));
    const recentGens = [maxGen, maxGen - 1, maxGen - 2].filter((g) => g >= 0);
    const recentNodes = layout.filter((ln) => recentGens.includes(ln.branch.generation));

    if (recentNodes.length > 0) {
      const minX = Math.min(...recentNodes.map((ln) => ln.x));
      const maxX = Math.max(...recentNodes.map((ln) => ln.x + NODE_WIDTH));
      const minY = Math.min(...recentNodes.map((ln) => ln.y));
      const maxY = Math.max(...recentNodes.map((ln) => ln.y + NODE_HEIGHT));

      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;
      const contentCenterX = (minX + maxX) / 2;
      const contentCenterY = (minY + maxY) / 2;

      const padding = 100;
      const scaleX = (width - padding * 2) / contentWidth;
      const scaleY = (height - padding * 2) / contentHeight;
      const scale = Math.min(scaleX, scaleY, 1);

      const initialX = width / 2 - contentCenterX * scale;
      const initialY = height / 2 - contentCenterY * scale;

      svgSel.call(zoom.transform, d3.zoomIdentity.translate(initialX, initialY).scale(scale));

      const mostRecentNode = layout.find((ln) => ln.branch.generation === maxGen);
      if (mostRecentNode) {
        setFocusedId(mostRecentNode.branch.id);
        onFocusChange(mostRecentNode.branch.id);
      }
    }

    return () => {
      if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
    };
  }, [branchNodes, buildLayout, findNearestNode, onBranchClick, onFocusChange, snapToBranch, colors]);

  // React to external focus changes (e.g., from search)
  useEffect(() => {
    if (focusBranchId && focusBranchId !== focusedId) {
      snapToBranch(focusBranchId);
    }
  }, [focusBranchId, focusedId, snapToBranch]);

  // Update node and line appearance based on focus + ancestor/descendant highlighting
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const c = colorsRef.current;
    const svgSel = d3.select(svg);
    const connected = focusedId ? getConnectedBranches(focusedId) : null;

    // Update connecting lines
    svgSel.selectAll<SVGPathElement, unknown>('path.branch-link').each(function () {
      const path = d3.select(this);
      const from = path.attr('data-from');
      const to = path.attr('data-to');
      const isConnected = connected && connected.has(from) && connected.has(to);

      path.transition().duration(200)
        .attr('stroke', c.nodeStroke)
        .attr('stroke-width', isConnected ? 3.5 : 2)
        .attr('opacity', connected ? (isConnected ? 1.0 : 0.15) : 0.6);
    });

    // Update nodes
    svgSel.selectAll<SVGGElement, LayoutNode>('g.branch-node').each(function (d) {
      const group = d3.select(this);
      const isFocused = d.branch.id === focusedId;
      const isConnected = connected ? connected.has(d.branch.id) : false;

      // Update rect style
      group.select('rect')
        .transition()
        .duration(200)
        .attr('fill', isFocused ? c.nodeFocused : isConnected ? c.nodeConnected : c.nodeBg)
        .attr('stroke', isFocused ? c.nodeStrokeFocused : isConnected ? c.nodeStrokeConnected : c.nodeStroke)
        .attr('stroke-width', isFocused ? 2.5 : isConnected ? 2.0 : 1.5);

      // Dim non-connected nodes when something is focused
      group.transition().duration(200)
        .attr('opacity', connected ? (isConnected ? 1.0 : 0.3) : 1.0);

      // Update text colors
      group.select('.first-names-label').attr('fill', c.textSecondary);
      group.select('.surname-label').attr('fill', c.text);
      group.select('.date-label').attr('fill', c.textSecondary);

      // Update text content for focused/unfocused
      const branch = d.branch;
      if (isFocused) {
        const firstNames = branch.secondaryPerson
          ? `${branch.primaryPerson.firstName} & ${branch.secondaryPerson.firstName}`
          : branch.primaryPerson.firstName;
        group.select('.first-names-label').text(firstNames).attr('opacity', 1);
        group.select('.surname-label')
          .text(branch.displaySurname)
          .attr('y', NODE_HEIGHT / 2 + 2);

        const dates = branch.secondaryDateRange
          ? `${branch.primaryDateRange} / ${branch.secondaryDateRange}`
          : branch.primaryDateRange;
        group.select('.date-label').text(dates);
      } else {
        group.select('.first-names-label').text('').attr('opacity', 0);
        group.select('.surname-label')
          .text(branch.displaySurname)
          .attr('y', NODE_HEIGHT / 2 + 2);
        group.select('.date-label').text(branch.dateRange);
      }
    });
  }, [focusedId, getConnectedBranches, colors]);

  return (
    <svg
      ref={svgRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{
        width: '100vw',
        height: '100vh',
        display: 'block',
        background: colors.bg,
        outline: 'none',
      }}
    />
  );
}
