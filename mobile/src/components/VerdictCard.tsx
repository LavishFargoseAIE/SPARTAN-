import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { ShieldCheck, AlertTriangle, ShieldAlert, ExternalLink, ArrowRight } from "lucide-react-native";
import { VerdictResult } from "../services/api";
import { Translations } from "../i18n/translations";

interface Props {
  verdict: VerdictResult;
  t: Translations;
  onBypass?: () => void;
}

export const VerdictCard: React.FC<Props> = ({ verdict, t, onBypass }) => {
  const isDangerous = verdict.level === "DANGEROUS";
  const isSuspicious = verdict.level === "SUSPICIOUS";
  const isSafe = verdict.level === "SAFE";

  const brandName = verdict.brand?.name;

  const handleOpenRealBrand = () => {
    if (verdict.brand?.official_url) {
      Linking.openURL(verdict.brand.official_url);
    }
  };

  const handleContinueAnyway = () => {
    if (onBypass) {
      onBypass();
    } else {
      Linking.openURL(`https://${verdict.host}`);
    }
  };

  return (
    <View
      style={[
        styles.card,
        isDangerous && styles.cardDangerous,
        isSuspicious && styles.cardSuspicious,
        isSafe && styles.cardSafe,
      ]}
    >
      {/* Icon Badge */}
      <View style={styles.badgeRow}>
        <View
          style={[
            styles.iconCircle,
            isDangerous && styles.iconCircleDangerous,
            isSuspicious && styles.iconCircleSuspicious,
            isSafe && styles.iconCircleSafe,
          ]}
        >
          {isDangerous && <ShieldAlert size={36} color="#ef4444" />}
          {isSuspicious && <AlertTriangle size={36} color="#f59e0b" />}
          {isSafe && <ShieldCheck size={36} color="#10b981" />}
        </View>

        <View style={styles.scoreBox}>
          <Text
            style={[
              styles.scoreText,
              isDangerous && { color: "#ef4444" },
              isSuspicious && { color: "#f59e0b" },
              isSafe && { color: "#10b981" },
            ]}
          >
            {verdict.score}
          </Text>
          <Text style={styles.scoreLabel}>/ 100 {t.risk_score}</Text>
        </View>
      </View>

      {/* Title & Subtitle */}
      <Text style={styles.title}>
        {isDangerous && brandName
          ? t.brand_impersonation_title.replace("{brand}", brandName)
          : isDangerous
          ? t.dangerous_title
          : isSuspicious
          ? t.suspicious_title
          : t.safe_title}
      </Text>

      <Text style={styles.subtitle}>
        {isDangerous ? t.dangerous_subtitle : isSuspicious ? t.suspicious_subtitle : t.safe_subtitle}
      </Text>

      {/* Target Host Box */}
      <View style={styles.hostBox}>
        <Text style={styles.hostLabel}>Inspected address:</Text>
        <Text style={styles.hostValue} numberOfLines={1}>
          {verdict.host}
        </Text>
      </View>

      {/* Reason Bullets */}
      {verdict.reasons && verdict.reasons.length > 0 && (
        <View style={styles.reasonsContainer}>
          <Text style={styles.reasonsHeading}>{t.reasons_heading}:</Text>
          {verdict.reasons.map((r, i) => (
            <View key={i} style={styles.reasonRow}>
              <View
                style={[
                  styles.reasonDot,
                  { backgroundColor: isDangerous ? "#ef4444" : "#f59e0b" },
                ]}
              />
              <Text style={styles.reasonText}>{r}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Official Brand Action (Image 3 spec) */}
      {isDangerous && verdict.brand && (
        <TouchableOpacity style={styles.realBrandBtn} onPress={handleOpenRealBrand} activeOpacity={0.85}>
          <Text style={styles.realBrandBtnText}>
            {t.take_to_real_brand.replace("{brand}", verdict.brand.name)}
          </Text>
          <ArrowRight size={18} color="#ffffff" />
        </TouchableOpacity>
      )}

      {/* Official URL display */}
      {isDangerous && verdict.brand && (
        <Text style={styles.opensUrlText} numberOfLines={1}>
          Opens verified official: {verdict.brand.official_url}
        </Text>
      )}

      {/* Continue anyway link */}
      {isDangerous && (
        <TouchableOpacity style={styles.continueBtn} onPress={handleContinueAnyway}>
          <Text style={styles.continueBtnText}>{t.continue_anyway}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0d1424",
    borderRadius: 20,
    padding: 22,
    borderWidth: 1.5,
    borderColor: "#1e293b",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
    marginVertical: 12,
  },
  cardDangerous: {
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  cardSuspicious: {
    borderColor: "rgba(245, 158, 11, 0.4)",
  },
  cardSafe: {
    borderColor: "rgba(16, 185, 129, 0.4)",
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleDangerous: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  iconCircleSuspicious: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  iconCircleSafe: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  scoreBox: {
    alignItems: "flex-end",
  },
  scoreText: {
    fontSize: 32,
    fontWeight: "900",
  },
  scoreLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "600",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 6,
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 13,
    color: "#94a3b8",
    lineHeight: 18,
    marginBottom: 14,
  },
  hostBox: {
    backgroundColor: "#080c16",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  hostLabel: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 2,
  },
  hostValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f1f5f9",
    fontFamily: "monospace",
  },
  reasonsContainer: {
    marginTop: 4,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  reasonsHeading: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  reasonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  reasonText: {
    fontSize: 12,
    color: "#cbd5e1",
    flex: 1,
  },
  realBrandBtn: {
    backgroundColor: "#1d4ed8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 6,
    gap: 8,
  },
  realBrandBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  opensUrlText: {
    textAlign: "center",
    fontSize: 11,
    color: "#10b981",
    marginTop: 8,
    fontFamily: "monospace",
  },
  continueBtn: {
    marginTop: 14,
    paddingVertical: 8,
    alignItems: "center",
  },
  continueBtnText: {
    color: "#64748b",
    fontSize: 12,
    textDecorationLine: "underline",
  },
});
