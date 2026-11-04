import { Code2 } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";

export interface BrandProps {
  to?: string;
  showWordmark?: boolean;
  className?: string;
}

export function Brand({
  to = "/dashboard",
  showWordmark = true,
  className
}: BrandProps): React.ReactElement {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center gap-2 text-foreground transition-opacity hover:opacity-90",
        className
      )}
    >
      <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Code2 aria-hidden="true" className="size-4" />
      </span>
      {showWordmark ? (
        <span className="text-base font-semibold tracking-tight">
          CodeSense
        </span>
      ) : null}
    </Link>
  );
}
