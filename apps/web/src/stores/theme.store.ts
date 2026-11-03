import { create } from "zustand";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "codesense-theme";

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    /* storage unavailable */
  }

  return "system";
}

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveIsDark(preference: ThemePreference): boolean {
  if (preference === "system") {
    return systemPrefersDark();
  }

  return preference === "dark";
}

function applyTheme(preference: ThemePreference, isDark: boolean): void {
  document.documentElement.classList.toggle("dark", isDark);

  try {
    window.localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    /* storage unavailable */
  }
}

interface ThemeState {
  preference: ThemePreference;
  isDark: boolean;
  setPreference: (preference: ThemePreference) => void;
  toggle: () => void;
}

const initialPreference = readPreference();
const initialIsDark = resolveIsDark(initialPreference);

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: initialPreference,
  isDark: initialIsDark,

  setPreference: (preference) => {
    const isDark = resolveIsDark(preference);
    applyTheme(preference, isDark);
    set({ preference, isDark });
  },

  toggle: () => {
    const { isDark } = get();
    get().setPreference(isDark ? "light" : "dark");
  }
}));

export function startSystemThemeSync(): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const handleChange = (): void => {
    if (useThemeStore.getState().preference === "system") {
      const isDark = media.matches;
      applyTheme("system", isDark);
      useThemeStore.setState({ isDark });
    }
  };

  applyTheme(useThemeStore.getState().preference, useThemeStore.getState().isDark);
  media.addEventListener("change", handleChange);

  return () => media.removeEventListener("change", handleChange);
}
