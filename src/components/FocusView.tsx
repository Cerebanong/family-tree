import type { RawPerson } from '../lib/types';
import { generateSlug } from '../lib/slug';

interface Props {
  personId: number;
  individuals: RawPerson[];
  onSelectPerson: (id: number) => void;
}

function extractYear(dateStr: string): string | null {
  if (!dateStr) return null;
  const match = dateStr.match(/~?(\d{4})/);
  return match ? match[1] : null;
}

interface PersonCardProps {
  person: RawPerson;
  role: string;
  onClick: () => void;
  onNavigate: () => void;
}

function PersonFocusCard({ person, role, onClick, onNavigate }: PersonCardProps) {
  const year = extractYear(person.birth.date);
  const deathYear = extractYear(person.death.date);
  const isFemale = person.sex === 'Female';

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #e8cba7',
        borderRadius: '0.5rem',
        padding: '0.75rem',
        minWidth: '160px',
        maxWidth: '200px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8b6914', marginBottom: '0.25rem' }}>
        {role}
      </div>
      <div
        onClick={onClick}
        style={{
          fontFamily: 'Merriweather, serif',
          fontWeight: 'bold',
          fontSize: '0.875rem',
          color: isFemale ? '#b8834a' : '#6b8c55',
          cursor: 'pointer',
          marginBottom: '0.25rem',
        }}
      >
        {person.name.first} {person.name.last}
      </div>
      <div style={{ fontSize: '0.75rem', color: '#6b4f10' }}>
        {[year, deathYear].filter(Boolean).join(' – ') || ''}
      </div>
      <a
        href={`/people/${generateSlug(person)}`}
        onClick={(e) => { e.stopPropagation(); }}
        style={{
          display: 'inline-block',
          marginTop: '0.375rem',
          fontSize: '0.6875rem',
          color: '#4f6e3d',
        }}
      >
        View profile →
      </a>
    </div>
  );
}

export default function FocusView({ personId, individuals, onSelectPerson }: Props) {
  const byId = new Map(individuals.map((p) => [p.id, p]));
  const person = byId.get(personId);

  if (!person) {
    return <p style={{ textAlign: 'center', color: '#6b4f10' }}>Person not found.</p>;
  }

  const father = person.father_id != null ? byId.get(person.father_id) : undefined;
  const mother = person.mother_id != null ? byId.get(person.mother_id) : undefined;
  const spouses = (person.spouses || []).map((id) => byId.get(id)).filter(Boolean) as RawPerson[];
  const children = individuals.filter((p) => p.father_id === personId || p.mother_id === personId);

  const year = extractYear(person.birth.date);
  const deathYear = extractYear(person.death.date);

  const sectionStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    justifyContent: 'center',
    marginBottom: '1rem',
  };

  const labelStyle: React.CSSProperties = {
    width: '100%',
    textAlign: 'center',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#6b4f10',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.25rem',
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      {/* Parents */}
      {(father || mother) && (
        <div>
          <div style={labelStyle}>Parents</div>
          <div style={sectionStyle}>
            {father && <PersonFocusCard person={father} role="Father" onClick={() => onSelectPerson(father.id)} onNavigate={() => {}} />}
            {mother && <PersonFocusCard person={mother} role="Mother" onClick={() => onSelectPerson(mother.id)} onNavigate={() => {}} />}
          </div>
        </div>
      )}

      {/* Connector line */}
      <div style={{ textAlign: 'center', color: '#d4a574', fontSize: '1.5rem', lineHeight: 1 }}>│</div>

      {/* Focus person + spouses */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div
          style={{
            background: '#f5e6d3',
            border: '2px solid #8b6914',
            borderRadius: '0.75rem',
            padding: '1rem',
            textAlign: 'center',
            minWidth: '180px',
          }}
        >
          <div style={{ fontFamily: 'Merriweather, serif', fontWeight: 'bold', fontSize: '1.125rem', color: '#4a3610' }}>
            {person.name.first} {person.name.middle ? person.name.middle + ' ' : ''}{person.name.last}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6b4f10' }}>
            {[year, deathYear].filter(Boolean).join(' – ')}
          </div>
          <a
            href={`/people/${generateSlug(person)}`}
            style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.75rem', color: '#4f6e3d' }}
          >
            View profile →
          </a>
        </div>
        {spouses.map((s) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#d4a574', fontSize: '1.25rem' }}>━</span>
            <PersonFocusCard person={s} role="Spouse" onClick={() => onSelectPerson(s.id)} onNavigate={() => {}} />
          </div>
        ))}
      </div>

      {/* Connector line */}
      {children.length > 0 && (
        <div style={{ textAlign: 'center', color: '#d4a574', fontSize: '1.5rem', lineHeight: 1 }}>│</div>
      )}

      {/* Children */}
      {children.length > 0 && (
        <div>
          <div style={labelStyle}>Children</div>
          <div style={sectionStyle}>
            {children.map((c) => (
              <PersonFocusCard key={c.id} person={c} role="Child" onClick={() => onSelectPerson(c.id)} onNavigate={() => {}} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
