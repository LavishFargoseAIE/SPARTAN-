import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Server, Globe, ShieldCheck, KeyRound, Check } from "lucide-react-native";
import { translations, Language } from "../i18n/translations";
import { DEFAULT_API_BASE } from "../services/api";

interface Props {
  lang: Language;
  onLanguageChange: (l: Language) => void;
  apiBase: string;
  onApiBaseChange: (url: string) => void;
  killSwitch: boolean;
  onKillSwitchToggle: () => void;
}
  lang: Language;
  onLanguageChange: (l: Language) => void;
  apiBase: string;
  onApiBaseChange: (url: string) => void;
}

export const SettingsScreen: React.FC<Props> = ({
  lang,
  onLanguageChange,
  apiBase,
  onApiBaseChange,
}) => {
  const t = translations[lang];
  const [customApi, setCustomApi] = useState(apiBase);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSaveApi = () => {
    onApiBaseChange(customApi.trim());
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleResetDefault = () => {
    setCustomApi(DEFAULT_API_BASE);
    onApiBaseChange(DEFAULT_API_BASE);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t.settings_title}</Text>
          <Text style={styles.headerSub}>Security parameters & network preferences</Text>
        </View>

        {/* Language Selection */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Globe size={18} color="#60a5fa" />
            <Text style={styles.sectionTitle}>{t.language}</Text>
          </View>

          <View style={styles.langGrid}>
            <TouchableOpacity
              style={[styles.langOption, lang === "en" && styles.langOptionActive]}
              onPress={() => onLanguageChange("en")}
            >
              <Text style={[styles.langOptionText, lang === "en" && styles.langOptionTextActive]}>
                English
              </Text>
              {lang === "en" && <Check size={16} color="#60a5fa" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.langOption, lang === "hi" && styles.langOptionActive]}
              onPress={() => onLanguageChange("hi")}
            >
              <Text style={[styles.langOptionText, lang === "hi" && styles.langOptionTextActive]}>
                हिन्दी (Hindi)
              </Text>
              {lang === "hi" && <Check size={16} color="#60a5fa" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.langOption, lang === "mr" && styles.langOptionActive]}
              onPress={() => onLanguageChange("mr")}
            >
              <Text style={[styles.langOptionText, lang === "mr" && styles.langOptionTextActive]}>
                मराठी (Marathi)
              </Text>
              {lang === "mr" && <Check size={16} color="#60a5fa" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* API Endpoint Configuration */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Server size={18} color="#60a5fa" />
            <Text style={styles.sectionTitle}>{t.api_endpoint}</Text>
          </View>

          <TextInput
            style={styles.apiInput}
            value={customApi}
            onChangeText={setCustomApi}
            placeholder="https://..."
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.apiBtnRow}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleResetDefault}>
              <Text style={styles.resetBtnText}>Reset to Cloud Default</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveApi}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>

          {savedNotice && (
            <Text style={styles.savedNoticeText}>✓ API Server Endpoint Updated</Text>
          )}
        </View>

          {/* Kill Switch */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <ShieldCheck size={18} color="#10b981" />
              <Text style={styles.sectionTitle}>Kill Switch (Emergency Bypass)</Text>
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{killSwitch ? 'Enabled – all URLs will be treated as SAFE' : 'Disabled'}</Text>
              <Switch
                value={killSwitch}
                onValueChange={onKillSwitchToggle}
                thumbColor={killSwitch ? '#10b981' : '#64748b'}
                trackColor={{ false: '#4b5563', true: '#1e293b' }}
              />
            </View>
          </View>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <ShieldCheck size={18} color="#10b981" />
            <Text style={styles.sectionTitle}>Engine & Registry Status</Text>
          </View>

          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Verified Brand Registry</Text>
            <Text style={styles.specValue}>625 Brands (Ed25519 Signed)</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Embedded Pinned Domains</Text>
            <Text style={styles.specValue}>655 Official Hosts</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Privacy Protocol</Text>
            <Text style={styles.specValue}>Hostnames Only (Zero URL logs)</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Fail-Open Latency SLA</Text>
            <Text style={styles.specValue}>800 ms Maximum</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070b14",
  },
  content: {
    padding: 20,
    gap: 16,
  },
  header: {
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#ffffff",
  },
  headerSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: "#0d1424",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 18,
    padding: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#f1f5f9",
  },
  langGrid: {
    gap: 8,
  },
  langOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#080c16",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  langOptionActive: {
    borderColor: "#2563eb",
    backgroundColor: "rgba(37, 99, 235, 0.1)",
  },
  langOptionText: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "600",
  },
  langOptionTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  apiInput: {
    backgroundColor: "#080c16",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 10,
    color: "#f8fafc",
    padding: 12,
    fontSize: 13,
    fontFamily: "monospace",
    marginBottom: 12,
  },
  apiBtnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resetBtn: {
    paddingVertical: 8,
  },
  resetBtnText: {
    color: "#64748b",
    fontSize: 12,
    textDecorationLine: "underline",
  },
  saveBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  savedNoticeText: {
    color: "#10b981",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 10,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  specLabel: {
    fontSize: 12,
    color: "#94a3b8",
  },
  specValue: {
    fontSize: 12,
    color: "#f1f5f9",
    fontWeight: "700",
  },
});
