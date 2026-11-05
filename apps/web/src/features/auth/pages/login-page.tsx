import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";

export function LoginPage(): React.ReactElement {
  return (
    <AuthShell
      title="Sign in to CodeSense"
      subtitle="Access your repositories, scans, and workspace insights."
    >
      <LoginForm />
    </AuthShell>
  );
}
