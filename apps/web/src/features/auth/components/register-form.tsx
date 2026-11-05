import { zodResolver } from "@hookform/resolvers/zod";
import type { RegisterInput } from "@codesense/shared";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthFooterLink } from "@/features/auth/components/auth-shell";
import { useRegister } from "@/features/auth/hooks/use-auth";
import {
  registerFormSchema,
  type RegisterFormValues
} from "@/features/auth/schemas/auth.schemas";
import { getErrorMessage } from "@/lib/api-client";

export function RegisterForm(): React.ReactElement {
  const registerMutation = useRegister();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    const payload: RegisterInput = {
      name: values.name,
      email: values.email,
      password: values.password
    };

    try {
      await registerMutation.mutateAsync(payload);
      navigate("/dashboard", { replace: true });
    } catch {
      /* error surfaced through the mutation state below */
    }
  });

  const apiError = registerMutation.isError
    ? getErrorMessage(registerMutation.error)
    : null;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {apiError ? (
        <Alert variant="destructive" title="Unable to create account">
          {apiError}
        </Alert>
      ) : null}

      <FormField
        id="register-name"
        label="Name"
        required
        error={errors.name?.message}
      >
        <Input
          id="register-name"
          autoComplete="name"
          placeholder="Ada Lovelace"
          invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "register-name-error" : undefined}
          {...register("name")}
        />
      </FormField>

      <FormField
        id="register-email"
        label="Email"
        required
        error={errors.email?.message}
      >
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "register-email-error" : undefined}
          {...register("email")}
        />
      </FormField>

      <FormField
        id="register-password"
        label="Password"
        required
        hint="At least 8 characters."
        error={errors.password?.message}
      >
        <PasswordInput
          id="register-password"
          autoComplete="new-password"
          placeholder="Create a password"
          invalid={Boolean(errors.password)}
          aria-describedby={
            errors.password ? "register-password-error" : undefined
          }
          {...register("password")}
        />
      </FormField>

      <FormField
        id="register-confirm-password"
        label="Confirm password"
        required
        error={errors.confirmPassword?.message}
      >
        <PasswordInput
          id="register-confirm-password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          invalid={Boolean(errors.confirmPassword)}
          aria-describedby={
            errors.confirmPassword
              ? "register-confirm-password-error"
              : undefined
          }
          {...register("confirmPassword")}
        />
      </FormField>

      <Button
        type="submit"
        isLoading={registerMutation.isPending}
        className="w-full"
      >
        Create account
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <AuthFooterLink
          text="Already have an account?"
          linkLabel="Sign in"
          to="/login"
        />
      </p>
    </form>
  );
}
