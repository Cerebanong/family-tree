/**
 * SearchBar — Expandable search panel with first name, last name, and time period fields.
 * Shows autocomplete dropdown for quick matches.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import type { ClientPerson } from '../lib/types';
import { getAllPeople } from '../lib/client-data';
import { useTheme } from './ThemeContext';

interface Props {
  onSearch: (results: ClientPerson[]) => void;
  onClose: () => void;
}

function filterPeople(firstName: string, lastName: string, timePeriod: string): ClientPerson[] {
  const people = getAllPeople();
  const fn = firstName.toLowerCase().trim();
  const ln = lastName.toLowerCase().trim();
  const tp = timePeriod.trim();

  // Parse time period — accepts "1800", "1800-1900", "1800s"
  let yearStart: number | null = null;
  let yearEnd: number | null = null;
  if (tp) {
    const rangeMatch = tp.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
    const decadeMatch = tp.match(/^(\d{4})s$/);
    const yearMatch = tp.match(/^(\d{4})$/);
    if (rangeMatch) {
      yearStart = parseInt(rangeMatch[1]);
      yearEnd = parseInt(rangeMatch[2]);
    } else if (decadeMatch) {
      yearStart = parseInt(decadeMatch[1]);
      yearEnd = yearStart + 9;
    } else if (yearMatch) {
      yearStart = parseInt(yearMatch[1]) - 10;
      yearEnd = parseInt(yearMatch[1]) + 10;
    }
  }

  return people.filter((p) => {
    if (fn && !p.firstName.toLowerCase().includes(fn)) return false;
    if (ln && !p.lastName.toLowerCase().includes(ln)) return false;
    if (yearStart != null && yearEnd != null) {
      const by = p.birthYear ? parseInt(p.birthYear) : null;
      const dy = p.deathYear ? parseInt(p.deathYear) : null;
      if (by != null && by > yearEnd) return false;
      if (dy != null && dy < yearStart) return false;
      if (by == null && dy == null) return false;
    }
    return true;
  });
}

export default function SearchBar({ onSearch, onClose }: Props) {
  const { colors } = useTheme();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [timePeriod, setTimePeriod] = useState('');
  const [suggestions, setSuggestions] = useState<ClientPerson[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  const updateSuggestions = useCallback((fn: string, ln: string, tp: string) => {
    if (!fn && !ln && !tp) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const results = filterPeople(fn, ln, tp);
    setSuggestions(results.slice(0, 8));
    setShowSuggestions(results.length > 0 && results.length <= 8);
  }, []);

  const handleFirstNameChange = (value: string) => {
    setFirstName(value);
    updateSuggestions(value, lastName, timePeriod);
  };

  const handleLastNameChange = (value: string) => {
    setLastName(value);
    updateSuggestions(firstName, value, timePeriod);
  };

  const handleTimePeriodChange = (value: string) => {
    setTimePeriod(value);
    updateSuggestions(firstName, lastName, value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName && !lastName && !timePeriod) return;
    const results = filterPeople(firstName, lastName, timePeriod);
    setShowSuggestions(false);
    onSearch(results);
  };

  const handleSuggestionClick = (person: ClientPerson) => {
    setShowSuggestions(false);
    onSearch([person]);
  };

  const inputStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    border: `1.5px solid ${colors.inputBorder}`,
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontFamily: 'Inter, system-ui, sans-serif',
    background: colors.inputBg,
    color: colors.text,
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.7rem',
    fontWeight: 600,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.25rem',
    display: 'block',
  };

  return (
    <div
      ref={formRef}
      style={{
        position: 'fixed',
        top: '4rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        width: '90%',
        maxWidth: '600px',
        animation: 'slideDown 0.2s ease',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: colors.searchBg,
          backdropFilter: 'blur(12px)',
          borderRadius: '0.75rem',
          boxShadow: `0 8px 32px ${colors.shadowHeavy}`,
          padding: '1rem 1.25rem',
          border: `1px solid ${colors.borderLight}`,
        }}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr auto',
          gap: '0.75rem',
          alignItems: 'end',
        }}>
          <div>
            <label style={labelStyle}>First Name</label>
            <input
              ref={firstInputRef}
              type="text"
              value={firstName}
              onChange={(e) => handleFirstNameChange(e.target.value)}
              placeholder="e.g. Kevin"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => handleLastNameChange(e.target.value)}
              placeholder="e.g. Frank"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Time Period</label>
            <input
              type="text"
              value={timePeriod}
              onChange={(e) => handleTimePeriodChange(e.target.value)}
              placeholder="e.g. 1900-1950"
              style={inputStyle}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '0.5rem 1rem',
              background: colors.submitBg,
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.15s',
              fontFamily: 'Inter, system-ui, sans-serif',
              height: '37px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = colors.submitBgHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = colors.submitBg; }}
          >
            Search
          </button>
        </div>
      </form>

      {/* Autocomplete suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          background: colors.searchBg,
          backdropFilter: 'blur(12px)',
          borderRadius: '0 0 0.75rem 0.75rem',
          boxShadow: `0 8px 32px ${colors.shadow}`,
          border: `1px solid ${colors.borderLight}`,
          borderTop: 'none',
          overflow: 'hidden',
          marginTop: '-2px',
        }}>
          {suggestions.map((person) => {
            const years = [person.birthYear, person.deathYear].filter(Boolean).join('\u2013');
            return (
              <button
                key={person.id}
                onClick={() => handleSuggestionClick(person)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  padding: '0.5rem 1.25rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: `1px solid ${colors.divider}`,
                  cursor: 'pointer',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '0.85rem',
                  color: colors.text,
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = colors.suggestionHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                <span style={{ fontWeight: 500 }}>{person.fullName}</span>
                {years && <span style={{ color: colors.textMuted, fontSize: '0.8rem' }}>{years}</span>}
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
