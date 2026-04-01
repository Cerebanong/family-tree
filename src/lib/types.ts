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
