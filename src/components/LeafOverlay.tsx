/**
 * LeafOverlay — Full person detail view, rendered as an overlay.
 * Contains vital info, family connections, sources, notes, and research.
 */
import { useState, useEffect } from 'react';
import type { ClientPerson } from '../lib/types';
import { getParents, getSpouses, getChildren, getSiblings } from '../lib/client-data';
import { useTheme, type ThemeColors } from './ThemeContext';

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return isMobile;
}

interface Props {
  person: ClientPerson;
  onClose: () => void;
  onNavigate: (person: ClientPerson) => void;
}

function FamilyLink({ person, onClick, colors }: { person: ClientPerson; onClick: () => void; colors: ThemeColors }) {
  const years = [person.birthYear, person.deathYear].filter(Boolean).join('\u2013');
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-block',
        background: 'none',
        border: 'none',
        padding: 0,
        color: colors.link,
        textDecoration: 'underline',
        textDecorationColor: colors.linkUnderline,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        transition: 'color 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = colors.linkHover; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = colors.link; }}
    >
      {person.fullName}{years ? ` (${years})` : ''}
    </button>
  );
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: ThemeColors }) {
  return (
    <section style={{ marginBottom: '1.5rem' }}>
      <h3 style={{
        fontFamily: 'Merriweather, Georgia, serif',
        fontSize: '1.1rem',
        fontWeight: 700,
        color: colors.text,
        marginBottom: '0.75rem',
      }}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function InfoRow({ label, value, colors, compact }: { label: string; value: string; colors: ThemeColors; compact?: boolean }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: compact ? '0.5rem' : '1rem', marginBottom: '0.4rem', fontSize: '0.875rem' }}>
      <span style={{ fontWeight: 600, color: colors.textSecondary, minWidth: compact ? '70px' : '100px', flexShrink: 0 }}>{label}</span>
      <span style={{ color: colors.text }}>{value}</span>
    </div>
  );
}

function formatCitations(citations: string, linkColor: string): string {
  if (!citations) return '';
  return citations.replace(
    /FamilySearch ([A-Z0-9]{4}-[A-Z0-9]{2,4})/g,
    (_match, pid) => `<a href="https://www.familysearch.org/tree/person/details/${pid}" target="_blank" rel="noopener" style="color:${linkColor};text-decoration:underline;">FamilySearch ${pid}</a>`
  );
}

