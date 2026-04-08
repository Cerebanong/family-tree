/**
 * BranchOverlay — Shows the individuals within a family branch node.
 * Layout: Parents (top) → Selected couple (center, larger) → Children (bottom).
 * Rendered as an overlay panel on top of the dimmed tree canvas.
 */
import type { BranchNode, ClientPerson } from '../lib/types';
import { getChildren, getParents } from '../lib/client-data';
import { useTheme, type ThemeColors } from './ThemeContext';

interface Props {
  branch: BranchNode;
  onPersonClick: (person: ClientPerson) => void;
  onClose: () => void;
}

function PersonCard({ person, onClick, size = 'normal', colors }: { person: ClientPerson; onClick: () => void; size?: 'normal' | 'large'; colors: ThemeColors }) {
  const years = [person.birthYear, person.deathYear].filter(Boolean).join(' \u2013 ');
  const isLarge = size === 'large';

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: isLarge ? '1.75rem 2rem' : '1rem 1.25rem',
        background: colors.bg,
        border: `1.5px solid ${colors.border}`,
        borderRadius: '0.75rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        minWidth: isLarge ? '220px' : '150px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = colors.surface;
        e.currentTarget.style.borderColor = colors.nodeStrokeFocused;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 4px 12px ${colors.shadow}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = colors.bg;
        e.currentTarget.style.borderColor = colors.border;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{
        width: isLarge ? '64px' : '40px',
        height: isLarge ? '64px' : '40px',
        borderRadius: '50%',
        background: person.sex === 'Female' ? colors.female : colors.male,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 700,
        fontSize: isLarge ? '1.35rem' : '0.95rem',
        marginBottom: isLarge ? '0.75rem' : '0.5rem',
        fontFamily: 'Merriweather, Georgia, serif',
      }}>
        {person.firstName.charAt(0)}
      </div>
      <div style={{
        fontFamily: 'Merriweather, Georgia, serif',
        fontWeight: 700,
        fontSize: isLarge ? '1.15rem' : '0.85rem',
        color: colors.text,
        textAlign: 'center',
        marginBottom: '0.25rem',
      }}>
        {person.fullName}
      </div>
      {years && (
        <div style={{
          fontSize: isLarge ? '0.85rem' : '0.75rem',
          color: colors.textSecondary,
        }}>
          {years}
        </div>
      )}
      {person.occupation && (
        <div style={{
          fontSize: isLarge ? '0.8rem' : '0.7rem',
          color: colors.textMuted,
          marginTop: '0.25rem',
          fontStyle: 'italic',
        }}>
          {person.occupation}
        </div>
      )}
    </button>
  );
}

function SectionLabel({ children, colors }: { children: React.ReactNode; colors: ThemeColors }) {
  return (
    <h3 style={{
      fontFamily: 'Merriweather, Georgia, serif',
      fontSize: '0.8rem',
      fontWeight: 700,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: '0.5rem',
      textAlign: 'center',
    }}>
      {children}
    </h3>
  );
}

export default function BranchOverlay({ branch, onPersonClick, onClose }: Props) {
  const { colors } = useTheme();
  const people = [branch.primaryPerson];
  if (branch.secondaryPerson) people.push(branch.secondaryPerson);

  // Get children of this couple (deduplicated)
  const childrenSet = new Set<number>();
  const children: ClientPerson[] = [];
  for (const person of people) {
    for (const child of getChildren(person.id)) {
      if (!childrenSet.has(child.id)) {
        childrenSet.add(child.id);
        children.push(child);
      }
    }
  }

  // Get parents of primary person
  const primaryParents = getParents(branch.primaryPerson.id);
  const primaryParentList: ClientPerson[] = [];
  if (primaryParents.father) primaryParentList.push(primaryParents.father);
  if (primaryParents.mother) primaryParentList.push(primaryParents.mother);

  // Get parents of secondary person (if couple)
  const secondaryParentList: ClientPerson[] = [];
  if (branch.secondaryPerson) {
    const secondaryParents = getParents(branch.secondaryPerson.id);
    if (secondaryParents.father) secondaryParentList.push(secondaryParents.father);
    if (secondaryParents.mother) secondaryParentList.push(secondaryParents.mother);
  }

  const title = branch.secondaryPerson
    ? `${branch.primaryPerson.firstName} & ${branch.secondaryPerson.firstName} ${branch.displaySurname}`
    : branch.primaryPerson.fullName;

  const hasParents = primaryParentList.length > 0 || secondaryParentList.length > 0;

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
      zIndex: 20,
      padding: '2rem',
    }}>
      {/* Clickable backdrop to close */}
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
        borderRadius: '1rem',
        boxShadow: `0 20px 60px ${colors.shadowHeavy}`,
        padding: '2rem',
        maxWidth: '700px',
        width: '100%',
        maxHeight: '85vh',
        overflow: 'auto',
        animation: 'slideUp 0.3s ease',
      }}>
        {/* Parents section (top) */}
        {hasParents && (
          <div style={{ marginBottom: '1.25rem' }}>
            {primaryParentList.length > 0 && (
              <div style={{ marginBottom: secondaryParentList.length > 0 ? '0.75rem' : 0 }}>
                <SectionLabel colors={colors}>{branch.primaryPerson.firstName}&apos;s Parents</SectionLabel>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}>
                  {primaryParentList.map((parent) => (
                    <PersonCard
                      key={parent.id}
                      person={parent}
                      onClick={() => onPersonClick(parent)}
                      colors={colors}
                    />
                  ))}
                </div>
              </div>
            )}
            {secondaryParentList.length > 0 && (
              <div>
                <SectionLabel colors={colors}>{branch.secondaryPerson!.firstName}&apos;s Parents</SectionLabel>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}>
                  {secondaryParentList.map((parent) => (
                    <PersonCard
                      key={parent.id}
                      person={parent}
                      onClick={() => onPersonClick(parent)}
                      colors={colors}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            <div style={{
              height: '1px',
              background: colors.divider,
              margin: '1.25rem 2rem 0',
            }} />
          </div>
        )}

        {/* Header + couple cards (center, larger) */}
        <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{
            fontFamily: 'Merriweather, Georgia, serif',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: colors.text,
            margin: 0,
          }}>
            {title}
          </h2>
          {branch.dateRange && (
            <div style={{
              fontSize: '0.9rem',
              color: colors.textSecondary,
              marginTop: '0.25rem',
            }}>
              {branch.secondaryDateRange
                ? `${branch.primaryDateRange} / ${branch.secondaryDateRange}`
                : branch.primaryDateRange}
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1.25rem',
          flexWrap: 'wrap',
          marginBottom: '1.25rem',
        }}>
          {people.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              onClick={() => onPersonClick(person)}
              size="large"
              colors={colors}
            />
          ))}
        </div>

        {/* Children section (bottom) */}
        {children.length > 0 && (
          <div>
            {/* Divider */}
            <div style={{
              height: '1px',
              background: colors.divider,
              margin: '0 2rem 1.25rem',
            }} />

            <SectionLabel colors={colors}>Children</SectionLabel>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}>
              {children.map((child) => (
                <PersonCard
                  key={child.id}
                  person={child}
                  onClick={() => onPersonClick(child)}
                  colors={colors}
                />
              ))}
            </div>
          </div>
        )}
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
