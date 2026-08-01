export interface Project {
  id: number;
  name: string;
  category: string;
  description: string;
  logoUrl: string;
  createdAt: string;
  keyCount: number;
  docCount: number;
}

export interface VaultCredential {
  id: number;
  projectId: number;
  projectName: string | null;
  serviceName: string;
  environment: string;
  secretValue: string;
  ownerEmail: string;
  department: string;
  status: string;
  createdAt: string;
}

export interface ComplianceDocument {
  id: number;
  projectId: number;
  projectName: string | null;
  fileName: string;
  fileSizeBytes: number;
  sha256: string;
  uploadedAt: string;
  uploadedBy: string;
  classification: string;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  action: string;
  actorEmail: string;
  actorRole: string;
  ipAddress: string;
  status: string;
}

export type Pronouns = "SHE_HER" | "HE_HIM" | "THEY_THEM" | "";

export interface Intern {
  id: number;
  internNumber: string;
  fullName: string;
  email: string;
  pronouns: Pronouns;
  position: string;
  department: string;
  startDate: string | null;
  completionDate: string | null;
  employmentStatus: string;
  projectsCompleted: string;
  responsibilities: string;
  skillsDemonstrated: string;
  supervisorName: string;
  supervisorRecommendation: string;
  internalNotes: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  credentialCount?: number;
}

export type InternTaskStatus =
  | "ASSIGNED"
  | "SUBMITTED"
  | "CHANGES_REQUESTED"
  | "APPROVED";

export interface InternTask {
  id: number;
  internId: number;
  title: string;
  description: string;
  status: InternTaskStatus;
  prLink: string;
  reviewNote: string;
  assignedBy: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export type InternCredentialStatus = "DRAFT" | "PUBLISHED" | "REVOKED" | "EXPIRED";

export interface InternCredential {
  id: number;
  internId: number;
  internName: string | null;
  internNumber: string | null;
  credentialNumber: string;
  verificationToken: string;
  programmeTitle: string;
  position: string;
  startDate: string | null;
  completionDate: string | null;
  projectsCompleted: string;
  skillsDemonstrated: string;
  publicRecommendation: string;
  supervisorName?: string | null;
  internEmail?: string | null;
  department: string;
  pronouns: Pronouns;
  responsibilities: string;
  founderName: string;
  founderTitle: string;
  founderRecommendation: string;
  managerName: string;
  managerTitle: string;
  managerRecommendation: string;
  emailSentAt: string | null;
  emailSentTo: string;
  hasCertificatePdf?: boolean;
  hasLetterPdf?: boolean;
  issueDate: string | null;
  status: InternCredentialStatus;
  publishedAt: string | null;
  revokedAt: string | null;
  revocationReason: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalProjects: number;
  totalCredentials: number;
  activeApiKeys: number;
  complianceDocuments: number;
  auditTriggers24h: number;
  unauthorizedAttempts24h: number;
}
