import type { TreeNode, RawPerson } from './types';
import { generateSlug } from './slug';

function extractYear(dateStr: string): string | null {
  if (!dateStr) return null;
  const match = dateStr.match(/~?(\d{4})/);
  return match ? match[1] : null;
}

export function buildTreeData(individuals: RawPerson[]): TreeNode[] {
  const byId = new Map(individuals.map((p) => [p.id, p]));
  const childrenMap = new Map<number, number[]>();

  for (const p of individuals) {
    if (p.father_id != null) {
      if (!childrenMap.has(p.father_id)) childrenMap.set(p.father_id, []);
      childrenMap.get(p.father_id)!.push(p.id);
    }
    if (p.mother_id != null) {
      if (!childrenMap.has(p.mother_id)) childrenMap.set(p.mother_id, []);
      childrenMap.get(p.mother_id)!.push(p.id);
    }
  }

  // Deduplicate children (a child appears under both parents)
  for (const [, kids] of childrenMap) {
    const seen = new Set<number>();
    kids.splice(0, kids.length, ...kids.filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    }));
  }

  function buildNode(id: number, visited: Set<number>): TreeNode | null {
    if (visited.has(id)) return null;
    visited.add(id);

    const person = byId.get(id);
    if (!person) return null;

    const kidIds = childrenMap.get(id) ?? [];
    const children = kidIds
      .map((kid) => buildNode(kid, visited))
      .filter(Boolean) as TreeNode[];

    return {
      id: person.id,
      name: [person.name.first, person.name.last].filter(Boolean).join(' '),
      slug: generateSlug(person),
      sex: person.sex,
      birthYear: extractYear(person.birth.date),
      deathYear: extractYear(person.death.date),
      children: children.length > 0 ? children : undefined,
    };
  }

  // Roots: people whose parents are not in the dataset
  const allIds = new Set(individuals.map((p) => p.id));
  const roots = individuals.filter(
    (p) =>
      (p.father_id == null || !allIds.has(p.father_id)) &&
      (p.mother_id == null || !allIds.has(p.mother_id))
  );

  const visited = new Set<number>();
  return roots
    .map((r) => buildNode(r.id, visited))
    .filter(Boolean) as TreeNode[];
}

export function buildFocusTree(
  personId: number,
  individuals: RawPerson[],
): { ancestors: TreeNode[]; person: TreeNode; descendants: TreeNode[] } | null {
  const byId = new Map(individuals.map((p) => [p.id, p]));
  const person = byId.get(personId);
  if (!person) return null;

  function toNode(p: RawPerson): TreeNode {
    return {
      id: p.id,
      name: [p.name.first, p.name.last].filter(Boolean).join(' '),
      slug: generateSlug(p),
      sex: p.sex,
      birthYear: extractYear(p.birth.date),
      deathYear: extractYear(p.death.date),
    };
  }

  // Ancestors: walk up father_id and mother_id
  function getAncestors(id: number, depth: number): TreeNode[] {
    if (depth > 10) return [];
    const p = byId.get(id);
    if (!p) return [];
    const result: TreeNode[] = [];
    if (p.father_id != null && byId.has(p.father_id)) {
      const father = byId.get(p.father_id)!;
      const node = toNode(father);
      node.children = getAncestors(father.id, depth + 1);
      result.push(node);
    }
    if (p.mother_id != null && byId.has(p.mother_id)) {
      const mother = byId.get(p.mother_id)!;
      const node = toNode(mother);
      node.children = getAncestors(mother.id, depth + 1);
      result.push(node);
    }
    return result;
  }

  // Descendants: find children
  function getDescendants(id: number, depth: number): TreeNode[] {
    if (depth > 10) return [];
    return individuals
      .filter((p) => p.father_id === id || p.mother_id === id)
      .map((p) => {
        const node = toNode(p);
        node.children = getDescendants(p.id, depth + 1);
        if (node.children.length === 0) delete node.children;
        return node;
      });
  }

  return {
    ancestors: getAncestors(personId, 0),
    person: toNode(person),
    descendants: getDescendants(personId, 0),
  };
}
