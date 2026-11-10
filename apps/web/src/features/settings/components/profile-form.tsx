import { zodResolver } from "@hookform/resolvers/zod";
import type { PublicUser } from "@codesense/shared";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useUpdateProfile } from "@/features/settings/hooks/use-profile";
import {
  profileFormSchema,
  type ProfileFormValues
} from "@/features/settings/schemas/profile.schemas";
import { getErrorMessage } from "@/lib/api-client";

export interface ProfileFormProps {
  user: PublicUser;
}

export function ProfileForm({ user }: ProfileFormProps): React.ReactElement {
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty }
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: user.name, email: user.email }
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const updated = await updateProfile.mutateAsync(values);
      reset({ name: updated.name, email: updated.email });
    } catch {
      /* error surfaced through the mutation state below */
    }
  });

  const apiError = updateProfile.isError
    ? getErrorMessage(updateProfile.error)
    : null;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      {apiError ? (
        <Alert variant="destructive" title="Unable to update profile">
          {apiError}
        </Alert>
      ) : null}

      {updateProfile.isSuccess && !isDirty ? (
        <Alert variant="success" title="Profile updated">
          Your changes have been saved.
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          id="profile-name"
          label="Display name"
          required
          error={errors.name?.message}
        >
          <Input
            id="profile-name"
            autoComplete="name"
            placeholder="Ada Lovelace"
            invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "profile-name-error" : undefined}
            {...register("name")}
          />
        </FormField>

        <FormField
          id="profile-email"
          label="Email address"
          required
          error={errors.email?.message}
        >
          <Input
            id="profile-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "profile-email-error" : undefined}
            {...register("email")}
          />
        </FormField>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          isLoading={updateProfile.isPending}
          disabled={!isDirty}
        >
          Save changes
        </Button>
      </div>
    </form>
  );
}
