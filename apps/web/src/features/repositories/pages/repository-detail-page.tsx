import type { RepositoryDTO } from "@codesense/shared";
import { ExternalLink, Pencil, Play, ScanSearch, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ErrorState } from "@/components/feedback/error-state";
import { TableSkeleton } from "@/components/feedback/table-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FullPageSpinner } from "@/components/ui/spinner";
import { RepositoryForm } from "@/features/repositories/components/repository-form";
import {
  useDeleteRepository,
  useRepository,
  useUpdateRepository
} from "@/features/repositories/hooks/use-repositories";
import type { RepositoryFormValues } from "@/features/repositories/schemas/repository.schemas";
import { ScanTable } from "@/features/scans/components/scan-table";
import { StartScanDialog } from "@/features/scans/components/start-scan-dialog";
import { useRepositoryScans } from "@/features/scans/hooks/use-scans";
import { getErrorMessage } from "@/lib/api-client";
import { formatDate, formatDateTime } from "@/lib/format";

interface DetailItemProps {
  label: string;
  children: React.ReactNode;
}

function DetailItem({ label, children }: DetailItemProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

function RepositoryDetails({
  repository
}: {
  repository: RepositoryDTO;
}): React.ReactElement {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      <DetailItem label="Repository URL">
        <a
          href={repository.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          <span className="truncate">{repository.url}</span>
          <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
        </a>
      </DetailItem>
      <DetailItem label="Provider">
        <span className="capitalize">{repository.provider}</span>
      </DetailItem>
      <DetailItem label="Default branch">
        <span className="font-mono text-xs">{repository.defaultBranch}</span>
      </DetailItem>
      <DetailItem label="Created">
        <span>{formatDate(repository.createdAt)}</span>
      </DetailItem>
      <DetailItem label="Last updated">
        <span>{formatDateTime(repository.updatedAt)}</span>
      </DetailItem>
      <DetailItem label="Description">
        <span>{repository.description || "—"}</span>
      </DetailItem>
    </dl>
  );
}

export function RepositoryDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const repositoryQuery = useRepository(id);
  const scansQuery = useRepositoryScans(id);
  const updateRepository = useUpdateRepository();
  const deleteRepository = useDeleteRepository();

  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);

  if (repositoryQuery.isLoading) {
    return <FullPageSpinner label="Loading repository" />;
  }

  if (repositoryQuery.isError || !repositoryQuery.data) {
    return (
      <ErrorState
        title="Repository unavailable"
        message={
          repositoryQuery.error
            ? getErrorMessage(repositoryQuery.error)
            : "This repository could not be found."
        }
        onRetry={() => void repositoryQuery.refetch()}
      />
    );
  }

  const repository = repositoryQuery.data;
  const scans = scansQuery.data ?? [];

  const handleUpdate = (values: RepositoryFormValues): void => {
    updateRepository.mutate(
      {
        id: repository.id,
        input: {
          name: values.name,
          url: values.url,
          provider: values.provider,
          defaultBranch: values.defaultBranch,
          description: values.description
        }
      },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  const handleDelete = (): void => {
    deleteRepository.mutate(repository.id, {
      onSuccess: () => navigate("/repositories", { replace: true })
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={repository.name}
        badge={
          <Badge variant="outline" className="capitalize">
            {repository.provider}
          </Badge>
        }
        description={repository.description || undefined}
        actions={
          <>
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil aria-hidden="true" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsDeleting(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 aria-hidden="true" />
              Delete
            </Button>
            <Button onClick={() => setIsScanOpen(true)}>
              <Play aria-hidden="true" />
              Start scan
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Repository information</CardTitle>
          <CardDescription>Metadata stored for this repository.</CardDescription>
        </CardHeader>
        <CardContent>
          <RepositoryDetails repository={repository} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle>Scan history</CardTitle>
            <CardDescription>
              Scan records created for this repository.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setIsScanOpen(true)}>
            <Play aria-hidden="true" />
            Start scan
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Alert variant="info" title="Scan execution not implemented">
            The backend currently creates and stores scan records only. Progress,
            analysis results, and scanning itself are not available yet.
          </Alert>

          {scansQuery.isLoading ? (
            <TableSkeleton columns={5} />
          ) : scansQuery.isError ? (
            <ErrorState
              message={getErrorMessage(scansQuery.error)}
              onRetry={() => void scansQuery.refetch()}
            />
          ) : scans.length === 0 ? (
            <EmptyState
              icon={ScanSearch}
              title="No scans yet"
              description="Create a scan record to track this repository's analysis queue."
              action={
                <Button onClick={() => setIsScanOpen(true)}>
                  <Play aria-hidden="true" />
                  Start scan
                </Button>
              }
            />
          ) : (
            <ScanTable scans={scans} />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isEditing}
        onClose={() => setIsEditing(false)}
        title="Edit repository"
        description="Update the repository metadata stored in CodeSense."
      >
        <RepositoryForm
          defaultValues={{
            name: repository.name,
            url: repository.url,
            provider: repository.provider,
            defaultBranch: repository.defaultBranch,
            description: repository.description ?? ""
          }}
          submitLabel="Save changes"
          isSubmitting={updateRepository.isPending}
          apiError={
            updateRepository.isError
              ? getErrorMessage(updateRepository.error)
              : null
          }
          onSubmit={handleUpdate}
          onCancel={() => setIsEditing(false)}
        />
      </Dialog>

      <ConfirmDialog
        open={isDeleting}
        title="Delete repository"
        description={`This will permanently remove "${repository.name}" and cannot be undone.`}
        confirmLabel="Delete repository"
        destructive
        isConfirming={deleteRepository.isPending}
        error={
          deleteRepository.isError
            ? getErrorMessage(deleteRepository.error)
            : null
        }
        onConfirm={handleDelete}
        onCancel={() => setIsDeleting(false)}
      />

      <StartScanDialog
        open={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        repositories={[repository]}
        fixedRepositoryId={repository.id}
        defaultBranch={repository.defaultBranch}
      />
    </div>
  );
}
