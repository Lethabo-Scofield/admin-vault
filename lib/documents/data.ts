import type { InternCredential } from "@/lib/types";
import { verificationUrl } from "@/lib/verification";

/** Everything the deterministic document templates need. */
export interface DocumentData {
  fullName: string;
  position: string;
  department: string;
  programmeTitle: string;
  pronouns: string;
  startDate: string | null;
  completionDate: string | null;
  issueDate: string | null;
  projectsAndResponsibilities: string;
  skillsDemonstrated: string;
  founderName: string;
  founderTitle: string;
  founderRecommendation: string;
  managerName: string;
  managerTitle: string;
  managerRecommendation: string;
  credentialCode: string; // OLX-CERT-YYYY-NNNN-token (public credential number)
  verifyUrl: string;
}

export function documentDataFromCredential(c: InternCredential): DocumentData {
  const projects = [c.projectsCompleted, c.responsibilities]
    .map((s) => String(s ?? "").trim())
    .filter(Boolean)
    .join("\n");
  return {
    fullName: c.internName ?? "",
    position: c.position,
    department: c.department,
    programmeTitle: c.programmeTitle,
    pronouns: c.pronouns,
    startDate: c.startDate,
    completionDate: c.completionDate,
    issueDate: c.issueDate,
    projectsAndResponsibilities: projects,
    skillsDemonstrated: c.skillsDemonstrated,
    founderName: c.founderName,
    founderTitle: c.founderTitle,
    founderRecommendation: c.founderRecommendation,
    managerName: c.managerName,
    managerTitle: c.managerTitle,
    managerRecommendation: c.managerRecommendation,
    credentialCode: `${c.credentialNumber}-${c.verificationToken}`,
    verifyUrl: verificationUrl(c),
  };
}
