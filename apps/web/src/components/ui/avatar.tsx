import { cn, getInitials } from "@/lib/utils";

export interface AvatarProps {
  name: string;
  className?: string;
}

export function Avatar({ name, className }: AvatarProps): React.ReactElement {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-none bg-primary/10 text-xs font-semibold text-primary",
        className
      )}
    >
      {getInitials(name)}
    </span>
  );
}