export default function LeafOverlay({ person, onClose, onNavigate }: Props) {
  const { colors } = useTheme();
  const isMobile = useIsMobile();
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
      padding: isMobile ? '0.5rem' : '1rem',
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
        background: colors.panel,
        borderRadius: isMobile ? '0.75rem' : '1rem',
        boxShadow: `0 20px 60px ${colors.shadowHeavy}`,
        maxWidth: '900px',
        width: '100%',
        maxHeight: isMobile ? '95vh' : '90vh',
        overflow: 'auto',
        animation: 'slideUp 0.3s ease',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        {/* Header */}
        <div style={{
          padding: isMobile ? '1rem 1rem 0.75rem' : '1.5rem 2rem 1rem',
          borderBottom: `1px solid ${colors.divider}`,
        }}>
          <h2 style={{
            fontFamily: 'Merriweather, Georgia, serif',
            fontSize: isMobile ? '1.35rem' : '1.75rem',
            fontWeight: 700,
            color: colors.text,
            margin: 0,
          }}>
            {person.fullName}
          </h2>
          {person.aliases.length > 0 && (
            <div style={{ fontSize: '0.85rem', color: colors.textMuted, marginTop: '0.25rem' }}>
              Also known as: {person.aliases.join(', ')}
            </div>
          )}
          {years && (
            <div style={{ fontSize: '1rem', color: colors.textSecondary, marginTop: '0.25rem' }}>
              {years}
            </div>
          )}
        </div>

        {/* Body: two-column layout on wider screens */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 2fr) minmax(200px, 1fr)',
          gap: isMobile ? '1rem' : '1.5rem',
          padding: isMobile ? '1rem' : '1.5rem 2rem',
        }}>
          {/* Main content */}
          <div>
            {/* Vital Information */}
            <Section title="Vital Information" colors={colors}>
              <InfoRow label="Born" value={birthInfo} colors={colors} compact={isMobile} />
              <InfoRow label="Died" value={deathInfo} colors={colors} compact={isMobile} />
              <InfoRow label="Age at Death" value={person.ageAtDeath} colors={colors} compact={isMobile} />
              <InfoRow label="Occupation" value={person.occupation} colors={colors} compact={isMobile} />
              <InfoRow label="Residence" value={person.residence} colors={colors} compact={isMobile} />
              <InfoRow label="Burial" value={person.burialPlace} colors={colors} compact={isMobile} />
            </Section>

            {/* Notes */}
            {person.notes && (
              <Section title="Notes" colors={colors}>
                <p style={{
                  fontSize: '0.875rem',
                  lineHeight: 1.7,
                  color: colors.text,
                  margin: 0,
                }}>
                  {person.notes}
                </p>
              </Section>
            )}

            {/* Interesting Facts / Biography */}
            {person.interestingFacts && (
              <Section title="About" colors={colors}>
                <div style={{
                  fontSize: '0.875rem',
                  lineHeight: 1.7,
                  color: colors.text,
                }}>
                  {person.interestingFacts.split('\n\n').map((para, i) => (
                    <p key={i} style={{ margin: i === 0 ? 0 : '0.75rem 0 0 0' }}>{para}</p>
                  ))}
                </div>
              </Section>
            )}

            {/* Military Service */}
            {person.militaryService && (
              <Section title="Military Service" colors={colors}>
                <p style={{
                  fontSize: '0.875rem',
                  lineHeight: 1.7,
                  color: colors.text,
                  margin: 0,
                }}>
                  {person.militaryService}
                </p>
              </Section>
            )}

            {/* Sources */}
            {person.sourceCitations && (
              <Section title="Sources" colors={colors}>
                <p
                  style={{
                    fontSize: '0.875rem',
                    lineHeight: 1.7,
                    color: colors.textSecondary,
                    margin: 0,
                  }}
                  dangerouslySetInnerHTML={{ __html: formatCitations(person.sourceCitations, colors.link) }}
                />
              </Section>
            )}
          </div>

          {/* Sidebar: Family connections */}
          <div>
            <div style={{
              background: colors.surface,
              border: `1px solid ${colors.borderLight}`,
              borderRadius: '0.75rem',
              padding: '1rem',
            }}>
              <h3 style={{
                fontFamily: 'Merriweather, Georgia, serif',
                fontSize: '1rem',
                fontWeight: 700,
                color: colors.text,
                marginBottom: '1rem',
              }}>
                Family
              </h3>

              {(parents.father || parents.mother) && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: colors.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.3rem',
                  }}>
                    Parents
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    {parents.father && (
                      <div><FamilyLink person={parents.father} onClick={() => onNavigate(parents.father!)} colors={colors} /></div>
                    )}
                    {parents.mother && (
                      <div><FamilyLink person={parents.mother} onClick={() => onNavigate(parents.mother!)} colors={colors} /></div>
                    )}
                  </div>
                </div>
              )}

              {spouses.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: colors.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.3rem',
                  }}>
                    {spouses.length > 1 ? 'Spouses' : 'Spouse'}
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    {spouses.map((s) => (
                      <div key={s.id}><FamilyLink person={s} onClick={() => onNavigate(s)} colors={colors} /></div>
                    ))}
                  </div>
                </div>
              )}

              {children.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: colors.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.3rem',
                  }}>
                    Children
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    {children.map((c) => (
                      <div key={c.id}><FamilyLink person={c} onClick={() => onNavigate(c)} colors={colors} /></div>
                    ))}
                  </div>
                </div>
              )}

              {siblings.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: colors.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.3rem',
                  }}>
                    Siblings
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    {siblings.map((s) => (
                      <div key={s.id}><FamilyLink person={s} onClick={() => onNavigate(s)} colors={colors} /></div>
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
                background: colors.submitBg,
                color: 'white',
                textDecoration: 'none',
                borderRadius: '0.5rem',
                padding: '0.625rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                marginTop: '0.75rem',
                marginBottom: isMobile ? '0.5rem' : 0,
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = colors.submitBgHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = colors.submitBg; }}
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
