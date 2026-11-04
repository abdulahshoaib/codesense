import { LogOut, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { NavLink } from "react-router-dom";

import { Brand } from "@/components/layout/brand";
import { primaryNavItems } from "@/components/navigation/nav-config";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
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
          "group relative flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          collapsed ? "justify-center px-2" : "px-3",
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
              className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary"
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
    <Tooltip content={label} side="bottom">
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
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const toggleCollapsed = useUiStore((state) => state.toggleSidebarCollapsed);

  return (
    <>
      <div
        className={cn(
          "flex h-14 items-center border-b border-border px-3",
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
        ) : collapsed ? null : (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Collapse sidebar"
            onClick={toggleCollapsed}
            className="hidden size-8 lg:inline-flex"
          >
            <PanelLeftClose aria-hidden="true" />
          </Button>
        )}
      </div>

      {collapsed ? (
        <div className="hidden justify-center px-2 py-2 lg:flex">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Expand sidebar"
            onClick={toggleCollapsed}
            className="size-8"
          >
            <PanelLeftOpen aria-hidden="true" />
          </Button>
        </div>
      ) : null}

      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 p-2">
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

      <div className="border-t border-border p-2">
        <div
          className={cn(
            "flex items-center gap-3 rounded-md px-1.5 py-1.5",
            collapsed && "justify-center px-0"
          )}
        >
          <Avatar name={user?.name ?? "Account"} />
          {collapsed ? null : (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {user?.name ?? "Account"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email ?? ""}
              </p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          onClick={logout}
          aria-label="Log out"
          className={cn(
            "mt-1 text-muted-foreground hover:text-foreground",
            collapsed ? "w-full" : "w-full justify-start gap-3 px-3"
          )}
        >
          <LogOut aria-hidden="true" />
          {collapsed ? null : "Log out"}
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
          "sticky top-0 hidden h-svh shrink-0 flex-col border-r border-border bg-card/40 transition-[width] duration-200 lg:flex",
          collapsed ? "w-16" : "w-60"
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
          <aside className="relative z-10 flex h-full w-64 flex-col border-r border-border bg-card">
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
