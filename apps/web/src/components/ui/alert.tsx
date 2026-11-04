import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  type LucideIcon
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type AlertVariant = "info" | "success" | "warning" | "destructive";

const variantConfig: Record<
  AlertVariant,
  { classes: string; icon: LucideIcon; iconClass: string }
> = {
  info: {
    classes: "border-border bg-muted text-foreground",
    icon: Info,
    iconClass: "text-primary"
  },
  success: {
    classes: "border-success/30 bg-success/10 text-foreground",
    icon: CheckCircle2,
    iconClass: "text-success"
  },
  warning: {
    classes: "border-warning/30 bg-warning/10 text-foreground",
    icon: AlertTriangle,
    iconClass: "text-warning"
  },
  destructive: {
    classes: "border-destructive/30 bg-destructive/10 text-foreground",
    icon: XCircle,
    iconClass: "text-destructive"
  }
};

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  icon?: LucideIcon;
  children?: ReactNode;
}

export function Alert({
  className,
  variant = "info",
  title,
  icon,
  children,
  ...props
}: AlertProps): React.ReactElement {
  const config = variantConfig[variant];
  const Icon = icon ?? config.icon;

  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 rounded-md border p-3 text-sm",
        config.classes,
        className
      )}
      {...props}
    >
      <Icon
        aria-hidden="true"
        className={cn("mt-0.5 size-4 shrink-0", config.iconClass)}
      />
      <div className="flex flex-col gap-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className="text-muted-foreground">{children}</div> : null}
      </div>
    </div>
  );
}
