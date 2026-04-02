/**
 * TreeCanvas — D3-based pannable, zoomable canvas showing BranchNodes.
 * Nodes are positioned by generation (vertical) and spread horizontally.
 * Pan-and-snap: after panning ends, the nearest node snaps to center and gains focus.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import type { BranchNode } from '../lib/types';

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

const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;
const H_GAP = 40;
const V_GAP = 100;
const SNAP_DURATION = 400;

export default function TreeCanvas({ branchNodes, onBranchClick, focusBranchId, onFocusChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const layoutRef = useRef<LayoutNode[]>([]);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const snapTimeoutRef = useRef<number | null>(null);
  const isSnappingRef = useRef(false);

  // Build layout: position nodes by generation
  const buildLayout = useCallback((): LayoutNode[] => {
    if (branchNodes.length === 0) return [];

    // Group by generation
    const byGen = new Map<number, BranchNode[]>();
    for (const node of branchNodes) {
      if (!byGen.has(node.generation)) byGen.set(node.generation, []);
      byGen.get(node.generation)!.push(node);
    }

    const generations = [...byGen.keys()].sort((a, b) => a - b);
    const maxGen = generations[generations.length - 1];

    const layoutNodes: LayoutNode[] = [];

    for (const gen of generations) {
      const nodes = byGen.get(gen)!;
      const totalWidth = nodes.length * NODE_WIDTH + (nodes.length - 1) * H_GAP;
      const startX = -totalWidth / 2;
      // Invert: most recent generation (highest number) at top (y=0)
      const y = (maxGen - gen) * (NODE_HEIGHT + V_GAP);

      for (let i = 0; i < nodes.length; i++) {
        layoutNodes.push({
          branch: nodes[i],
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
          .attr('d', `M${parentCenterX},${parentBottomY} C${parentCenterX},${midY} ${childCenterX},${midY} ${childCenterX},${childTopY}`)
          .attr('fill', 'none')
          .attr('stroke', '#d4a574')
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
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer');

    // Node background rect
    nodeGroups.append('rect')
      .attr('width', NODE_WIDTH)
      .attr('height', NODE_HEIGHT)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', '#f5e6d3')
      .attr('stroke', '#d4a574')
      .attr('stroke-width', 1.5);

    // Surname text (always visible)
    nodeGroups.append('text')
      .attr('class', 'surname-label')
      .attr('x', NODE_WIDTH / 2)
      .attr('y', NODE_HEIGHT / 2 - 6)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Merriweather, Georgia, serif')
      .attr('font-size', '13px')
      .attr('font-weight', '700')
      .attr('fill', '#4a3610')
      .text((d) => d.branch.displaySurname);

    // Date range (always visible, smaller)
    nodeGroups.append('text')
      .attr('class', 'date-label')
      .attr('x', NODE_WIDTH / 2)
      .attr('y', NODE_HEIGHT / 2 + 12)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('font-size', '10px')
      .attr('fill', '#6b4f10')
      .text((d) => d.branch.dateRange);

    // Click handler
    nodeGroups.on('click', (_event, d) => {
      onBranchClick(d.branch);
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
          const transform = event.transform as d3.ZoomTransform;
          const centerX = (width / 2 - transform.x) / transform.k;
          const centerY = (height / 2 - transform.y) / transform.k;
          const nearest = findNearestNode(centerX, centerY, layout);
          if (nearest && nearest.branch.id !== focusedId) {
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
      // Calculate bounding box of recent nodes
      const minX = Math.min(...recentNodes.map((ln) => ln.x));
      const maxX = Math.max(...recentNodes.map((ln) => ln.x + NODE_WIDTH));
      const minY = Math.min(...recentNodes.map((ln) => ln.y));
      const maxY = Math.max(...recentNodes.map((ln) => ln.y + NODE_HEIGHT));

      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;
      const contentCenterX = (minX + maxX) / 2;
      const contentCenterY = (minY + maxY) / 2;

      // Scale to fit with some padding
      const padding = 100;
      const scaleX = (width - padding * 2) / contentWidth;
      const scaleY = (height - padding * 2) / contentHeight;
      const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in past 1x

      const initialX = width / 2 - contentCenterX * scale;
      const initialY = height / 2 - contentCenterY * scale;

      svgSel.call(zoom.transform, d3.zoomIdentity.translate(initialX, initialY).scale(scale));

      // Set initial focus on the first node of the most recent generation
      const mostRecentNode = layout.find((ln) => ln.branch.generation === maxGen);
      if (mostRecentNode) {
        setFocusedId(mostRecentNode.branch.id);
        onFocusChange(mostRecentNode.branch.id);
      }
    }

    return () => {
      if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
    };
  }, [branchNodes, buildLayout, findNearestNode, onBranchClick, onFocusChange]);

  // React to external focus changes (e.g., from search)
  useEffect(() => {
    if (focusBranchId && focusBranchId !== focusedId) {
      snapToBranch(focusBranchId);
    }
  }, [focusBranchId, focusedId, snapToBranch]);

  // Update node appearance based on focus
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const svgSel = d3.select(svg);

    svgSel.selectAll<SVGGElement, LayoutNode>('g.branch-node').each(function (d) {
      const group = d3.select(this);
      const isFocused = d.branch.id === focusedId;

      // Update rect style
      group.select('rect')
        .transition()
        .duration(200)
        .attr('fill', isFocused ? '#e8cba7' : '#f5e6d3')
        .attr('stroke', isFocused ? '#b8834a' : '#d4a574')
        .attr('stroke-width', isFocused ? 2.5 : 1.5);

      // Update text content for focused/unfocused
      const branch = d.branch;
      if (isFocused) {
        // Show full names (first names + surname)
        const fullName = branch.secondaryPerson
          ? `${branch.primaryPerson.firstName} & ${branch.secondaryPerson.firstName}`
          : branch.primaryPerson.fullName;
        const label = branch.secondaryPerson
          ? `${fullName} ${branch.displaySurname}`
          : fullName;
        group.select('.surname-label').text(label);

        // Show both date ranges
        const dates = branch.secondaryDateRange
          ? `${branch.primaryDateRange} / ${branch.secondaryDateRange}`
          : branch.primaryDateRange;
        group.select('.date-label').text(dates);
      } else {
        // Compact: just surname + primary date range
        group.select('.surname-label').text(branch.displaySurname);
        group.select('.date-label').text(branch.dateRange);
      }
    });
  }, [focusedId]);

  return (
    <svg
      ref={svgRef}
      style={{
        width: '100vw',
        height: '100vh',
        display: 'block',
        background: '#fdf8f0',
      }}
    />
  );
}
