import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import * as Linking from "expo-linking";
import { Shield, QrCode, Clock, Settings as SettingsIcon } from "lucide-react-native";

import { HomeScreen } from "./src/screens/HomeScreen";
import { QRScannerScreen } from "./src/screens/QRScannerScreen";
import { HistoryScreen, ScanHistoryItem } from "./src/screens/HistoryScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { Language, translations } from "./src/i18n/translations";
import { DEFAULT_API_BASE, VerdictResult, checkHost } from "./src/services/api";

const Tab = createBottomTabNavigator();

export default function App() {
  const [lang, setLang] = useState<Language>("en");
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);

// (Lines 71-85 were duplicated and have been removed)

  // Load persisted kill‑switch state on mount
  useEffect(() => {
    (async () => {
      try {
        const val = await AsyncStorage.getItem('@kill_switch');
        setKillSwitch(val === 'true');
      } catch (e) {
        console.warn('Failed to load kill switch', e);
      }
    })();
  }, []);

  // Persist kill‑switch whenever it changes
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem('@kill_switch', killSwitch ? 'true' : 'false');
      } catch (e) {
        console.warn('Failed to save kill switch', e);
      }
    })();
  }, [killSwitch]);
  const [killSwitch, setKillSwitch] = useState(false);
  // Load persisted history on mount
  useEffect(() => {
    (async () => {
      try {
        const json = await AsyncStorage.getItem('@scan_history');
        if (json) {
          const stored: ScanHistoryItem[] = JSON.parse(json);
          setHistory(stored);
        }
      } catch (e) {
        console.warn('Failed to load scan history', e);
      }
    })();
  }, []);

  // Persist history whenever it changes
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem('@scan_history', JSON.stringify(history));
      } catch (e) {
        console.warn('Failed to save scan history', e);
      }
    })();
  }, [history]);

  const t = translations[lang];

  const recordScan = (item: VerdictResult) => {
    const historyItem: ScanHistoryItem = {
      ...item,
      scannedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setHistory((prev) => [historyItem, ...prev.slice(0, 49)]); // keep last 50
  };

  const clearHistory = () => {
    setHistory([]);
  };

  // Handle Incoming Share-Sheet & Deep Links (Android SEND Intent / iOS Share Extension)
  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      try {
        const parsed = Linking.parse(url);
        const incomingUrl =
          (parsed.queryParams?.url as string) ||
          (parsed.queryParams?.text as string) ||
          (url.startsWith("http") ? url : null);

        if (incomingUrl) {
          const res = await checkHost(incomingUrl, apiBase, lang);
          recordScan(res);
        }
      } catch (e) {
        console.warn("Deep link processing error:", e);
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener("url", (event) => handleUrl(event.url));
    return () => subscription.remove();
  }, [apiBase, lang]);

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#070b14",
            borderTopColor: "#1e293b",
            borderTopWidth: 1,
            height: 64,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: "#3b82f6",
          tabBarInactiveTintColor: "#64748b",
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "700",
          },
        }}
      >
        <Tab.Screen
          name="Inspect"
          options={{
            tabBarLabel: t.tab_inspect,
            tabBarIcon: ({ color, size }) => <Shield size={size} color={color} />,
          }}
        >
          {() => (
            <HomeScreen
              lang={lang}
              onLanguageChange={setLang}
              apiBase={apiBase}
              onRecordScan={recordScan}
            />
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Scan"
          options={{
            tabBarLabel: t.tab_scan,
            tabBarIcon: ({ color, size }) => <QrCode size={size} color={color} />,
          }}
        >
          {() => (
            <QRScannerScreen
              lang={lang}
              apiBase={apiBase}
              onRecordScan={recordScan}
            />
          )}
        </Tab.Screen>

        <Tab.Screen
          name="History"
          options={{
            tabBarLabel: t.tab_history,
            tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
          }}
        >
          {() => (
            <HistoryScreen
              lang={lang}
              history={history}
              onClearHistory={clearHistory}
              onSelectHost={(host) => {
                // switch to home screen or trigger recheck
              }}
            />
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Settings"
          options={{
            tabBarLabel: t.tab_settings,
            tabBarIcon: ({ color, size }) => <SettingsIcon size={size} color={color} />,
          }}
        >
          {() => (
            <SettingsScreen
              lang={lang}
              onLanguageChange={setLang}
              apiBase={apiBase}
              onApiBaseChange={setApiBase}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
