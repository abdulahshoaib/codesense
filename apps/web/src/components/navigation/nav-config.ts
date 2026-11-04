import {
  FolderGit2,
  LayoutDashboard,
  ScanSearch,
  Settings,
  type LucideIcon
} from "lucide-react";

export interface NavItemConfig {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const primaryNavItems: NavItemConfig[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/repositories", label: "Repositories", icon: FolderGit2 },
  { to: "/scans", label: "Scans", icon: ScanSearch },
  { to: "/settings", label: "Settings", icon: Settings }
];
