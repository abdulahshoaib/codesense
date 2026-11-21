import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateScanInput, RepositoryDTO } from "@codesense/shared";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/input";
import { useBranches } from "@/features/repositories/hooks/use-repositories";
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
  const navigate = useNavigate();
  const [repositoryId, setRepositoryId] = useState(
    fixedRepositoryId ?? repositories[0]?.id ?? ""
  );
  const [repositoryError, setRepositoryError] = useState<string | null>(null);

  const branchesQuery = useBranches(repositoryId || undefined);
  const branches = branchesQuery.data ?? [];

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<ScanFormValues>({
    resolver: zodResolver(scanFormSchema),
    defaultValues: { branch: "" }
  });

  useEffect(() => {
    if (open) {
      setRepositoryId(fixedRepositoryId ?? repositories[0]?.id ?? "");
      setRepositoryError(null);
    }
  }, [open, fixedRepositoryId, repositories]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const preferred =
      defaultBranch && branches.some((branch) => branch.name === defaultBranch)
        ? defaultBranch
        : branches[0]?.name ?? "";

    setValue("branch", preferred, { shouldValidate: false });
  }, [open, defaultBranch, repositoryId, branches, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    if (!repositoryId) {
      setRepositoryError("Select a repository");
      return;
    }

    setRepositoryError(null);
    const payload: CreateScanInput = { branch: values.branch };

    try {
      const scan = await createScan.mutateAsync({ repositoryId, input: payload });
      navigate(`/scans/${scan.id}`);
    } catch {
      /* error surfaced through the mutation state below */
    }
  });

  const apiError = createScan.isError
    ? getErrorMessage(createScan.error)
    : null;
  const branchesError = branchesQuery.isError
    ? getErrorMessage(branchesQuery.error)
    : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Start a scan"
      description="Queues a scan for the latest commit on the selected branch."
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
              onChange={(event) => {
                setRepositoryId(event.target.value);
                setValue("branch", "", { shouldValidate: false });
              }}
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
          hint={
            branchesQuery.isLoading
              ? "Loading branches..."
              : "Scan runs on the latest commit of this branch."
          }
          error={errors.branch?.message ?? branchesError ?? undefined}
        >
          <Controller
            name="branch"
            control={control}
            render={({ field }) => (
              <Select
                id="scan-branch"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                invalid={Boolean(errors.branch) || Boolean(branchesError)}
                disabled={branchesQuery.isLoading || branches.length === 0}
              >
                <option value="" disabled>
                  {branchesQuery.isLoading
                    ? "Loading branches..."
                    : "Select a branch"}
                </option>
                {branches.map((branch) => (
                  <option key={branch.name} value={branch.name}>
                    {branch.name}
                  </option>
                ))}
              </Select>
            )}
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
          <Button
            type="submit"
            isLoading={createScan.isPending}
            disabled={branchesQuery.isLoading || branches.length === 0}
          >
            Create scan
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
