import type { RawPerson, Person, FamilyData } from './types';
import { generateSlug } from './slug';
import fs from 'node:fs';
import path from 'node:path';

let _people: Person[] | null = null;
let _byId: Map<number, Person> | null = null;
let _bySlug: Map<string, Person> | null = null;
let _childrenByParent: Map<number, number[]> | null = null;

function getDataPath(): string {
  return path.resolve('src/data/family_tree.json');
}

function loadRaw(): FamilyData {
  const raw = fs.readFileSync(getDataPath(), 'utf-8');
  return JSON.parse(raw);
}

function extractYear(dateStr: string): string | null {
  if (!dateStr) return null;
  const match = dateStr.match(/~?(\d{4})/);
  return match ? match[1] : null;
}

function buildChildrenMap(raw: RawPerson[]): Map<number, number[]> {
  const map = new Map<number, number[]>();
  for (const p of raw) {
    if (p.father_id != null) {
      if (!map.has(p.father_id)) map.set(p.father_id, []);
      map.get(p.father_id)!.push(p.id);
    }
    if (p.mother_id != null) {
      if (!map.has(p.mother_id)) map.set(p.mother_id, []);
      map.get(p.mother_id)!.push(p.id);
    }
  }
  return map;
}

function buildSiblingIds(person: RawPerson, raw: RawPerson[]): number[] {
  const siblings = new Set<number>();
  for (const p of raw) {
    if (p.id === person.id) continue;
    if (person.father_id != null && p.father_id === person.father_id) siblings.add(p.id);
    if (person.mother_id != null && p.mother_id === person.mother_id) siblings.add(p.id);
  }
  return [...siblings].sort((a, b) => a - b);
}

function init(): void {
  if (_people) return;

  const data = loadRaw();
  const raw = data.individuals;
  const childrenMap = buildChildrenMap(raw);
  _childrenByParent = childrenMap;

  _people = raw.map((r) => ({
    ...r,
    slug: generateSlug(r),
    fullName: [r.name.first, r.name.middle, r.name.last].filter(Boolean).join(' '),
    childrenIds: childrenMap.get(r.id) ?? [],
    siblingIds: buildSiblingIds(r, raw),
    birthYear: extractYear(r.birth.date),
    deathYear: extractYear(r.death.date),
  }));

  _byId = new Map(_people.map((p) => [p.id, p]));
  _bySlug = new Map(_people.map((p) => [p.slug, p]));
}

export function getAllPeople(): Person[] {
  init();
  return _people!;
}

export function getPersonById(id: number): Person | undefined {
  init();
  return _byId!.get(id);
}

export function getPersonBySlug(slug: string): Person | undefined {
  init();
  return _bySlug!.get(slug);
}

export function getChildren(id: number): Person[] {
  init();
  const ids = _childrenByParent!.get(id) ?? [];
  return ids.map((cid) => _byId!.get(cid)).filter(Boolean) as Person[];
}

export function getSiblings(id: number): Person[] {
  init();
  const person = _byId!.get(id);
  if (!person) return [];
  return person.siblingIds.map((sid) => _byId!.get(sid)).filter(Boolean) as Person[];
}

export function getSpouses(id: number): Person[] {
  init();
  const person = _byId!.get(id);
  if (!person) return [];
  return person.spouses.map((sid) => _byId!.get(sid)).filter(Boolean) as Person[];
}

export function getParents(id: number): { father?: Person; mother?: Person } {
  init();
  const person = _byId!.get(id);
  if (!person) return {};
  return {
    father: person.father_id != null ? _byId!.get(person.father_id) : undefined,
    mother: person.mother_id != null ? _byId!.get(person.mother_id) : undefined,
  };
}

export function getSurnameGroups(): Map<string, Person[]> {
  init();
  const groups = new Map<string, Person[]>();
  for (const p of _people!) {
    const surname = p.name.last || 'Unknown';
    if (!groups.has(surname)) groups.set(surname, []);
    groups.get(surname)!.push(p);
  }
  return new Map([...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

export function getAllSurnames(): string[] {
  return [...getSurnameGroups().keys()];
}

export function getAllLocations(): string[] {
  init();
  const locs = new Set<string>();
  for (const p of _people!) {
    if (p.birth.place) locs.add(p.birth.place);
    if (p.death.place) locs.add(p.death.place);
  }
  return [...locs].sort();
}
