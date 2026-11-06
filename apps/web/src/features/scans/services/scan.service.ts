import type { CreateScanInput, ScanDTO } from "@codesense/shared";

import { apiClient } from "@/lib/api-client";

export const scanService = {
  listForRepository(repositoryId: string): Promise<ScanDTO[]> {
    return apiClient.get<ScanDTO[]>(`/repositories/${repositoryId}/scans`);
  },

  create(repositoryId: string, input: CreateScanInput): Promise<ScanDTO> {
    return apiClient.post<ScanDTO>(
      `/repositories/${repositoryId}/scans`,
      input
    );
  },

  get(id: string): Promise<ScanDTO> {
    return apiClient.get<ScanDTO>(`/scans/${id}`);
  }
};
