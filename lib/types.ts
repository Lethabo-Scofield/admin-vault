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

export interface DashboardStats {
  totalProjects: number;
  totalCredentials: number;
  activeApiKeys: number;
  complianceDocuments: number;
  auditTriggers24h: number;
  unauthorizedAttempts24h: number;
}
