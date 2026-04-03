/**
 * FamilyTreeApp — Root React component for the single-page family tree canvas.
 * Manages global state: which view is active (tree/branch/leaf),
 * selected branch node, selected person, and search state.
 */
import { useState, useEffect, useCallback } from 'react';
import type { BranchNode, ClientPerson } from '../lib/types';
import { loadFamilyData, buildBranchTree, getBranchForPerson, getAllPeople } from '../lib/client-data';
import TreeCanvas from './TreeCanvas';
import BranchOverlay from './BranchOverlay';
import LeafOverlay from './LeafOverlay';
import NavChrome from './NavChrome';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';

export type ViewLevel = 'tree' | 'branch' | 'leaf' | 'search-results';

export default function FamilyTreeApp() {
  const [loading, setLoading] = useState(true);
  const [branchNodes, setBranchNodes] = useState<BranchNode[]>([]);
  const [viewLevel, setViewLevel] = useState<ViewLevel>('tree');
  const [selectedBranch, setSelectedBranch] = useState<BranchNode | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<ClientPerson | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<ClientPerson[]>([]);
  const [focusBranchId, setFocusBranchId] = useState<string | null>(null);

  useEffect(() => {
    loadFamilyData().then((people) => {
      const nodes = buildBranchTree(people);
      setBranchNodes(nodes);
      setLoading(false);
    });
  }, []);

  const handleBranchClick = useCallback((branch: BranchNode) => {
    setSelectedBranch(branch);
    setViewLevel('branch');
  }, []);

  const handlePersonClick = useCallback((person: ClientPerson) => {
    setSelectedPerson(person);
    setViewLevel('leaf');
  }, []);

  const handleBack = useCallback(() => {
    if (viewLevel === 'leaf') {
      setSelectedPerson(null);
      setViewLevel('branch');
    } else if (viewLevel === 'branch') {
      // Restore focus to the branch that was selected before closing
      if (selectedBranch) {
        setFocusBranchId(selectedBranch.id);
      }
      setSelectedBranch(null);
      setViewLevel('tree');
    } else if (viewLevel === 'search-results') {
      setSearchResults([]);
      setViewLevel('tree');
    }
  }, [viewLevel, selectedBranch]);

  const handleSearch = useCallback((results: ClientPerson[]) => {
    if (results.length === 1) {
      // Single result: go to that person's branch
      const branch = getBranchForPerson(results[0].id);
      if (branch) {
        setFocusBranchId(branch.id);
        setSelectedBranch(branch);
        setViewLevel('branch');
      }
    } else if (results.length > 1) {
      setSearchResults(results);
      setViewLevel('search-results');
    }
    setSearchOpen(false);
  }, []);

  const handleSearchResultSelect = useCallback((person: ClientPerson) => {
    const branch = getBranchForPerson(person.id);
    if (branch) {
      setSelectedBranch(branch);
      setSelectedPerson(person);
      setViewLevel('leaf');
      setSearchResults([]);
    }
  }, []);

  const handleLeafNavigate = useCallback((person: ClientPerson) => {
    // Navigate to a different person from within the leaf view
    const branch = getBranchForPerson(person.id);
    if (branch) {
      setSelectedBranch(branch);
      setSelectedPerson(person);
      setViewLevel('leaf');
    }
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#fdf8f0',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#6b4f10',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontFamily: 'Merriweather, Georgia, serif', fontWeight: 700, color: '#4a3610', marginBottom: '0.5rem' }}>
            Frank-Miller Family Tree
          </div>
          <div>Loading family data...</div>
        </div>
      </div>
    );
  }

  const isDimmed = viewLevel === 'branch' || viewLevel === 'leaf' || viewLevel === 'search-results';

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#fdf8f0' }}>
      {/* Tree canvas — always rendered as base layer */}
      <div style={{ opacity: isDimmed ? 0.3 : 1, transition: 'opacity 0.3s ease', pointerEvents: isDimmed ? 'none' : 'auto' }}>
        <TreeCanvas
          branchNodes={branchNodes}
          onBranchClick={handleBranchClick}
          focusBranchId={focusBranchId}
          onFocusChange={setFocusBranchId}
        />
      </div>

      {/* Branch overlay */}
      {viewLevel === 'branch' && selectedBranch && (
        <BranchOverlay
          branch={selectedBranch}
          onPersonClick={handlePersonClick}
          onClose={handleBack}
        />
      )}

      {/* Leaf overlay */}
      {viewLevel === 'leaf' && selectedPerson && (
        <LeafOverlay
          person={selectedPerson}
          onClose={handleBack}
          onNavigate={handleLeafNavigate}
        />
      )}

      {/* Search results overlay */}
      {viewLevel === 'search-results' && searchResults.length > 0 && (
        <SearchResults
          results={searchResults}
          onSelect={handleSearchResultSelect}
          onClose={handleBack}
        />
      )}

      {/* Navigation chrome — always on top */}
      <NavChrome
        viewLevel={viewLevel}
        onBack={handleBack}
        searchOpen={searchOpen}
        onToggleSearch={() => setSearchOpen(!searchOpen)}
      />

      {/* Search bar */}
      {searchOpen && (
        <SearchBar
          onSearch={handleSearch}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  );
}
