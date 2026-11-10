import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  useThemeStore,
  type ThemePreference
} from "@/stores/theme.store";

const themeOptions: {
  value: ThemePreference;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    value: "light",
    label: "Light",
    description: "Always use the light theme.",
    icon: Sun
  },
  {
    value: "dark",
    label: "Dark",
    description: "Always use the dark theme.",
    icon: Moon
  },
  {
    value: "system",
    label: "System",
    description: "Match your operating system preference.",
    icon: Monitor
  }
];

export function AppearanceSection(): React.ReactElement {
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose how CodeSense looks to you.</CardDescription>
      </CardHeader>
      <CardContent>
        <fieldset>
          <legend className="sr-only">Theme preference</legend>
          <div className="flex gap-1 rounded-none border border-border p-1">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = option.value === preference;

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isSelected}
                  title={option.description}
                  onClick={() => setPreference(option.value)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-none px-2 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      </CardContent>
    </Card>
  );
}
