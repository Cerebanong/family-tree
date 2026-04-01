import type { RawPerson } from './types';

export function generateSlug(person: RawPerson): string {
  const first = person.name.first.toLowerCase().trim();
  const last = person.name.last.toLowerCase().trim();
  const base = `${first}-${last}-${person.id}`;
  return base.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}
