import { useColorScheme } from "react-native";
import { Tabs } from "expo-router";
import { MessageSquare, User } from "lucide-react-native";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tabs
      lazy
      screenOptions={{
        headerStyle: {
          backgroundColor: isDark ? "#0f2d3d" : "#1a6fa0",
        },
        headerTintColor: "#ffffff",
        headerTitleStyle: {
          fontWeight: "600",
        },
        tabBarStyle: {
          backgroundColor: isDark ? "#0c2535" : "#f0fafe",
          borderTopColor: isDark ? "#1a5270" : "#b8e6f5",
        },
        tabBarActiveTintColor: isDark ? "#5bb8db" : "#1a6fa0",
        tabBarInactiveTintColor: isDark ? "#7cc8e8" : "#7cc8e8",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "TinyWhale",
          tabBarIcon: ({ color, size }) => (
            <MessageSquare size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
