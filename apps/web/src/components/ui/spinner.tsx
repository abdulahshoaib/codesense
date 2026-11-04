import { Loader2 } from "lucide-react";
import { forwardRef, type SVGProps } from "react";

import { cn } from "@/lib/utils";

export function Spinner({
  className,
  ...props
}: SVGProps<SVGSVGElement>): React.ReactElement {
  return (
    <Loader2
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin text-muted-foreground", className)}
      {...props}
    />
  );
}

export interface FullPageSpinnerProps {
  label?: string;
}

export const FullPageSpinner = forwardRef<HTMLDivElement, FullPageSpinnerProps>(
  function FullPageSpinner({ label = "Loading" }, ref) {
    return (
      <div
        ref={ref}
        className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground"
      >
        <Spinner className="size-6" />
        <span>{label}</span>
      </div>
    );
  }
);
