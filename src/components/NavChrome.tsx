/**
 * NavChrome — Minimal persistent navigation overlay.
 * Top-left: contextual back icon (hidden at tree level)
 * Top-right: theme toggle + magnifying glass search icon + hamburger menu
 */
import type { ViewLevel } from './FamilyTreeApp';
import { useState } from 'react';
import { useTheme } from './ThemeContext';

interface Props {
  viewLevel: ViewLevel;
  onBack: () => void;
  searchOpen: boolean;
  onToggleSearch: () => void;
}

// SVG icons as inline components
function LeafIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.5 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

function BranchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3v12" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export default function NavChrome({ viewLevel, onBack, searchOpen, onToggleSearch }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isDark, toggle, colors } = useTheme();

  const showBack = viewLevel !== 'tree';

  const backLabel = viewLevel === 'leaf' ? 'Back to branch' :
    viewLevel === 'branch' ? 'Back to tree' :
    viewLevel === 'search-results' ? 'Back to tree' : '';

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    color: colors.buttonText,
    background: colors.buttonBg,
    backdropFilter: 'blur(8px)',
    boxShadow: `0 2px 8px ${colors.shadow}`,
    transition: 'all 0.2s ease',
  };

  return (
    <>
      {/* Top-left: back button */}
      {showBack && (
        <button
          onClick={onBack}
          title={backLabel}
          aria-label={backLabel}
          style={{
            ...buttonStyle,
            position: 'fixed',
            top: '1rem',
            left: '1rem',
            zIndex: 50,
            gap: '0.25rem',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = colors.buttonBgHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = colors.buttonBg; }}
        >
          <ArrowLeftIcon />
          <span style={{ position: 'absolute', left: '48px', fontSize: '0.75rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.25rem', color: colors.textSecondary }}>
            {viewLevel === 'leaf' && <LeafIcon />}
            {viewLevel === 'branch' && <BranchIcon />}
          </span>
        </button>
      )}

      {/* Top-right: theme toggle + search + menu */}
      <div style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 50,
        display: 'flex',
        gap: '0.5rem',
      }}>
        {/* Theme toggle */}
        <button
          onClick={toggle}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={buttonStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = colors.buttonBgHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = colors.buttonBg; }}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>

        {/* Search toggle */}
        <button
          onClick={onToggleSearch}
          title={searchOpen ? 'Close search' : 'Search'}
          aria-label={searchOpen ? 'Close search' : 'Search'}
          style={buttonStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = colors.buttonBgHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = colors.buttonBg; }}
        >
          {searchOpen ? <MinusIcon /> : <SearchIcon />}
        </button>

        {/* Hamburger menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            title="Menu"
            aria-label="Menu"
            style={buttonStyle}
            onMouseEnter={(e) => { e.currentTarget.style.background = colors.buttonBgHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = colors.buttonBg; }}
          >
            <MenuIcon />
          </button>

          {menuOpen && (
            <>
              {/* Click-away backdrop */}
              <div
                onClick={() => setMenuOpen(false)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  zIndex: -1,
                }}
              />
              <div style={{
                position: 'absolute',
                top: '48px',
                right: 0,
                background: colors.searchBg,
                backdropFilter: 'blur(8px)',
                borderRadius: '0.5rem',
                boxShadow: `0 4px 16px ${colors.shadowHeavy}`,
                minWidth: '160px',
                overflow: 'hidden',
                animation: 'fadeIn 0.15s ease',
              }}>
                <a
                  href="/research"
                  style={{
                    display: 'block',
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                    color: colors.text,
                    textDecoration: 'none',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = colors.suggestionHover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  Research Dashboard
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
