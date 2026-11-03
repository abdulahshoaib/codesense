export type ScanStatus = "queued" | "running" | "completed" | "failed";

export interface ScanDTO {
  id: string;
  repositoryId: string;
  ownerId: string;
  branch: string;
  commitHash?: string;
  status: ScanStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}
