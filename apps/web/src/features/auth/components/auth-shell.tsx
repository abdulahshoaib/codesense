import { Link } from "react-router-dom";

import { Brand } from "@/components/layout/brand";
import type { ReactNode } from "react";

export interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer
}: AuthShellProps): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex justify-center">
          <Brand to="/login" />
        </div>
        <div className="rounded-none border border-border bg-card p-5 shadow-xs">
          <div className="mb-5 flex flex-col gap-1">
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </div>
        {footer ? (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AuthFooterLink({
  text,
  linkLabel,
  to
}: {
  text: string;
  linkLabel: string;
  to: string;
}): React.ReactElement {
  return (
    <span>
      {text}{" "}
      <Link to={to} className="font-medium text-primary hover:underline">
        {linkLabel}
      </Link>
    </span>
  );
}
