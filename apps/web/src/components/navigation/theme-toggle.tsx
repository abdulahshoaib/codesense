import { Moon, Monitor, Sun, type LucideIcon } from "lucide-react";

import { Dropdown } from "@/components/ui/dropdown";
import {
  useThemeStore,
  type ThemePreference
} from "@/stores/theme.store";

const options: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor }
];

export function ThemeToggle(): React.ReactElement {
  const preference = useThemeStore((state) => state.preference);
  const isDark = useThemeStore((state) => state.isDark);
  const setPreference = useThemeStore((state) => state.setPreference);

  const TriggerIcon = isDark ? Moon : Sun;

  return (
    <Dropdown
      align="end"
      triggerLabel="Change theme"
      triggerClassName="size-8 items-center justify-center rounded-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      trigger={
        <TriggerIcon aria-hidden="true" className="size-4" data-testid="theme-toggle-icon" />
      }
      items={options.map((option) => ({
        id: option.value,
        label:
          option.value === preference ? `${option.label} (current)` : option.label,
        icon: <option.icon aria-hidden="true" />,
        onSelect: () => setPreference(option.value)
      }))}
    />
  );
}
