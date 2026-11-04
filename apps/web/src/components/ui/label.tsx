import { forwardRef, type LabelHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { className, children, required, ...props },
  ref
) {
  return (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium leading-none text-foreground",
        className
      )}
      {...props}
    >
      {children}
      {required ? (
        <span aria-hidden="true" className="ml-0.5 text-destructive">
          *
        </span>
      ) : null}
    </label>
  );
});

export interface FieldErrorProps {
  id?: string;
  message?: string;
}

export function FieldError({
  id,
  message
}: FieldErrorProps): React.ReactElement | null {
  if (!message) {
    return null;
  }

  return (
    <p id={id} role="alert" className="text-xs font-medium text-destructive">
      {message}
    </p>
  );
}
