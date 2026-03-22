import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";

import { NAV_THEME } from "~/lib/theme";
import { queryClient } from "~/utils/api";

import "../styles.css";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = NAV_THEME[colorScheme === "dark" ? "dark" : "light"];

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={theme}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor:
                  colorScheme === "dark" ? "#0f2d3d" : "#1a6fa0",
              },
              headerTintColor: "#ffffff",
              headerTitleStyle: {
                fontWeight: "600",
              },
              contentStyle: {
                backgroundColor:
                  colorScheme === "dark" ? "#0c2535" : "#f0fafe",
              },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </GestureHandlerRootView>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
