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
      <img
        src="/codesense.png"
        alt=""
        aria-hidden="true"
        width={32}
        height={32}
        className="size-7 shrink-0"
      />
      {showWordmark ? (
        <span className="text-[0.9375rem] font-semibold tracking-tight">
          CodeSense
        </span>
      ) : null}
    </Link>
  );
}
