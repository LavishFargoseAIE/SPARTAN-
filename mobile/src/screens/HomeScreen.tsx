import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { Shield, Clipboard as ClipboardIcon, Search, Globe2 } from "lucide-react-native";
import { checkHost, VerdictResult, DEFAULT_API_BASE } from "../services/api";
import { translations, Language } from "../i18n/translations";
import { VerdictCard } from "../components/VerdictCard";

interface Props {
  lang: Language;
  onLanguageChange: (l: Language) => void;
  apiBase: string;
  onRecordScan: (item: VerdictResult) => void;
  killSwitch: boolean;
}
  lang: Language;
  onLanguageChange: (l: Language) => void;
  apiBase: string;
  onRecordScan: (item: VerdictResult) => void;
}

export const HomeScreen: React.FC<Props> = ({
  lang,
  onLanguageChange,
  apiBase,
  onRecordScan,
}) => {
  const t = translations[lang];
  const [inputUrl, setInputUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState<VerdictResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setInputUrl(text);
      }
    } catch {
      // ignore
    }
  };

  const handleInspect = async () => {
    if (!inputUrl.trim()) return;
    Keyboard.dismiss();
    setLoading(true);
    setErrorMsg("");
    setVerdict(null);

    try {
      const result = await checkHost(inputUrl, apiBase, lang);
      setVerdict(result);
      onRecordScan(result);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to inspect address");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.logoBadge}>
              <Shield size={24} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.appTitle}>{t.app_name}</Text>
              <Text style={styles.tagline}>{t.tagline}</Text>
            </View>
          </View>

          {/* Language Switcher Pill */}
          <View style={styles.langPillContainer}>
            <TouchableOpacity
              style={[styles.langPill, lang === "en" && styles.langPillActive]}
              onPress={() => onLanguageChange("en")}
            >
              <Text style={[styles.langText, lang === "en" && styles.langTextActive]}>EN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langPill, lang === "hi" && styles.langPillActive]}
              onPress={() => onLanguageChange("hi")}
            >
              <Text style={[styles.langText, lang === "hi" && styles.langTextActive]}>हिन्दी</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langPill, lang === "mr" && styles.langPillActive]}
              onPress={() => onLanguageChange("mr")}
            >
              <Text style={[styles.langText, lang === "mr" && styles.langTextActive]}>मराठी</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Input Box */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder={t.input_placeholder}
            placeholderTextColor="#64748b"
            value={inputUrl}
            onChangeText={setInputUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.pasteBtn} onPress={handlePaste} activeOpacity={0.8}>
              <ClipboardIcon size={16} color="#94a3b8" />
              <Text style={styles.pasteBtnText}>{t.paste_btn}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.checkBtn, loading && styles.btnDisabled]}
              onPress={handleInspect}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Search size={16} color="#ffffff" />
                  <Text style={styles.checkBtnText}>{t.check_btn}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Error Notice */}
        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Verdict Result */}
        {verdict ? <VerdictCard verdict={verdict} t={t} /> : null}

        {/* Quick Tips */}
        {!verdict && !loading ? (
          <View style={styles.tipsBox}>
            <Text style={styles.tipsTitle}>💡 How SiteGuard Protects You</Text>
            <Text style={styles.tipText}>
              • Intercepts SMS / WhatsApp banking links before you enter passwords
            </Text>
            <Text style={styles.tipText}>
              • Automatically detects lookalike typosquatting and fake KYC portals
            </Text>
            <Text style={styles.tipText}>
              • Takes you directly to verified official bank and government apps
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070b14",
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563eb",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 12,
    color: "#60a5fa",
    fontWeight: "500",
  },
  langPillContainer: {
    flexDirection: "row",
    backgroundColor: "#0d1424",
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    alignSelf: "flex-start",
  },
  langPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  langPillActive: {
    backgroundColor: "#1e3a8a",
  },
  langText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
  },
  langTextActive: {
    color: "#ffffff",
  },
  inputContainer: {
    backgroundColor: "#0d1424",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 16,
  },
  textInput: {
    color: "#f8fafc",
    fontSize: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    marginBottom: 14,
    fontFamily: "monospace",
  },
  btnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  pasteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#1e293b",
    borderRadius: 10,
  },
  pasteBtnText: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "600",
  },
  checkBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#2563eb",
    borderRadius: 10,
  },
  checkBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: {
    color: "#f87171",
    fontSize: 13,
  },
  tipsBox: {
    marginTop: 20,
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#080c16",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#f1f5f9",
    marginBottom: 10,
  },
  tipText: {
    fontSize: 12,
    color: "#94a3b8",
    lineHeight: 20,
    marginBottom: 4,
  },
});
