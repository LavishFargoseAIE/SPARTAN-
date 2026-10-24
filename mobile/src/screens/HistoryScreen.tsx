import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Clock, Trash2, ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react-native";
import { VerdictResult } from "../services/api";
import { translations, Language } from "../i18n/translations";

export interface ScanHistoryItem extends VerdictResult {
  scannedAt: string;
}

interface Props {
  lang: Language;
  history: ScanHistoryItem[];
  onClearHistory: () => void;
  onSelectHost: (host: string) => void;
}

export const HistoryScreen: React.FC<Props> = ({
  lang,
  history,
  onClearHistory,
  onSelectHost,
}) => {
  const t = translations[lang];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <div>
          <Text style={styles.headerTitle}>{t.history_title}</Text>
          <Text style={styles.headerSub}>Privacy-first: on-device only, never uploaded</Text>
        </div>
        {history.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={onClearHistory}>
            <Trash2 size={16} color="#f87171" />
            <Text style={styles.clearBtnText}>{t.clear_history}</Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Clock size={48} color="#334155" />
          <Text style={styles.emptyText}>{t.history_empty}</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, idx) => `${item.host}-${idx}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isDanger = item.level === "DANGEROUS";
            const isSusp = item.level === "SUSPICIOUS";

            return (
              <TouchableOpacity
                style={styles.historyCard}
                onPress={() => onSelectHost(item.host)}
                activeOpacity={0.7}
              >
                <View style={styles.cardIcon}>
                  {isDanger ? (
                    <ShieldAlert size={22} color="#ef4444" />
                  ) : isSusp ? (
                    <AlertTriangle size={22} color="#f59e0b" />
                  ) : (
                    <ShieldCheck size={22} color="#10b981" />
                  )}
                </View>

                <View style={styles.cardInfo}>
                  <Text style={styles.cardHost} numberOfLines={1}>
                    {item.host}
                  </Text>
                  <Text style={styles.cardBrand}>
                    {item.brand ? `Impersonates: ${item.brand.name}` : item.level} • {item.scannedAt}
                  </Text>
                </View>

                <View style={styles.cardScore}>
                  <Text
                    style={[
                      styles.scoreNumber,
                      { color: isDanger ? "#ef4444" : isSusp ? "#f59e0b" : "#10b981" },
                    ]}
                  >
                    {item.score}
                  </Text>
                  <Text style={styles.scoreUnit}>/100</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070b14",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#ffffff",
  },
  headerSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearBtnText: {
    color: "#f87171",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 12,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  listContent: {
    padding: 20,
    paddingTop: 6,
    gap: 10,
  },
  historyCard: {
    backgroundColor: "#0d1424",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  cardIcon: {
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardHost: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f1f5f9",
    fontFamily: "monospace",
  },
  cardBrand: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 3,
  },
  cardScore: {
    alignItems: "flex-end",
    marginLeft: 8,
  },
  scoreNumber: {
    fontSize: 16,
    fontWeight: "900",
  },
  scoreUnit: {
    fontSize: 10,
    color: "#64748b",
  },
});
