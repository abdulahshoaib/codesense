import { Compass } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";

export function NotFoundPage(): React.ReactElement {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <Brand to="/dashboard" />
      <span className="flex size-12 items-center justify-center rounded-none bg-muted text-muted-foreground">
        <Compass aria-hidden="true" className="size-6" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The page you are looking for does not exist or may have been moved.
        </p>
      </div>
      <Button onClick={() => navigate("/dashboard")}>Back to overview</Button>
    </div>
  );
}
