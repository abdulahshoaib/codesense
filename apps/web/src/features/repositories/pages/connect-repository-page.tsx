import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { RepositoryForm } from "@/features/repositories/components/repository-form";
import { useCreateRepository } from "@/features/repositories/hooks/use-repositories";
import type { RepositoryFormValues } from "@/features/repositories/schemas/repository.schemas";
import { getErrorMessage } from "@/lib/api-client";

export function ConnectRepositoryPage(): React.ReactElement {
  const createRepository = useCreateRepository();
  const navigate = useNavigate();

  const handleSubmit = (values: RepositoryFormValues): void => {
    createRepository.mutate(
      {
        name: values.name,
        url: values.url,
        provider: values.provider,
        defaultBranch: values.defaultBranch,
        description: values.description
      },
      {
        onSuccess: (repository) => {
          navigate(`/repositories/${repository.id}`, { replace: true });
        }
      }
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Connect repository"
        description="Add repository metadata to CodeSense. GitHub OAuth, cloning, and scanning are not implemented yet."
      />

      <Card className="max-w-2xl">
        <CardContent className="pt-5">
          <RepositoryForm
            submitLabel="Connect repository"
            isSubmitting={createRepository.isPending}
            apiError={
              createRepository.isError
                ? getErrorMessage(createRepository.error)
                : null
            }
            onSubmit={handleSubmit}
            onCancel={() => navigate("/repositories")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
