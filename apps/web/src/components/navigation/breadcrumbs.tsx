import { Link } from "react-router-dom";

import type { BreadcrumbItem } from "@/components/navigation/route-meta";

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({
  items
}: BreadcrumbsProps): React.ReactElement | null {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={isLast ? "font-medium text-foreground" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <span aria-hidden="true" className="text-muted-foreground/60">
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
