import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";

export function RegisterPage(): React.ReactElement {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Start analyzing your repositories with CodeSense."
    >
      <RegisterForm />
    </AuthShell>
  );
}
