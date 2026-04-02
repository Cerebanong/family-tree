/**
 * BranchOverlay — Shows the individuals within a family branch node.
 * Rendered as an overlay panel on top of the dimmed tree canvas.
 */
import type { BranchNode, ClientPerson } from '../lib/types';
import { getChildren, getParents } from '../lib/client-data';

interface Props {
  branch: BranchNode;
  onPersonClick: (person: ClientPerson) => void;
  onClose: () => void;
}

function PersonCard({ person, onClick }: { person: ClientPerson; onClick: () => void }) {
  const years = [person.birthYear, person.deathYear].filter(Boolean).join(' \u2013 ');

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.25rem 1.5rem',
        background: '#fdf8f0',
        border: '1.5px solid #d4a574',
        borderRadius: '0.75rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        minWidth: '180px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#f5e6d3';
        e.currentTarget.style.borderColor = '#b8834a';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#fdf8f0';
        e.currentTarget.style.borderColor = '#d4a574';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: person.sex === 'Female' ? '#b8834a' : '#6b8c55',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 700,
        fontSize: '1.125rem',
        marginBottom: '0.75rem',
        fontFamily: 'Merriweather, Georgia, serif',
      }}>
        {person.firstName.charAt(0)}
      </div>
      <div style={{
        fontFamily: 'Merriweather, Georgia, serif',
        fontWeight: 700,
        fontSize: '0.95rem',
        color: '#4a3610',
        textAlign: 'center',
        marginBottom: '0.25rem',
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
          fontSize: '0.75rem',
          color: '#8b6914',
          marginTop: '0.25rem',
          fontStyle: 'italic',
        }}>
          {person.occupation}
        </div>
      )}
    </button>
  );
}

export default function BranchOverlay({ branch, onPersonClick, onClose }: Props) {
  const people = [branch.primaryPerson];
  if (branch.secondaryPerson) people.push(branch.secondaryPerson);

  // Get children of this couple
  const childrenIds = new Set<number>();
  for (const person of people) {
    for (const cid of person.childrenIds) {
      childrenIds.add(cid);
    }
  }
  const children = [...childrenIds]
    .map((id) => {
      // Get children from the people array (all loaded data)
      const allChildren = getChildren(people[0].id);
      if (branch.secondaryPerson) {
        allChildren.push(...getChildren(branch.secondaryPerson.id));
      }
      return allChildren;
    })
    .flat()
    .filter((child, idx, arr) => arr.findIndex((c) => c.id === child.id) === idx);

  // Get parents
  const primaryParents = getParents(branch.primaryPerson.id);
  const parents: ClientPerson[] = [];
  if (primaryParents.father) parents.push(primaryParents.father);
  if (primaryParents.mother) parents.push(primaryParents.mother);

  const title = branch.secondaryPerson
    ? `${branch.primaryPerson.firstName} & ${branch.secondaryPerson.firstName} ${branch.displaySurname}`
    : branch.primaryPerson.fullName;

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
        background: 'white',
        borderRadius: '1rem',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        padding: '2rem',
        maxWidth: '700px',
        width: '100%',
        maxHeight: '85vh',
        overflow: 'auto',
        animation: 'slideUp 0.3s ease',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{
            fontFamily: 'Merriweather, Georgia, serif',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#4a3610',
            margin: 0,
          }}>
            {title}
          </h2>
          {branch.dateRange && (
            <div style={{
              fontSize: '0.9rem',
              color: '#6b4f10',
              marginTop: '0.25rem',
            }}>
              {branch.secondaryDateRange
                ? `${branch.primaryDateRange} / ${branch.secondaryDateRange}`
                : branch.primaryDateRange}
            </div>
          )}
        </div>

        {/* Couple cards */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
        }}>
          {people.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              onClick={() => onPersonClick(person)}
            />
          ))}
        </div>

        {/* Parents section */}
        {parents.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{
              fontFamily: 'Merriweather, Georgia, serif',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#8b6914',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.75rem',
              textAlign: 'center',
            }}>
              Parents
            </h3>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}>
              {parents.map((parent) => (
                <PersonCard
                  key={parent.id}
                  person={parent}
                  onClick={() => onPersonClick(parent)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Children section */}
        {children.length > 0 && (
          <div>
            <h3 style={{
              fontFamily: 'Merriweather, Georgia, serif',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#8b6914',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.75rem',
              textAlign: 'center',
            }}>
              Children
            </h3>
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
