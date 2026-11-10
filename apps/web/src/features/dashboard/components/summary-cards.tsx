import {
  CheckCircle2,
  Clock,
  FolderGit2,
  ScanSearch,
  type LucideIcon
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export interface DashboardStats {
  repositories: number;
  scans: number;
  completed: number;
  pending: number;
}

interface StatCardConfig {
  label: string;
  value: number;
  icon: LucideIcon;
  hint: string;
}

export interface SummaryCardsProps {
  stats: DashboardStats;
}

export function SummaryCards({
  stats
}: SummaryCardsProps): React.ReactElement {
  const items: StatCardConfig[] = [
    {
      label: "Repositories",
      value: stats.repositories,
      icon: FolderGit2,
      hint: "Connected to your workspace"
    },
    {
      label: "Total scans",
      value: stats.scans,
      icon: ScanSearch,
      hint: "Scan records created"
    },
    {
      label: "Completed scans",
      value: stats.completed,
      icon: CheckCircle2,
      hint: "Status completed"
    },
    {
      label: "Pending scans",
      value: stats.pending,
      icon: Clock,
      hint: "Queued or running"
    }
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <Card key={item.label}>
            <CardContent className="flex items-start justify-between gap-3 pt-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {item.label}
                </p>
                <p className="text-xl font-semibold tracking-tight">
                  {item.value}
                </p>
                <p className="text-xs text-muted-foreground">{item.hint}</p>
              </div>
              <span className="flex size-8 items-center justify-center rounded-none bg-muted text-muted-foreground">
                <Icon aria-hidden="true" className="size-4" />
              </span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
