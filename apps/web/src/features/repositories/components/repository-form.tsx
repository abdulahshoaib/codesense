import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input, Select, Textarea } from "@/components/ui/input";
import {
  repositoryFormSchema,
  repositoryProviderOptions,
  type RepositoryFormValues
} from "@/features/repositories/schemas/repository.schemas";

export interface RepositoryFormProps {
  defaultValues?: Partial<RepositoryFormValues>;
  submitLabel: string;
  isSubmitting: boolean;
  apiError?: string | null;
  onSubmit: (values: RepositoryFormValues) => void;
  onCancel?: () => void;
}

const FALLBACK_VALUES: RepositoryFormValues = {
  name: "",
  url: "",
  provider: "github",
  defaultBranch: "main",
  description: ""
};

export function RepositoryForm({
  defaultValues,
  submitLabel,
  isSubmitting,
  apiError,
  onSubmit,
  onCancel
}: RepositoryFormProps): React.ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RepositoryFormValues>({
    resolver: zodResolver(repositoryFormSchema),
    defaultValues: { ...FALLBACK_VALUES, ...defaultValues }
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      {apiError ? (
        <Alert variant="destructive" title="Unable to save repository">
          {apiError}
        </Alert>
      ) : null}

      <FormField
        id="repository-name"
        label="Repository name"
        required
        error={errors.name?.message}
      >
        <Input
          id="repository-name"
          placeholder="codesense"
          invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "repository-name-error" : undefined}
          {...register("name")}
        />
      </FormField>

      <FormField
        id="repository-url"
        label="Repository URL"
        required
        hint="GitHub URL stored as metadata only. OAuth and cloning are not implemented yet."
        error={errors.url?.message}
      >
        <Input
          id="repository-url"
          type="url"
          placeholder="https://github.com/org/repo"
          invalid={Boolean(errors.url)}
          aria-describedby={errors.url ? "repository-url-error" : undefined}
          {...register("url")}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="repository-provider"
          label="Provider"
          required
          error={errors.provider?.message}
        >
          <Select
            id="repository-provider"
            invalid={Boolean(errors.provider)}
            aria-describedby={
              errors.provider ? "repository-provider-error" : undefined
            }
            {...register("provider")}
          >
            {repositoryProviderOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          id="repository-default-branch"
          label="Default branch"
          required
          error={errors.defaultBranch?.message}
        >
          <Input
            id="repository-default-branch"
            placeholder="main"
            invalid={Boolean(errors.defaultBranch)}
            aria-describedby={
              errors.defaultBranch ? "repository-default-branch-error" : undefined
            }
            {...register("defaultBranch")}
          />
        </FormField>
      </div>

      <FormField
        id="repository-description"
        label="Description"
        hint="Optional. Up to 500 characters."
        error={errors.description?.message}
      >
        <Textarea
          id="repository-description"
          placeholder="Short description of the repository"
          invalid={Boolean(errors.description)}
          aria-describedby={
            errors.description ? "repository-description-error" : undefined
          }
          {...register("description")}
        />
      </FormField>

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        ) : null}
        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
