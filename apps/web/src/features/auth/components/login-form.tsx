import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthFooterLink } from "@/features/auth/components/auth-shell";
import { useLogin } from "@/features/auth/hooks/use-auth";
import {
  loginFormSchema,
  type LoginFormValues
} from "@/features/auth/schemas/auth.schemas";
import { getErrorMessage } from "@/lib/api-client";

interface LocationState {
  from?: string;
}

export function LoginForm(): React.ReactElement {
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" }
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
      const from = (location.state as LocationState | null)?.from;
      navigate(from ?? "/dashboard", { replace: true });
    } catch {
      /* error surfaced through the mutation state below */
    }
  });

  const apiError = login.isError ? getErrorMessage(login.error) : null;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {apiError ? (
        <Alert variant="destructive" title="Unable to sign in">
          {apiError}
        </Alert>
      ) : null}

      <FormField
        id="login-email"
        label="Email"
        required
        error={errors.email?.message}
      >
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          {...register("email")}
        />
      </FormField>

      <FormField
        id="login-password"
        label="Password"
        required
        error={errors.password?.message}
      >
        <PasswordInput
          id="login-password"
          autoComplete="current-password"
          placeholder="Enter your password"
          invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "login-password-error" : undefined}
          {...register("password")}
        />
      </FormField>

      <Button type="submit" isLoading={login.isPending} className="w-full">
        Sign in
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <AuthFooterLink
          text="Don't have an account?"
          linkLabel="Create one"
          to="/register"
        />
      </p>
    </form>
  );
}
