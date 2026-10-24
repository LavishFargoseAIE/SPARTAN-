import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { QrCode, ShieldAlert, ShieldCheck, AlertTriangle, ArrowRight, X } from "lucide-react-native";
import { checkHost, VerdictResult } from "../services/api";
import { translations, Language } from "../i18n/translations";
import { VerdictCard } from "../components/VerdictCard";

interface Props {
  lang: Language;
  apiBase: string;
  onRecordScan: (item: VerdictResult) => void;
}

export const QRScannerScreen: React.FC<Props> = ({ lang, apiBase, onRecordScan }) => {
  const t = translations[lang];
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState<VerdictResult | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [scannedRawUrl, setScannedRawUrl] = useState("");

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    setScannedRawUrl(data);

    try {
      const result = await checkHost(data, apiBase, lang);
      setVerdict(result);
      onRecordScan(result);
      setModalVisible(true);
    } catch (e) {
      console.warn("QR check failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateScan = async (fakeUrl: string) => {
    await handleBarcodeScanned({ data: fakeUrl });
  };

  const resetScanner = () => {
    setScanned(false);
    setModalVisible(false);
    setVerdict(null);
  };

  const handleOpenVerifiedSafeLink = () => {
    if (scannedRawUrl) {
      const url = scannedRawUrl.startsWith("http") ? scannedRawUrl : `https://${scannedRawUrl}`;
      Linking.openURL(url);
      resetScanner();
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <View style={styles.permissionCard}>
          <QrCode size={48} color="#60a5fa" />
          <Text style={styles.permissionTitle}>{t.qr_scanner_title}</Text>
          <Text style={styles.permissionSub}>{t.qr_permission_needed}</Text>
          <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
            <Text style={styles.grantBtnText}>{t.grant_permission}</Text>
          </TouchableOpacity>

          <View style={styles.simulatorBox}>
            <Text style={styles.simulatorTitle}>Test Scanner (Simulator / No Camera):</Text>
            <TouchableOpacity
              style={styles.simBtn}
              onPress={() => handleSimulateScan("https://onlinesbi-kyc-verify.top")}
            >
              <Text style={styles.simBtnText}>Scan Phishing QR (Fake SBI KYC)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.simBtn}
              onPress={() => handleSimulateScan("https://sbi.co.in")}
            >
              <Text style={styles.simBtnText}>Scan Official QR (sbi.co.in)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.qr_scanner_title}</Text>
        <Text style={styles.headerSub}>{t.qr_scanner_sub}</Text>
      </View>

      {/* Camera Viewfinder */}
      <View style={styles.cameraWrapper}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        />

        {/* Viewfinder Overlay Frame */}
        <View style={styles.overlay}>
          <View style={styles.finderBox}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.finderText}>Align QR code inside box</Text>
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>{t.checking}</Text>
          </View>
        )}
      </View>

      {/* Quick Test Buttons (convenient on simulators and quick demos) */}
      <View style={styles.demoBar}>
        <Text style={styles.demoLabel}>Quick Simulation:</Text>
        <TouchableOpacity
          style={styles.demoChip}
          onPress={() => handleSimulateScan("https://onlinesbi-kyc-verify.top")}
        >
          <Text style={styles.demoChipText}>Fake Bank QR</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.demoChip}
          onPress={() => handleSimulateScan("https://sbi.co.in")}
        >
          <Text style={styles.demoChipText}>Official SBI QR</Text>
        </TouchableOpacity>
      </View>

      {/* Pre-Opening Verdict Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.qr_result_heading}</Text>
              <TouchableOpacity onPress={resetScanner} style={styles.modalCloseBtn}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {verdict && (
              <View>
                <VerdictCard verdict={verdict} t={t} onBypass={handleOpenVerifiedSafeLink} />

                {verdict.level === "SAFE" && (
                  <TouchableOpacity
                    style={styles.openSafeBtn}
                    onPress={handleOpenVerifiedSafeLink}
                  >
                    <Text style={styles.openSafeBtnText}>{t.open_verified_link}</Text>
                    <ArrowRight size={18} color="#ffffff" />
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.scanAnotherBtn} onPress={resetScanner}>
                  <Text style={styles.scanAnotherText}>Scan Another Code</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070b14",
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#070b14",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#ffffff",
  },
  headerSub: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  cameraWrapper: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  finderBox: {
    width: 250,
    height: 250,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 32,
    height: 32,
    borderColor: "#3b82f6",
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  finderText: {
    marginTop: 20,
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "600",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7, 11, 20, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  demoBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    backgroundColor: "#0d1424",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  demoLabel: {
    fontSize: 11,
    color: "#64748b",
  },
  demoChip: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  demoChipText: {
    color: "#60a5fa",
    fontSize: 11,
    fontWeight: "700",
  },
  permissionCard: {
    backgroundColor: "#0d1424",
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
    width: "100%",
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 14,
  },
  permissionSub: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
  },
  grantBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  grantBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  simulatorBox: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    width: "100%",
    gap: 8,
  },
  simulatorTitle: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
    fontWeight: "600",
  },
  simBtn: {
    backgroundColor: "#1e293b",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  simBtnText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#070b14",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  modalCloseBtn: {
    padding: 6,
  },
  openSafeBtn: {
    backgroundColor: "#10b981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 6,
  },
  openSafeBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 15,
  },
  scanAnotherBtn: {
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  scanAnotherText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
  },
});
