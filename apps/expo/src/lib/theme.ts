import type { Theme } from "@react-navigation/native";

const LIGHT_COLORS = {
  background: "#f0fafe",
  foreground: "#0c2d48",
  card: "#ffffff",
  cardForeground: "#0c2d48",
  primary: "#1a6fa0",
  primaryForeground: "#ffffff",
  secondary: "#e0f4fb",
  secondaryForeground: "#0c2d48",
  muted: "#e0f4fb",
  mutedForeground: "#1a6fa0",
  accent: "#b8e6f5",
  accentForeground: "#0c2d48",
  destructive: "#e11d48",
  destructiveForeground: "#ffffff",
  border: "#b8e6f5",
  input: "#b8e6f5",
  ring: "#1a6fa0",
};

const DARK_COLORS = {
  background: "#0c2535",
  foreground: "#b8e6f5",
  card: "#0f2d3d",
  cardForeground: "#b8e6f5",
  primary: "#5bb8db",
  primaryForeground: "#060f18",
  secondary: "#12384d",
  secondaryForeground: "#b8e6f5",
  muted: "#12384d",
  mutedForeground: "#7cc8e8",
  accent: "#1a5270",
  accentForeground: "#b8e6f5",
  destructive: "#e11d48",
  destructiveForeground: "#ffffff",
  border: "#1a5270",
  input: "#1a5270",
  ring: "#5bb8db",
};

export const LIGHT_THEME: Theme = {
  dark: false,
  colors: {
    background: LIGHT_COLORS.background,
    border: LIGHT_COLORS.border,
    card: LIGHT_COLORS.card,
    notification: LIGHT_COLORS.destructive,
    primary: LIGHT_COLORS.primary,
    text: LIGHT_COLORS.foreground,
  },
  fonts: {
    regular: { fontFamily: "System", fontWeight: "400" },
    medium: { fontFamily: "System", fontWeight: "500" },
    bold: { fontFamily: "System", fontWeight: "700" },
    heavy: { fontFamily: "System", fontWeight: "900" },
  },
};

export const DARK_THEME: Theme = {
  dark: true,
  colors: {
    background: DARK_COLORS.background,
    border: DARK_COLORS.border,
    card: DARK_COLORS.card,
    notification: DARK_COLORS.destructive,
    primary: DARK_COLORS.primary,
    text: DARK_COLORS.foreground,
  },
  fonts: {
    regular: { fontFamily: "System", fontWeight: "400" },
    medium: { fontFamily: "System", fontWeight: "500" },
    bold: { fontFamily: "System", fontWeight: "700" },
    heavy: { fontFamily: "System", fontWeight: "900" },
  },
};

export const NAV_THEME = {
  light: LIGHT_THEME,
  dark: DARK_THEME,
};
