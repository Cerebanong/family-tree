/**
 * SearchResults — Card grid showing multiple search results.
 * Rendered as an overlay replacing the tree canvas content.
 */
import type { ClientPerson } from '../lib/types';

interface Props {
  results: ClientPerson[];
  onSelect: (person: ClientPerson) => void;
  onClose: () => void;
}

export default function SearchResults({ results, onSelect, onClose }: Props) {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(253, 248, 240, 0.95)',
      backdropFilter: 'blur(8px)',
      animation: 'fadeIn 0.2s ease',
    }}>
      {/* Header */}
      <div style={{
        padding: '5rem 2rem 1rem',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontFamily: 'Merriweather, Georgia, serif',
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#4a3610',
          margin: 0,
        }}>
          {results.length} {results.length === 1 ? 'Result' : 'Results'} Found
        </h2>
        <p style={{
          fontSize: '0.85rem',
          color: '#6b4f10',
          marginTop: '0.25rem',
        }}>
          Select a person to view their family branch
        </p>
      </div>

      {/* Card grid */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '1rem 2rem 2rem',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '1rem',
          maxWidth: '900px',
          margin: '0 auto',
        }}>
          {results.map((person) => {
            const years = [person.birthYear, person.deathYear].filter(Boolean).join(' \u2013 ');
            return (
              <button
                key={person.id}
                onClick={() => onSelect(person)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '1.25rem 1rem',
                  background: 'white',
                  border: '1.5px solid #d4a574',
                  borderRadius: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#b8834a';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d4a574';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: person.sex === 'Female' ? '#b8834a' : '#6b8c55',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '1rem',
                  marginBottom: '0.625rem',
                  fontFamily: 'Merriweather, Georgia, serif',
                }}>
                  {person.firstName.charAt(0)}
                </div>
                <div style={{
                  fontFamily: 'Merriweather, Georgia, serif',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: '#4a3610',
                  textAlign: 'center',
                  marginBottom: '0.2rem',
                }}>
                  {person.fullName}
                </div>
                {years && (
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#6b4f10',
                  }}>
                    {years}
                  </div>
                )}
                {person.occupation && (
                  <div style={{
                    fontSize: '0.7rem',
                    color: '#8b6914',
                    marginTop: '0.2rem',
                    fontStyle: 'italic',
                    textAlign: 'center',
                  }}>
                    {person.occupation}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
