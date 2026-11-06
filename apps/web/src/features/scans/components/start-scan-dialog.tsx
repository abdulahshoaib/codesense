import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateScanInput, RepositoryDTO } from "@codesense/shared";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input, Select } from "@/components/ui/input";
import { useCreateScan } from "@/features/scans/hooks/use-scans";
import {
  scanFormSchema,
  type ScanFormValues
} from "@/features/scans/schemas/scan.schemas";
import { getErrorMessage } from "@/lib/api-client";

export interface StartScanDialogProps {
  open: boolean;
  onClose: () => void;
  repositories: RepositoryDTO[];
  fixedRepositoryId?: string;
  defaultBranch?: string;
}

export function StartScanDialog({
  open,
  onClose,
  repositories,
  fixedRepositoryId,
  defaultBranch
}: StartScanDialogProps): React.ReactElement {
  const createScan = useCreateScan();
  const [repositoryId, setRepositoryId] = useState(
    fixedRepositoryId ?? repositories[0]?.id ?? ""
  );
  const [repositoryError, setRepositoryError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ScanFormValues>({
    resolver: zodResolver(scanFormSchema),
    defaultValues: { branch: defaultBranch ?? "main", commitHash: "" }
  });

  useEffect(() => {
    if (open) {
      setRepositoryId(fixedRepositoryId ?? repositories[0]?.id ?? "");
      setRepositoryError(null);
      reset({ branch: defaultBranch ?? "main", commitHash: "" });
    }
  }, [open, fixedRepositoryId, repositories, defaultBranch, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!repositoryId) {
      setRepositoryError("Select a repository");
      return;
    }

    setRepositoryError(null);
    const payload: CreateScanInput = {
      branch: values.branch,
      ...(values.commitHash ? { commitHash: values.commitHash } : {})
    };

    try {
      await createScan.mutateAsync({ repositoryId, input: payload });
      onClose();
    } catch {
      /* error surfaced through the mutation state below */
    }
  });

  const apiError = createScan.isError
    ? getErrorMessage(createScan.error)
    : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Start a scan"
      description="Creates a scan record for the selected repository. Scan execution is not implemented yet."
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {apiError ? (
          <Alert variant="destructive" title="Unable to create scan">
            {apiError}
          </Alert>
        ) : null}

        {fixedRepositoryId ? null : (
          <FormField
            id="scan-repository"
            label="Repository"
            required
            error={repositoryError ?? undefined}
          >
            <Select
              id="scan-repository"
              value={repositoryId}
              invalid={Boolean(repositoryError)}
              onChange={(event) => setRepositoryId(event.target.value)}
            >
              <option value="" disabled>
                Select a repository
              </option>
              {repositories.map((repository) => (
                <option key={repository.id} value={repository.id}>
                  {repository.name}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        <FormField
          id="scan-branch"
          label="Branch"
          required
          error={errors.branch?.message}
        >
          <Input
            id="scan-branch"
            placeholder="main"
            invalid={Boolean(errors.branch)}
            aria-describedby={errors.branch ? "scan-branch-error" : undefined}
            {...register("branch")}
          />
        </FormField>

        <FormField
          id="scan-commit"
          label="Commit hash"
          hint="Optional. 7-40 hex characters."
          error={errors.commitHash?.message}
        >
          <Input
            id="scan-commit"
            placeholder="a1b2c3d"
            invalid={Boolean(errors.commitHash)}
            aria-describedby={
              errors.commitHash ? "scan-commit-error" : undefined
            }
            {...register("commitHash")}
          />
        </FormField>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={createScan.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={createScan.isPending}>
            Create scan
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
