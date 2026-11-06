import type { ScanDTO } from "@codesense/shared";

import { ScanStatusBadge } from "@/components/feedback/scan-status-badge";
import { Badge } from "@/components/ui/badge";

export interface RepositoryStatusProps {
  scans: ScanDTO[] | undefined;
}

export function RepositoryStatus({
  scans
}: RepositoryStatusProps): React.ReactElement {
  const latest = scans?.[0];

  if (!latest) {
    return <Badge variant="outline">Not scanned</Badge>;
  }

  return <ScanStatusBadge status={latest.status} />;
}
