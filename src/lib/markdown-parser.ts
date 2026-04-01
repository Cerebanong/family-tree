import fs from 'node:fs';
import path from 'node:path';

export interface ResearchItem {
  text: string;
  personId: number;
  personName: string;
  type: 'lead' | 'gap';
}

export interface BranchQuestion {
  text: string;
  branchName: string;
}

function extractCheckboxItems(content: string, heading: string): string[] {
  const regex = new RegExp(`## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |\\n---|\$)`);
  const match = content.match(regex);
  if (!match) return [];
  return match[1]
    .split('\n')
    .filter((line) => line.match(/^- \[[ x]\]/))
    .map((line) => line.replace(/^- \[[ x]\]\s*/, '').trim())
    .filter(Boolean);
}

function extractIdFromFilename(filename: string): number | null {
  const match = filename.match(/^(\d+)_/);
  return match ? parseInt(match[1], 10) : null;
}

function extractNameFromContent(content: string): string {
  const match = content.match(/^# (.+?) \(ID:/m);
  return match ? match[1] : 'Unknown';
}

export function parsePersonMarkdown(filePath: string): { leads: string[]; gaps: string[]; personId: number | null; personName: string } {
  const content = fs.readFileSync(filePath, 'utf-8');
  const filename = path.basename(filePath);
  return {
    leads: extractCheckboxItems(content, 'Research Leads'),
    gaps: extractCheckboxItems(content, 'Research Gaps'),
    personId: extractIdFromFilename(filename),
    personName: extractNameFromContent(content),
  };
}

export function parseBranchMarkdown(filePath: string): { questions: string[]; branchName: string } {
  const content = fs.readFileSync(filePath, 'utf-8');
  const nameMatch = content.match(/^# (.+?)$/m);
  return {
    questions: extractCheckboxItems(content, 'Open Questions'),
    branchName: nameMatch ? nameMatch[1].replace(' Branch', '') : path.basename(filePath, '.md'),
  };
}

export function getAllResearchItems(peopleDir: string): ResearchItem[] {
  const items: ResearchItem[] = [];
  if (!fs.existsSync(peopleDir)) return items;

  const files = fs.readdirSync(peopleDir).filter((f) => f.endsWith('.md'));
  for (const file of files) {
    const parsed = parsePersonMarkdown(path.join(peopleDir, file));
    if (parsed.personId == null) continue;
    for (const lead of parsed.leads) {
      items.push({ text: lead, personId: parsed.personId, personName: parsed.personName, type: 'lead' });
    }
    for (const gap of parsed.gaps) {
      items.push({ text: gap, personId: parsed.personId, personName: parsed.personName, type: 'gap' });
    }
  }
  return items;
}

export function getAllBranchQuestions(branchesDir: string): BranchQuestion[] {
  const items: BranchQuestion[] = [];
  if (!fs.existsSync(branchesDir)) return items;

  const files = fs.readdirSync(branchesDir).filter((f) => f.endsWith('.md') && !f.startsWith('test') && !f.startsWith('zzz'));
  for (const file of files) {
    const parsed = parseBranchMarkdown(path.join(branchesDir, file));
    for (const q of parsed.questions) {
      items.push({ text: q, branchName: parsed.branchName });
    }
  }
  return items;
}

export function getResearchForPerson(personId: number, peopleDir: string): { leads: string[]; gaps: string[] } {
  if (!fs.existsSync(peopleDir)) return { leads: [], gaps: [] };

  const files = fs.readdirSync(peopleDir).filter((f) => f.endsWith('.md'));
  for (const file of files) {
    const fileId = extractIdFromFilename(file);
    if (fileId === personId) {
      const parsed = parsePersonMarkdown(path.join(peopleDir, file));
      return { leads: parsed.leads, gaps: parsed.gaps };
    }
  }
  return { leads: [], gaps: [] };
}
