import { Platform } from "react-native";

// Android emulators reach the host machine at 10.0.2.2; iOS simulators use localhost.
const defaultUrl = Platform.OS === "android" ? "http://10.0.2.2:9000" : "http://localhost:9000";

export const API_URL = process.env.EXPO_PUBLIC_API_URL || defaultUrl;
export const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_PUBLISHABLE_KEY || "";

export const colors = {
  coral: "#FF6B4A",
  teal: "#1F6F6B",
  background: "#FAF9F6",
  border: "#E5E1DA",
  text: "#1A1A1A",
  muted: "#6B7280",
};
