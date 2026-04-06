/**
 * Client-side data layer for the family tree canvas app.
 * Loads family_tree.json via fetch and provides lookup functions
 * and the BranchNode tree builder.
 */
import type { RawPerson, FamilyData, ClientPerson, BranchNode } from './types';

let _people: ClientPerson[] | null = null;
let _byId: Map<number, ClientPerson> | null = null;
let _branchNodes: BranchNode[] | null = null;
let _branchById: Map<string, BranchNode> | null = null;

function extractYear(dateStr: string): string | null {
  if (!dateStr) return null;
  const match = dateStr.match(/~?(\d{4})/);
  return match ? match[1] : null;
}

function generateSlug(person: RawPerson): string {
  const first = person.name.first.toLowerCase().trim();
  const last = person.name.last.toLowerCase().trim();
  const base = `${first}-${last}-${person.id}`;
  return base.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function formatDateRange(birthYear: string | null, deathYear: string | null): string {
  if (birthYear && deathYear) return `${birthYear}\u2013${deathYear}`;
  if (birthYear) return `${birthYear}\u2013`;
  if (deathYear) return `\u2013${deathYear}`;
  return '';
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
  // Deduplicate
  for (const [, kids] of map) {
    const seen = new Set<number>();
    const unique = kids.filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    kids.length = 0;
    kids.push(...unique);
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

function enrichPerson(raw: RawPerson, childrenMap: Map<number, number[]>, allRaw: RawPerson[]): ClientPerson {
  return {
    id: raw.id,
    firstName: raw.name.first,
    middleName: raw.name.middle,
    lastName: raw.name.last,
    fullName: [raw.name.first, raw.name.middle, raw.name.last].filter(Boolean).join(' '),
    slug: generateSlug(raw),
    sex: raw.sex,
    birthDate: raw.birth.date,
    birthPlace: raw.birth.place,
    birthYear: extractYear(raw.birth.date),
    deathDate: raw.death.date,
    deathPlace: raw.death.place,
    deathCause: raw.death.cause,
    deathYear: extractYear(raw.death.date),
    ageAtDeath: raw.age_at_death,
    occupation: raw.occupation,
    residence: raw.residence,
    burialPlace: raw.burial_place,
    maritalStatus: raw.marital_status,
    notes: raw.notes,
    sourceCitations: raw.source_citations,
    interestingFacts: raw.interesting_facts ?? '',
    militaryService: raw.military_service ?? '',
    fatherId: raw.father_id,
    motherId: raw.mother_id,
    spouseIds: raw.spouses ?? [],
    childrenIds: childrenMap.get(raw.id) ?? [],
    siblingIds: buildSiblingIds(raw, allRaw),
    aliases: raw.name.aliases ?? [],
  };
}

/** Load and initialize all data from the JSON file */
export async function loadFamilyData(): Promise<ClientPerson[]> {
  if (_people) return _people;

  const resp = await fetch('/family_tree.json');
  const data: FamilyData = await resp.json();
  const raw = data.individuals;
  const childrenMap = buildChildrenMap(raw);

  _people = raw.map((r) => enrichPerson(r, childrenMap, raw));
  _byId = new Map(_people.map((p) => [p.id, p]));

  return _people;
}

export function getAllPeople(): ClientPerson[] {
  if (!_people) throw new Error('Data not loaded. Call loadFamilyData() first.');
  return _people;
}

export function getPersonById(id: number): ClientPerson | undefined {
  if (!_byId) throw new Error('Data not loaded. Call loadFamilyData() first.');
  return _byId.get(id);
}

export function getSpouses(id: number): ClientPerson[] {
  const person = getPersonById(id);
  if (!person) return [];
  return person.spouseIds.map((sid) => getPersonById(sid)).filter(Boolean) as ClientPerson[];
}

export function getChildren(id: number): ClientPerson[] {
  const person = getPersonById(id);
  if (!person) return [];
  return person.childrenIds.map((cid) => getPersonById(cid)).filter(Boolean) as ClientPerson[];
}

export function getParents(id: number): { father?: ClientPerson; mother?: ClientPerson } {
  const person = getPersonById(id);
  if (!person) return {};
  return {
    father: person.fatherId != null ? getPersonById(person.fatherId) : undefined,
    mother: person.motherId != null ? getPersonById(person.motherId) : undefined,
  };
}

export function getSiblings(id: number): ClientPerson[] {
  const person = getPersonById(id);
  if (!person) return [];
  return person.siblingIds.map((sid) => getPersonById(sid)).filter(Boolean) as ClientPerson[];
}

// ─── Branch Node Builder ───

/**
 * Build a graph of BranchNodes from the flat person data.
 * Each BranchNode represents a couple (or single person) at a generational level.
 */
export function buildBranchTree(people: ClientPerson[]): BranchNode[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  const branchNodes: BranchNode[] = [];
  const branchById = new Map<string, BranchNode>();
  // Track which people have already been assigned to a branch node
  const personToBranch = new Map<number, string>();

  // Step 1: Create branch nodes for each couple or single person
  // Process couples first (people with spouses)
  const processed = new Set<number>();

  for (const person of people) {
    if (processed.has(person.id)) continue;

    let primary: ClientPerson;
    let secondary: ClientPerson | null = null;

    if (person.spouseIds.length > 0) {
      // Find the best unprocessed spouse — prefer the one who shares the most
      // children in the dataset (handles remarriage: pair with the co-parent).
      const availableSpouses = person.spouseIds.filter((sid) => !processed.has(sid));
      let spouseId: number | undefined;
      if (availableSpouses.length > 1) {
        let bestId = availableSpouses[0];
        let bestScore = 0;
        for (const sid of availableSpouses) {
          const score = people.filter(
            (c) => (c.fatherId === person.id && c.motherId === sid) ||
                   (c.motherId === person.id && c.fatherId === sid)
          ).length;
          if (score > bestScore) { bestScore = score; bestId = sid; }
        }
        spouseId = bestId;
      } else {
        spouseId = availableSpouses[0];
      }
      if (spouseId != null) {
        const spouse = byId.get(spouseId);
        if (spouse) {
          // Male is primary (or first person if same sex)
          if (person.sex === 'Male') {
            primary = person;
            secondary = spouse;
          } else {
            primary = spouse;
            secondary = person;
          }
          processed.add(primary.id);
          processed.add(secondary.id);
        } else {
          primary = person;
          processed.add(person.id);
        }
      } else {
        // All spouses already processed, this person is solo
        primary = person;
        processed.add(person.id);
      }
    } else {
      primary = person;
      processed.add(person.id);
    }

    const branchId = secondary
      ? `branch-${primary.id}-${secondary.id}`
      : `branch-${primary.id}`;

    const displaySurname = primary.lastName || (secondary?.lastName ?? 'Unknown');
    const primaryDateRange = formatDateRange(primary.birthYear, primary.deathYear);
    const secondaryDateRange = secondary
      ? formatDateRange(secondary.birthYear, secondary.deathYear)
      : null;
    const dateRange = primaryDateRange;

    const personIds = secondary ? [primary.id, secondary.id] : [primary.id];

    const node: BranchNode = {
      id: branchId,
      primaryPerson: primary,
      secondaryPerson: secondary,
      displaySurname,
      dateRange,
      primaryDateRange,
      secondaryDateRange,
      childBranchIds: [],
      parentBranchIds: [],
      generation: 0,
      personIds,
    };

    branchNodes.push(node);
    branchById.set(branchId, node);
    personToBranch.set(primary.id, branchId);
    if (secondary) personToBranch.set(secondary.id, branchId);
  }

  // Step 2: Link parent-child relationships between branch nodes
  for (const node of branchNodes) {
    // Find children of this couple's branch
    const childPersonIds = new Set<number>();
    for (const pid of node.personIds) {
      const person = byId.get(pid);
      if (person) {
        for (const cid of person.childrenIds) {
          childPersonIds.add(cid);
        }
      }
    }

    // Find the branch nodes that contain those children
    const childBranchIdSet = new Set<string>();
    for (const cid of childPersonIds) {
      const childBranchId = personToBranch.get(cid);
      if (childBranchId && childBranchId !== node.id) {
        childBranchIdSet.add(childBranchId);
      }
    }

    node.childBranchIds = [...childBranchIdSet];

    // Set parent links on child branches
    for (const childBranchId of node.childBranchIds) {
      const childNode = branchById.get(childBranchId);
      if (childNode && !childNode.parentBranchIds.includes(node.id)) {
        childNode.parentBranchIds.push(node.id);
      }
    }
  }

  // Step 3: Assign generations so that parents from both sides of a couple
  // are always at the same level (pedigree chart alignment).
  //
  // Phase A: BFS forward from roots — longest path from any root.
  // Uses BFS with re-processing: when a deeper root proposes a higher
  // generation for a node, the node is re-enqueued so its descendants
  // also get updated. This ensures each node's generation equals the
  // length of the longest path from any root to that node.
  const roots = branchNodes.filter((n) => n.parentBranchIds.length === 0);

  for (const node of branchNodes) node.generation = 0;
  const fwdQueue: string[] = [];
  for (const root of roots) {
    root.generation = 0;
    fwdQueue.push(root.id);
  }
  while (fwdQueue.length > 0) {
    const nodeId = fwdQueue.shift()!;
    const node = branchById.get(nodeId);
    if (!node) continue;
    for (const childId of node.childBranchIds) {
      const child = branchById.get(childId);
      if (!child) continue;
      const proposed = node.generation + 1;
      if (proposed > child.generation) {
        child.generation = proposed;
        fwdQueue.push(childId);
      }
    }
  }

  // Phase B: Backward pass from leaf nodes to ensure all parents of a
  // child are at the same generation level. Seeds from ALL leaf nodes
  // (not just maxGen) so every branch of the tree is reachable.
  const maxGenFwd = Math.max(...branchNodes.map((n) => n.generation));

  // BFS backward from all leaf nodes
  const genMap = new Map<string, number>();
  const queue: Array<{ id: string; gen: number }> = [];

  // Start from all leaf nodes (no children) at their forward-pass generation
  for (const node of branchNodes) {
    if (node.childBranchIds.length === 0) {
      queue.push({ id: node.id, gen: node.generation });
      genMap.set(node.id, node.generation);
    }
  }

  while (queue.length > 0) {
    const { id, gen } = queue.shift()!;
    const node = branchById.get(id);
    if (!node) continue;

    for (const pid of node.parentBranchIds) {
      const parentGen = gen - 1;
      const existing = genMap.get(pid);
      if (existing == null || existing < parentGen) {
        genMap.set(pid, parentGen);
        queue.push({ id: pid, gen: parentGen });
      }
    }
  }

  // Apply backward-pass generations to nodes reached from the most recent gen.
  // Nodes not reached keep their forward-pass generation.
  for (const node of branchNodes) {
    const bwdGen = genMap.get(node.id);
    if (bwdGen != null) {
      node.generation = bwdGen;
    }
  }

  // Store for later access
  _branchNodes = branchNodes;
  _branchById = branchById;

  return branchNodes;
}

export function getBranchNodes(): BranchNode[] {
  if (!_branchNodes) throw new Error('Branch tree not built. Call buildBranchTree() first.');
  return _branchNodes;
}

export function getBranchById(id: string): BranchNode | undefined {
  if (!_branchById) throw new Error('Branch tree not built. Call buildBranchTree() first.');
  return _branchById.get(id);
}

/** Get the branch node that contains a specific person */
export function getBranchForPerson(personId: number): BranchNode | undefined {
  if (!_branchNodes) return undefined;
  return _branchNodes.find((n) => n.personIds.includes(personId));
}

/** Get the most recent generation's branch nodes (highest generation number) */
export function getMostRecentBranches(): BranchNode[] {
  if (!_branchNodes) return [];
  const maxGen = Math.max(..._branchNodes.map((n) => n.generation));
  return _branchNodes.filter((n) => n.generation === maxGen);
}
