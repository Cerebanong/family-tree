export interface RawName {
  first: string;
  middle: string;
  last: string;
  aliases?: string[];
}

export interface RawPerson {
  id: number;
  name: RawName;
  sex: string;
  birth: { date: string; place: string };
  death: { date: string; place: string; cause: string };
  age_at_death: string;
  occupation: string;
  marital_status: string;
  burial_place: string;
  father_id: number | null;
  mother_id: number | null;
  notes: string;
  source_citations: string;
  residence: string;
  interesting_facts: string;
  military_service: string;
  spouses: number[];
}

export interface Person extends RawPerson {
  slug: string;
  fullName: string;
  childrenIds: number[];
  siblingIds: number[];
  birthYear: string | null;
  deathYear: string | null;
}

export interface TreeNode {
  id: number;
  name: string;
  slug: string;
  sex: string;
  birthYear: string | null;
  deathYear: string | null;
  children?: TreeNode[];
  _children?: TreeNode[];
}

export interface FamilyData {
  meta: {
    title: string;
    researcher: string;
    created: string;
    description: string;
    software: string;
  };
  individuals: RawPerson[];
  sources: unknown[];
}

/** A person enriched with computed fields, for client-side use */
export interface ClientPerson {
  id: number;
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  slug: string;
  sex: string;
  birthDate: string;
  birthPlace: string;
  birthYear: string | null;
  deathDate: string;
  deathPlace: string;
  deathCause: string;
  deathYear: string | null;
  ageAtDeath: string;
  occupation: string;
  residence: string;
  burialPlace: string;
  maritalStatus: string;
  notes: string;
  sourceCitations: string;
  interestingFacts: string;
  militaryService: string;
  fatherId: number | null;
  motherId: number | null;
  spouseIds: number[];
  childrenIds: number[];
  siblingIds: number[];
  aliases: string[];
}

/** A branch node representing a couple or individual at a generational level */
export interface BranchNode {
  id: string;
  primaryPerson: ClientPerson;
  secondaryPerson: ClientPerson | null;
  displaySurname: string;
  dateRange: string;
  primaryDateRange: string;
  secondaryDateRange: string | null;
  childBranchIds: string[];
  parentBranchIds: string[];
  generation: number;
  /** All individual person IDs contained in this branch node */
  personIds: number[];
}
