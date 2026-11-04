import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";

import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { getRouteMeta } from "@/components/navigation/route-meta";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { UserMenu } from "@/components/navigation/user-menu";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui.store";

export function TopBar(): React.ReactElement {
  const location = useLocation();
  const openMobileNav = useUiStore((state) => state.openMobileNav);
  const meta = getRouteMeta(location.pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open navigation"
        onClick={openMobileNav}
        className="size-9 lg:hidden"
      >
        <Menu aria-hidden="true" />
      </Button>

      <Breadcrumbs items={meta.breadcrumbs} />

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
