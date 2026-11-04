import { LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Avatar } from "@/components/ui/avatar";
import { Dropdown } from "@/components/ui/dropdown";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { useAuthStore } from "@/stores/auth.store";

export function UserMenu(): React.ReactElement {
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const navigate = useNavigate();

  const name = user?.name ?? "Account";

  return (
    <Dropdown
      align="end"
      triggerLabel="Open user menu"
      triggerClassName="items-center gap-2 rounded-md p-0.5 pr-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      trigger={
        <>
          <Avatar name={name} />
          <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">
            {name}
          </span>
        </>
      }
      items={[
        {
          id: "settings",
          label: "Settings",
          icon: <Settings aria-hidden="true" />,
          onSelect: () => navigate("/settings")
        },
        {
          id: "logout",
          label: "Log out",
          icon: <LogOut aria-hidden="true" />,
          onSelect: logout,
          destructive: true
        }
      ]}
    />
  );
}
