import { useState, useEffect } from 'react';
import type { RawPerson, TreeNode } from '../lib/types';
import { buildTreeData, buildFocusTree } from '../lib/tree-builder';
import { generateSlug } from '../lib/slug';
import FullTreeView from './FullTreeView';
import FocusView from './FocusView';

export default function TreeExplorer() {
  const [individuals, setIndividuals] = useState<RawPerson[]>([]);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'full' | 'focus'>('full');
  const [focusPersonId, setFocusPersonId] = useState<number | null>(null);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mq.matches);
    if (!mq.matches) setViewMode('focus');

    const handler = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
      if (!e.matches) setViewMode('focus');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    fetch('/family_tree.json')
      .then((r) => r.json())
      .then((data) => {
        const people: RawPerson[] = data.individuals;
        setIndividuals(people);
        setTreeData(buildTreeData(people));
        // Default focus: first person with children
        const firstParent = people.find((p) =>
          people.some((c) => c.father_id === p.id || c.mother_id === p.id)
        );
        if (firstParent) setFocusPersonId(firstParent.id);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load family data:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p style={{ textAlign: 'center', color: '#6b4f10', padding: '4rem 0' }}>Loading family tree...</p>;
  }

  const sortedPeople = [...individuals].sort((a, b) => {
    const aName = `${a.name.first} ${a.name.last}`;
    const bName = `${b.name.first} ${b.name.last}`;
    return aName.localeCompare(bName);
  });

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
        {isDesktop && (
          <div style={{ display: 'flex', gap: '0.25rem', background: '#f5e6d3', borderRadius: '0.5rem', padding: '0.25rem' }}>
            <button
              onClick={() => setViewMode('full')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
                background: viewMode === 'full' ? '#4f6e3d' : 'transparent',
                color: viewMode === 'full' ? 'white' : '#4a3610',
              }}
            >
              Full Tree
            </button>
            <button
              onClick={() => setViewMode('focus')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
                background: viewMode === 'focus' ? '#4f6e3d' : 'transparent',
                color: viewMode === 'focus' ? 'white' : '#4a3610',
              }}
            >
              Focus View
            </button>
          </div>
        )}

        {viewMode === 'focus' && (
          <select
            value={focusPersonId ?? ''}
            onChange={(e) => setFocusPersonId(Number(e.target.value))}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid #d4a574',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              color: '#2d2010',
              background: 'white',
              maxWidth: '300px',
            }}
          >
            <option value="">Select a person...</option>
            {sortedPeople.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name.first} {p.name.last} {p.birth.date ? `(${p.birth.date.match(/\d{4}/)?.[0] || ''})` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {viewMode === 'full' && (
        <FullTreeView treeData={treeData} />
      )}

      {viewMode === 'focus' && focusPersonId && (
        <FocusView
          personId={focusPersonId}
          individuals={individuals}
          onSelectPerson={setFocusPersonId}
        />
      )}

      {viewMode === 'focus' && !focusPersonId && (
        <p style={{ textAlign: 'center', color: '#6b4f10', padding: '4rem 0' }}>
          Select a person above to explore their family connections.
        </p>
      )}
    </div>
  );
}
