import type {
  RepositoryDTO,
  UpdateRepositoryInput
} from "@codesense/shared";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { ErrorState } from "@/components/feedback/error-state";
import { TableSkeleton } from "@/components/feedback/table-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { RepositoryForm } from "@/features/repositories/components/repository-form";
import { RepositoryTable } from "@/features/repositories/components/repository-table";
import {
  useDeleteRepository,
  useRepositories,
  useUpdateRepository
} from "@/features/repositories/hooks/use-repositories";
import type { RepositoryFormValues } from "@/features/repositories/schemas/repository.schemas";
import { useAllScans } from "@/features/scans/hooks/use-scans";
import { getErrorMessage } from "@/lib/api-client";

function toRepositoryInput(
  values: RepositoryFormValues
): UpdateRepositoryInput {
  return {
    name: values.name,
    url: values.url,
    provider: values.provider,
    defaultBranch: values.defaultBranch,
    description: values.description
  };
}

export function RepositoriesPage(): React.ReactElement {
  const repositoriesQuery = useRepositories();
  const { scansByRepository } = useAllScans();
  const updateRepository = useUpdateRepository();
  const deleteRepository = useDeleteRepository();
  const navigate = useNavigate();

  const [editing, setEditing] = useState<RepositoryDTO | null>(null);
  const [deleting, setDeleting] = useState<RepositoryDTO | null>(null);

  const repositories = repositoriesQuery.data ?? [];

  const handleUpdate = (values: RepositoryFormValues): void => {
    if (!editing) {
      return;
    }

    updateRepository.mutate(
      { id: editing.id, input: toRepositoryInput(values) },
      { onSuccess: () => setEditing(null) }
    );
  };

  const handleDelete = (): void => {
    if (!deleting) {
      return;
    }

    deleteRepository.mutate(deleting.id, {
      onSuccess: () => setDeleting(null)
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Repositories"
        description="Repositories connected to your CodeSense workspace."
        actions={
          <Button onClick={() => navigate("/repositories/connect")}>
            <Plus aria-hidden="true" />
            Connect repository
          </Button>
        }
      />

      {repositoriesQuery.isLoading ? (
        <TableSkeleton columns={6} />
      ) : repositoriesQuery.isError ? (
        <ErrorState
          message={getErrorMessage(repositoriesQuery.error)}
          onRetry={() => void repositoriesQuery.refetch()}
        />
      ) : repositories.length === 0 ? (
        <EmptyState
          title="No repositories yet"
          description="Connect your first repository to start tracking scans and insights."
          action={
            <Button onClick={() => navigate("/repositories/connect")}>
              <Plus aria-hidden="true" />
              Connect repository
            </Button>
          }
        />
      ) : (
        <RepositoryTable
          repositories={repositories}
          scansByRepository={scansByRepository}
          onEdit={setEditing}
          onDelete={setDeleting}
        />
      )}

      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit repository"
        description="Update the repository metadata stored in CodeSense."
      >
        {editing ? (
          <RepositoryForm
            defaultValues={{
              name: editing.name,
              url: editing.url,
              provider: editing.provider,
              defaultBranch: editing.defaultBranch,
              description: editing.description ?? ""
            }}
            submitLabel="Save changes"
            isSubmitting={updateRepository.isPending}
            apiError={
              updateRepository.isError
                ? getErrorMessage(updateRepository.error)
                : null
            }
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete repository"
        description={`This will permanently remove "${
          deleting?.name ?? ""
        }" and cannot be undone.`}
        confirmLabel="Delete repository"
        destructive
        isConfirming={deleteRepository.isPending}
        error={
          deleteRepository.isError
            ? getErrorMessage(deleteRepository.error)
            : null
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
