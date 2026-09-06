export interface Project {
  id: number;
  name: string;
  category: string;
  description: string;
  logoUrl: string;
  createdAt: string;
  keyCount: number;
  docCount: number;
  /** True when an analytics database URL is stored for this project. */
  hasAnalyticsDb: boolean;
  /** Hostname of the connected analytics database (never the full URL). */
  analyticsDbHost: string;
}

export interface AnalyticsUser {
  id: string;
  name: string;
  email: string;
  role: string;
  businessName: string | null;
  businessId: string | null;
  createdAt: string | null;
  lastActiveAt: string | null;
  lastSignInAt: string | null;
  lastAction: string | null;
  lastActionAt: string | null;
  actions30d: number;
  actionsTotal: number;
  lastDevice: string | null;
  lastIp: string | null;
}

export interface AnalyticsBusiness {
  id: string;
  name: string;
  /** Bare domain (e.g. "acme.co.za") derived from website_url or user emails; used for the company icon. */
  domain: string | null;
  logoUrl: string | null;
  plan: string | null;
  subscriptionStatus: string | null;
  industry: string | null;
  location: string | null;
  createdAt: string | null;
  userCount: number;
  orderCount: number | null;
  orders30d: number | null;
  lastActiveAt: string | null;
}

export interface AnalyticsActivity {
  id: string;
  at: string;
  userName: string | null;
  userEmail: string | null;
  businessName: string | null;
  action: string;
  entityType: string;
  detail: string;
}

export interface AnalyticsDailyPoint {
  day: string;
  actions: number;
  users: number;
}

export interface AnalyticsActionCount {
  action: string;
  count: number;
}

export interface AnalyticsSummary {
  totalUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  newUsers30d: number;
  businesses: number | null;
  totalOrders: number | null;
  orders30d: number | null;
  actions7d: number | null;
  actions30d: number | null;
  lastActivityAt: string | null;
}

export type ProjectAnalytics =
  | {
      ok: true;
      host: string;
      generatedAt: string;
      notes: string[];
      summary: AnalyticsSummary;
      users: AnalyticsUser[];
      businesses: AnalyticsBusiness[];
      recentActivity: AnalyticsActivity[];
      dailyActivity: AnalyticsDailyPoint[];
      topActions: AnalyticsActionCount[];
    }
  | { ok: false; host: string; generatedAt: string; error: string };

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
  /** Target end of the internship; defaults to 3 months after startDate. */
  plannedEndDate: string | null;
  /** Number of projects the intern should complete (programme default: 3). */
  projectGoal: number;
  /** Count of intern_projects rows with status COMPLETED. */
  projectsDone: number;
  credentialCount?: number;
  documentCount?: number;
}

export type InternProjectStatus = "IN_PROGRESS" | "COMPLETED";

export interface InternProject {
  id: number;
  internId: number;
  title: string;
  description: string;
  link: string;
  status: InternProjectStatus;
  startedAt: string | null;
  completedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type InternDocumentKind =
  | "NDA"
  | "ACCEPTANCE_LETTER"
  | "ID_DOCUMENT"
  | "CV"
  | "OTHER";

export const INTERN_DOCUMENT_KINDS: Record<InternDocumentKind, string> = {
  NDA: "NDA",
  ACCEPTANCE_LETTER: "Acceptance letter",
  ID_DOCUMENT: "ID document",
  CV: "CV / Résumé",
  OTHER: "Other",
};

/** Metadata only — file bytes are streamed by the download route. */
export interface InternDocument {
  id: number;
  internId: number;
  kind: InternDocumentKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  note: string;
  uploadedBy: string;
  uploadedAt: string;
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
