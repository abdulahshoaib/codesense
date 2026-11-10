import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { NavLink } from "react-router-dom";

import { Brand } from "@/components/layout/brand";
import { primaryNavItems } from "@/components/navigation/nav-config";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui.store";

interface SidebarNavLinkProps {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  collapsed: boolean;
  onNavigate?: () => void;
}

function SidebarNavLink({
  to,
  label,
  icon: Icon,
  collapsed,
  onNavigate
}: SidebarNavLinkProps): React.ReactElement {
  const link = (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group relative flex w-full items-center gap-2.5 rounded-none px-2.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          collapsed && "justify-center",
          isActive
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <span
              aria-hidden="true"
              className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-none bg-primary"
            />
          ) : null}
          <Icon className="size-4 shrink-0" />
          {collapsed ? null : <span className="truncate">{label}</span>}
        </>
      )}
    </NavLink>
  );

  if (!collapsed) {
    return link;
  }

  return (
    <Tooltip content={label} side="bottom" className="w-full">
      {link}
    </Tooltip>
  );
}

interface SidebarContentProps {
  collapsed: boolean;
  showCloseButton?: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
}

function SidebarContent({
  collapsed,
  showCloseButton = false,
  onNavigate,
  onClose
}: SidebarContentProps): React.ReactElement {
  const toggleCollapsed = useUiStore((state) => state.toggleSidebarCollapsed);

  return (
    <>
      <div
        className={cn(
          "flex h-12 shrink-0 items-center border-b border-border px-3",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        <Brand showWordmark={!collapsed} />
        {showCloseButton ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close navigation"
            onClick={onClose}
            className="size-8"
          >
            <X aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      <nav aria-label="Primary" className="flex flex-1 flex-col gap-0.5 px-2 py-1.5">
        {primaryNavItems.map((item) => (
          <SidebarNavLink
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="shrink-0 border-t border-border px-2 py-1.5">
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={toggleCollapsed}
          className={cn(
            "w-full text-muted-foreground hover:text-foreground",
            collapsed ? "justify-center" : "justify-start gap-2.5"
          )}
        >
          {collapsed ? (
            <PanelLeftOpen aria-hidden="true" />
          ) : (
            <PanelLeftClose aria-hidden="true" />
          )}
          {collapsed ? null : "Collapse"}
        </Button>
      </div>
    </>
  );
}

export function Sidebar(): React.ReactElement {
  const collapsed = useUiStore((state) => state.isSidebarCollapsed);
  const isMobileOpen = useUiStore((state) => state.isMobileNavOpen);
  const closeMobileNav = useUiStore((state) => state.closeMobileNav);

  return (
    <>
      <aside
        className={cn(
          "hidden h-full shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 lg:flex",
          collapsed ? "w-14" : "w-56"
        )}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <div
            className="absolute inset-0 bg-black/50"
            aria-hidden="true"
            onClick={closeMobileNav}
          />
          <aside className="relative z-10 flex h-full w-56 flex-col border-r border-border bg-card">
            <SidebarContent
              collapsed={false}
              showCloseButton
              onNavigate={closeMobileNav}
              onClose={closeMobileNav}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}
