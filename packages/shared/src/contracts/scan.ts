export type ScanStatus = "queued" | "running" | "completed" | "failed";

export interface LanguageSummary {
  name: string;
  files: number;
  lines: number;
}

export interface DependencySummary {
  ecosystem: string;
  name: string;
  version?: string;
}

export interface ScanSummary {
  files: number;
  linesOfCode: number;
  languages: LanguageSummary[];
  dependencies: DependencySummary[];
}

export interface ScanDTO {
  id: string;
  repositoryId: string;
  ownerId: string;
  branch: string;
  commitHash?: string;
  committedAt?: string;
  status: ScanStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  summary?: ScanSummary;
  aiSummary?: string;
  createdAt: string;
  updatedAt: string;
}
