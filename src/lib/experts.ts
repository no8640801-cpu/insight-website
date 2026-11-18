export type Expert = {
  slug: string;
  /** Name shown to customers */
  name: string;
  /** Name EXACTLY as written in the n8n workflow staff list (STAFF / agent prompt) */
  workflowName: string;
  title: string;
  organization?: string;
  tags: string[];
  /** false = no calendar is connected in the n8n workflow yet */
  bookable: boolean;
};

export const EXPERTS: Expert[] = [
  {
    slug: "mohamed-essam",
    name: "Mohamed Essam",
    workflowName: "Mohamed Essam",
    title: "Financial Analyst",
    tags: ["FMVA Certified", "FPAP Certified", "Finance & Investment Graduate"],
    bookable: true,
  },
  {
    slug: "radwa-mostafa",
    name: "Radwa Mostafa",
    workflowName: "Radwa Mostafa",
    title: "Senior Financial Analyst",
    tags: ["FMVA"],
    bookable: true,
  },
  {
    slug: "ibrahim-eissa",
    name: "Ibrahim Eissa",
    workflowName: "Ibrahim Eissa",
    title: "Senior Accountant",
    tags: ["Odoo ERP", "GL, AR & AP", "Project Accounting", "Financial Reporting"],
    bookable: true,
  },
  {
    slug: "mohamed-aboalaa",
    name: "Mohamed Aboalaa",
    workflowName: "Mohamed Aboalaa",
    title: "Senior AP Accountant",
    tags: ["Accounts Payable"],
    // Not in the n8n staff list yet: add him there, then set this to true.
    bookable: false,
  },
  {
    slug: "ahmed-mohamed",
    name: "Ahmed Mohamed",
    workflowName: "Ahmed Mohamed",
    title: "Senior AP Accountant",
    tags: ["MBA", "Finance Professional"],
    bookable: true,
  },
  {
    slug: "carol-farid",
    name: "Carol Farid",
    workflowName: "Carol Farid",
    title: "Senior Data Analyst",
    organization: "Banque Misr",
    tags: ["Data Analysis"],
    bookable: true,
  },
  {
    slug: "eslam-hassan",
    name: "Eslam Hassan",
    workflowName: "Eslam Hassan",
    title: "Senior Data Analyst",
    organization: "Aman Egypt",
    tags: ["Data Analysis"],
    bookable: true,
  },
  {
    slug: "moustafa-abutaleb",
    name: "Moustafa Abutaleb",
    workflowName: "Moustafa Abutaleb",
    title: "Senior Fraud Analyst",
    tags: [
      "Fraud Detection",
      "Prevention & Investigations",
      "Risk Mitigation",
      "Data Analysis",
    ],
    bookable: true,
  },
  {
    slug: "mohamed-tarek",
    name: "Mohamed Tarek",
    workflowName: "Mohamed Tarek",
    title: "Fraud Risk Analyst",
    organization: "Banque Misr",
    tags: [
      "Digital Banking & E-Payments",
      "Fraud Detection & Investigation",
      "Transaction Monitoring",
    ],
    bookable: true,
  },
];

export function getExpert(slug: string) {
  return EXPERTS.find((expert) => expert.slug === slug);
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export const SERVICES = ["Expert Consultation", "Analysis Review"] as const;
export type Service = (typeof SERVICES)[number];
