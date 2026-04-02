/**
 * LeafOverlay — Full person detail view, rendered as an overlay.
 * Contains vital info, family connections, sources, notes, and research.
 */
import type { ClientPerson } from '../lib/types';
import { getParents, getSpouses, getChildren, getSiblings } from '../lib/client-data';

interface Props {
  person: ClientPerson;
  onClose: () => void;
  onNavigate: (person: ClientPerson) => void;
}

function FamilyLink({ person, onClick }: { person: ClientPerson; onClick: () => void }) {
  const years = [person.birthYear, person.deathYear].filter(Boolean).join('\u2013');
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-block',
        background: 'none',
        border: 'none',
        padding: 0,
        color: '#4f6e3d',
        textDecoration: 'underline',
        textDecorationColor: 'rgba(143,170,123,0.5)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        transition: 'color 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = '#6b8c55'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = '#4f6e3d'; }}
    >
      {person.fullName}{years ? ` (${years})` : ''}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '1.5rem' }}>
      <h3 style={{
        fontFamily: 'Merriweather, Georgia, serif',
        fontSize: '1.1rem',
        fontWeight: 700,
        color: '#4a3610',
        marginBottom: '0.75rem',
      }}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.4rem', fontSize: '0.875rem' }}>
      <span style={{ fontWeight: 600, color: '#6b4f10', minWidth: '100px', flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#2d2010' }}>{value}</span>
    </div>
  );
}

function formatCitations(citations: string): string {
  if (!citations) return '';
  return citations.replace(
    /FamilySearch ([A-Z0-9]{4}-[A-Z0-9]{2,4})/g,
    (_match, pid) => `<a href="https://www.familysearch.org/tree/person/details/${pid}" target="_blank" rel="noopener" style="color:#4f6e3d;text-decoration:underline;">FamilySearch ${pid}</a>`
  );
}

export default function LeafOverlay({ person, onClose, onNavigate }: Props) {
  const parents = getParents(person.id);
  const spouses = getSpouses(person.id);
  const children = getChildren(person.id);
  const siblings = getSiblings(person.id);

  const years = [person.birthYear, person.deathYear].filter(Boolean).join(' \u2013 ');
  const birthInfo = [person.birthDate, person.birthPlace].filter(Boolean).join(', ');
  const deathInfo = [
    person.deathDate,
    person.deathPlace,
    person.deathCause ? `(${person.deathCause})` : '',
  ].filter(Boolean).join(', ');

  const mailtoSubject = encodeURIComponent(`Family Tree Tip: ${person.fullName} (ID ${person.id})`);
  const mailtoBody = encodeURIComponent(`I have information about ${person.fullName} (ID ${person.id}):\n\nWhat I found:\n`);
  const mailtoHref = `mailto:kevinlfrank@gmail.com?subject=${mailtoSubject}&body=${mailtoBody}`;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 30,
      padding: '1rem',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'relative',
        background: 'white',
        borderRadius: '1rem',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        animation: 'slideUp 0.3s ease',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem 2rem 1rem',
          borderBottom: '1px solid #e8cba7',
        }}>
          <h2 style={{
            fontFamily: 'Merriweather, Georgia, serif',
            fontSize: '1.75rem',
            fontWeight: 700,
            color: '#4a3610',
            margin: 0,
          }}>
            {person.fullName}
          </h2>
          {person.aliases.length > 0 && (
            <div style={{ fontSize: '0.85rem', color: '#8b6914', marginTop: '0.25rem' }}>
              Also known as: {person.aliases.join(', ')}
            </div>
          )}
          {years && (
            <div style={{ fontSize: '1rem', color: '#6b4f10', marginTop: '0.25rem' }}>
              {years}
            </div>
          )}
        </div>

        {/* Body: two-column layout on wider screens */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(200px, 1fr)',
          gap: '1.5rem',
          padding: '1.5rem 2rem',
        }}>
          {/* Main content */}
          <div>
            {/* Vital Information */}
            <Section title="Vital Information">
              <InfoRow label="Born" value={birthInfo} />
              <InfoRow label="Died" value={deathInfo} />
              <InfoRow label="Age at Death" value={person.ageAtDeath} />
              <InfoRow label="Occupation" value={person.occupation} />
              <InfoRow label="Residence" value={person.residence} />
              <InfoRow label="Burial" value={person.burialPlace} />
            </Section>

            {/* Notes */}
            {person.notes && (
              <Section title="Notes">
                <p style={{
                  fontSize: '0.875rem',
                  lineHeight: 1.7,
                  color: '#4a3610',
                  margin: 0,
                }}>
                  {person.notes}
                </p>
              </Section>
            )}

            {/* Sources */}
            {person.sourceCitations && (
              <Section title="Sources">
                <p
                  style={{
                    fontSize: '0.875rem',
                    lineHeight: 1.7,
                    color: '#6b4f10',
                    margin: 0,
                  }}
                  dangerouslySetInnerHTML={{ __html: formatCitations(person.sourceCitations) }}
                />
              </Section>
            )}
          </div>

          {/* Sidebar: Family connections */}
          <div>
            <div style={{
              background: '#f5e6d3',
              border: '1px solid #e8cba7',
              borderRadius: '0.75rem',
              padding: '1rem',
            }}>
              <h3 style={{
                fontFamily: 'Merriweather, Georgia, serif',
                fontSize: '1rem',
                fontWeight: 700,
                color: '#4a3610',
                marginBottom: '1rem',
              }}>
                Family
              </h3>

              {(parents.father || parents.mother) && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#8b6914',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.3rem',
                  }}>
                    Parents
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    {parents.father && (
                      <div><FamilyLink person={parents.father} onClick={() => onNavigate(parents.father!)} /></div>
                    )}
                    {parents.mother && (
                      <div><FamilyLink person={parents.mother} onClick={() => onNavigate(parents.mother!)} /></div>
                    )}
                  </div>
                </div>
              )}

              {spouses.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#8b6914',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.3rem',
                  }}>
                    {spouses.length > 1 ? 'Spouses' : 'Spouse'}
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    {spouses.map((s) => (
                      <div key={s.id}><FamilyLink person={s} onClick={() => onNavigate(s)} /></div>
                    ))}
                  </div>
                </div>
              )}

              {children.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#8b6914',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.3rem',
                  }}>
                    Children
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    {children.map((c) => (
                      <div key={c.id}><FamilyLink person={c} onClick={() => onNavigate(c)} /></div>
                    ))}
                  </div>
                </div>
              )}

              {siblings.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#8b6914',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.3rem',
                  }}>
                    Siblings
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    {siblings.map((s) => (
                      <div key={s.id}><FamilyLink person={s} onClick={() => onNavigate(s)} /></div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit a tip */}
            <a
              href={mailtoHref}
              style={{
                display: 'block',
                textAlign: 'center',
                background: '#6b8c55',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '0.5rem',
                padding: '0.625rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                marginTop: '0.75rem',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#4f6e3d'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#6b8c55'; }}
            >
              Submit a Tip
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
