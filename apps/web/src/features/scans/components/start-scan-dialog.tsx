import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateScanInput, LlmProvider, RepositoryDTO } from "@codesense/shared";
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
import { useLlmModels } from "@/features/settings/hooks/use-llm";
import { getErrorMessage } from "@/lib/api-client";

function toLlmValue(provider: LlmProvider, modelId: string): string {
  return `${provider}:${modelId}`;
}

function parseLlmValue(
  value: string
): { provider: LlmProvider; modelId: string } | null {
  const [provider, modelId] = value.split(":");

  if (
    (provider === "groq" || provider === "openrouter") &&
    modelId &&
    modelId.length > 0
  ) {
    return { provider, modelId };
  }

  return null;
}

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

  const llmModelsQuery = useLlmModels();
  const models = llmModelsQuery.data?.models ?? [];
  const [llmValue, setLlmValue] = useState("");

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

  useEffect(() => {
    const data = llmModelsQuery.data;

    if (!data) {
      return;
    }

    const defaultModel =
      data.models.find((model) => model.default === true) ?? data.models[0];
    const initial = data.preference ?? defaultModel;

    if (initial) {
      setLlmValue(toLlmValue(initial.provider, initial.modelId));
    }
  }, [llmModelsQuery.data]);

  const onSubmit = handleSubmit(async (values) => {
    if (!repositoryId) {
      setRepositoryError("Select a repository");
      return;
    }

    setRepositoryError(null);
    const llm = parseLlmValue(llmValue);
    const payload: CreateScanInput = {
      branch: values.branch,
      ...(llm ? { llm } : {})
    };

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

        <FormField
          id="scan-llm"
          label="AI model"
          hint="Optional. Defaults to your saved preference."
        >
          <Select
            id="scan-llm"
            value={llmValue}
            onChange={(event) => setLlmValue(event.target.value)}
            disabled={models.length === 0}
          >
            {(["groq", "openrouter"] as LlmProvider[]).map((provider) => {
              const providerModels = models.filter(
                (model) => model.provider === provider
              );

              if (providerModels.length === 0) {
                return null;
              }

              return (
                <optgroup
                  key={provider}
                  label={provider === "groq" ? "Groq" : "OpenRouter"}
                >
                  {providerModels.map((model) => (
                    <option
                      key={model.modelId}
                      value={toLlmValue(model.provider, model.modelId)}
                    >
                      {model.label}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </Select>
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
