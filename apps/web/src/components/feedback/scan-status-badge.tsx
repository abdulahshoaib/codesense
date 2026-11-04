import type { ScanStatus } from "@codesense/shared";
import {
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
  type LucideIcon
} from "lucide-react";

import { Badge, type BadgeVariant } from "@/components/ui/badge";

interface StatusConfig {
  label: string;
  variant: BadgeVariant;
  icon: LucideIcon;
  spin?: boolean;
}

const statusConfig: Record<ScanStatus, StatusConfig> = {
  queued: { label: "Queued", variant: "secondary", icon: Clock },
  running: { label: "Running", variant: "default", icon: Loader2, spin: true },
  completed: { label: "Completed", variant: "success", icon: CheckCircle2 },
  failed: { label: "Failed", variant: "destructive", icon: XCircle }
};

export interface ScanStatusBadgeProps {
  status: ScanStatus;
}

export function ScanStatusBadge({
  status
}: ScanStatusBadgeProps): React.ReactElement {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant}>
      <Icon
        aria-hidden="true"
        className={config.spin ? "size-3 animate-spin" : "size-3"}
      />
      {config.label}
    </Badge>
  );
}
