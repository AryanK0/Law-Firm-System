export type Role =
  | "Managing Partner"
  | "Partner"
  | "Senior Associate"
  | "Associate"
  | "Paralegal"
  | "Intern"
  | "IT Admin"
  | "Finance Admin";

export interface User {
  id: number;
  name: string;
  role: Role;
  hierarchy: number;
  accessLabel: string;
  practice: string;
}

export const roleHierarchy: Record<Role, number> = {
  "Managing Partner": 1,
  Partner: 2,
  "Senior Associate": 3,
  Associate: 4,
  Paralegal: 5,
  Intern: 6,
  "IT Admin": 4,
  "Finance Admin": 4,
};

export const demoUsers: User[] = [
  {
    id: 1,
    name: "Jessica Pearson",
    role: "Managing Partner",
    hierarchy: 1,
    accessLabel: "Executive",
    practice: "Firm leadership",
  },
  {
    id: 2,
    name: "Harvey Specter",
    role: "Partner",
    hierarchy: 2,
    accessLabel: "Leadership",
    practice: "Litigation",
  },
  {
    id: 5,
    name: "Katrina Bennett",
    role: "Senior Associate",
    hierarchy: 3,
    accessLabel: "Senior Matter Access",
    practice: "Complex disputes",
  },
  {
    id: 6,
    name: "Mike Ross",
    role: "Associate",
    hierarchy: 4,
    accessLabel: "Matter Access",
    practice: "Corporate",
  },
  {
    id: 7,
    name: "Rachel Zane",
    role: "Paralegal",
    hierarchy: 5,
    accessLabel: "Support Access",
    practice: "Client advisory",
  },
  {
    id: 8,
    name: "Benjamin",
    role: "IT Admin",
    hierarchy: 4,
    accessLabel: "Systems Access",
    practice: "Technology",
  },
];
