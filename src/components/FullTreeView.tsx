import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { TreeNode } from '../lib/types';

interface Props {
  treeData: TreeNode[];
}

interface D3TreeNode extends d3.HierarchyPointNode<TreeNode> {
  _children?: D3TreeNode[];
  x0?: number;
  y0?: number;
}

export default function FullTreeView({ treeData }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedRoot, setSelectedRoot] = useState(0);

  // Filter to roots that have children (meaningful branches)
  const meaningfulRoots = treeData.filter((r) => r.children && r.children.length > 0);
  const allRoots = meaningfulRoots.length > 0 ? meaningfulRoots : treeData;

  useEffect(() => {
    if (!svgRef.current || allRoots.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const root = allRoots[selectedRoot] || allRoots[0];
    if (!root) return;

    const margin = { top: 20, right: 200, bottom: 20, left: 100 };
    const width = 1200;

    const hierarchy = d3.hierarchy<TreeNode>(root) as D3TreeNode;

    // Collapse to depth 2 initially
    hierarchy.descendants().forEach((d: D3TreeNode) => {
      if (d.depth >= 2 && d.children) {
        (d as any)._children = d.children;
        d.children = undefined as any;
      }
    });

    const nodeHeight = 28;
    const treeLayout = d3.tree<TreeNode>().nodeSize([nodeHeight, 220]);

    function update(source: D3TreeNode) {
      const root = hierarchy;
      treeLayout(root);

      const nodes = root.descendants() as D3TreeNode[];
      const links = root.links();

      // Compute bounds
      let minY = Infinity, maxY = -Infinity;
      nodes.forEach((d) => {
        if (d.x < minY) minY = d.x;
        if (d.x > maxY) maxY = d.x;
      });

      const height = maxY - minY + margin.top + margin.bottom + 40;
      svg.attr('viewBox', `0 ${minY - 20} ${width} ${height}`);
      svg.attr('height', height);

      const g = svg.select<SVGGElement>('g.tree-group');

      // Links
      const link = g.selectAll<SVGPathElement, d3.HierarchyLink<TreeNode>>('path.link')
        .data(links, (d: any) => d.target.data.id);

      link.enter()
        .append('path')
        .attr('class', 'link')
        .attr('fill', 'none')
        .attr('stroke', '#d4a574')
        .attr('stroke-width', 1.5)
        .attr('d', d3.linkHorizontal<any, any>()
          .x((d: any) => d.y + margin.left)
          .y((d: any) => d.x));

      link.attr('d', d3.linkHorizontal<any, any>()
        .x((d: any) => d.y + margin.left)
        .y((d: any) => d.x));

      link.exit().remove();

      // Nodes
      const node = g.selectAll<SVGGElement, D3TreeNode>('g.node')
        .data(nodes, (d: any) => d.data.id);

      const nodeEnter = node.enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', (d) => `translate(${d.y + margin.left},${d.x})`);

      // Circle
      nodeEnter.append('circle')
        .attr('r', 5)
        .attr('fill', (d) => {
          const hasHidden = (d as any)._children;
          return hasHidden ? '#8b6914' : d.data.sex === 'Female' ? '#b8834a' : '#6b8c55';
        })
        .attr('stroke', '#4a3610')
        .attr('stroke-width', 1.5)
        .style('cursor', 'pointer')
        .on('click', (_event, d) => {
          if ((d as any)._children) {
            d.children = (d as any)._children;
            (d as any)._children = undefined;
          } else if (d.children) {
            (d as any)._children = d.children;
            d.children = undefined as any;
          }
          update(d);
        });

      // Name label
      nodeEnter.append('text')
        .attr('x', 10)
        .attr('dy', '0.35em')
        .attr('font-size', '12px')
        .attr('font-family', 'Inter, sans-serif')
        .attr('fill', '#2d2010')
        .style('cursor', 'pointer')
        .text((d) => {
          const years = [d.data.birthYear, d.data.deathYear].filter(Boolean).join('–');
          return `${d.data.name}${years ? ` (${years})` : ''}`;
        })
        .on('click', (_event, d) => {
          window.location.href = `/people/${d.data.slug}`;
        });

      // Update positions
      node.attr('transform', (d) => `translate(${d.y + margin.left},${d.x})`);

      // Update circle colors (for collapse state change)
      node.select('circle')
        .attr('fill', (d) => {
          const hasHidden = (d as any)._children;
          return hasHidden ? '#8b6914' : d.data.sex === 'Female' ? '#b8834a' : '#6b8c55';
        });

      node.exit().remove();
    }

    // Initial group
    svg.append('g').attr('class', 'tree-group');

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        svg.select<SVGGElement>('g.tree-group').attr('transform', event.transform);
      });

    svg.call(zoom);

    update(hierarchy);
  }, [selectedRoot, allRoots]);

  return (
    <div>
      {allRoots.length > 1 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ fontSize: '0.875rem', color: '#6b4f10', marginRight: '0.5rem' }}>Branch:</label>
          <select
            value={selectedRoot}
            onChange={(e) => setSelectedRoot(Number(e.target.value))}
            style={{
              padding: '0.375rem 0.5rem',
              border: '1px solid #d4a574',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              background: 'white',
            }}
          >
            {allRoots.map((root, i) => (
              <option key={root.id} value={i}>
                {root.name} ({root.children?.length || 0} children)
              </option>
            ))}
          </select>
        </div>
      )}
      <div style={{ overflow: 'auto', border: '1px solid #e8cba7', borderRadius: '0.5rem', background: '#fdf8f0' }}>
        <svg
          ref={svgRef}
          width="100%"
          style={{ minWidth: '800px', minHeight: '400px' }}
        />
      </div>
      <p style={{ fontSize: '0.75rem', color: '#6b4f10', marginTop: '0.5rem' }}>
        Click circles to expand/collapse branches. Click names to view profiles. Scroll to zoom, drag to pan.
      </p>
    </div>
  );
}
