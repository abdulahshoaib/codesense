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
          <div className="grid gap-3 sm:grid-cols-3">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = option.value === preference;

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setPreference(option.value)}
                  className={cn(
                    "flex flex-col gap-2 rounded-none border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-border hover:bg-muted"
                  )}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </CardContent>
    </Card>
  );
}
