import type { RepositoryDTO, ScanDTO } from "@codesense/shared";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Dropdown } from "@/components/ui/dropdown";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { RepositoryStatus } from "@/features/repositories/components/repository-status";
import { formatRelativeTime } from "@/lib/format";

export interface RepositoryTableProps {
  repositories: RepositoryDTO[];
  scansByRepository?: Map<string, ScanDTO[]>;
  onEdit: (repository: RepositoryDTO) => void;
  onDelete: (repository: RepositoryDTO) => void;
}

export function RepositoryTable({
  repositories,
  scansByRepository,
  onEdit,
  onDelete
}: RepositoryTableProps): React.ReactElement {
  const navigate = useNavigate();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Repository</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead>Default branch</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="w-12 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {repositories.map((repository) => (
          <TableRow key={repository.id}>
            <TableCell className="max-w-xs">
              <Link
                to={`/repositories/${repository.id}`}
                className="block truncate font-medium text-foreground hover:text-primary hover:underline"
              >
                {repository.name}
              </Link>
              <span className="block truncate text-xs text-muted-foreground">
                {repository.url}
              </span>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="capitalize">
                {repository.provider}
              </Badge>
            </TableCell>
            <TableCell className="font-mono text-xs">
              {repository.defaultBranch}
            </TableCell>
            <TableCell>
              <RepositoryStatus scans={scansByRepository?.get(repository.id)} />
            </TableCell>
            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
              {formatRelativeTime(repository.updatedAt)}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end">
                <Dropdown
                  align="end"
                  triggerLabel={`Actions for ${repository.name}`}
                  triggerClassName="size-7 items-center justify-center rounded-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  trigger={<MoreHorizontal aria-hidden="true" className="size-4" />}
                  items={[
                    {
                      id: "view",
                      label: "View details",
                      icon: <Eye aria-hidden="true" />,
                      onSelect: () => navigate(`/repositories/${repository.id}`)
                    },
                    {
                      id: "edit",
                      label: "Edit",
                      icon: <Pencil aria-hidden="true" />,
                      onSelect: () => onEdit(repository)
                    },
                    {
                      id: "delete",
                      label: "Delete",
                      icon: <Trash2 aria-hidden="true" />,
                      onSelect: () => onDelete(repository),
                      destructive: true
                    }
                  ]}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
