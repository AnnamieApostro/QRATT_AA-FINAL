
import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import AppButton from '@/components/AppButton';
import { useAuth } from '@/lib/auth';
import { registerAttendance } from '@/lib/attendance';
import { getUserRole, type Role } from '@/lib/profiles';

const PURPLE = {
  dark: '#4C1D95',
  deep: '#5B21B6',
  primary: '#7C3AED',
  light: '#A78BFA',
  pale: '#F5F0FF',
  white: '#FFFFFF',
  muted: '#8B7AA8',
  border: '#EDE5FA',
};

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();

  const [scanned, setScanned] = useState(false);
  const [lastData, setLastData] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const { user } = useAuth();

  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (!user) {
        setRole(null);
        setRoleLoading(false);

        return () => {
          active = false;
        };
      }

      setRoleLoading(true);

      getUserRole(user.id)
        .then((currentRole) => {
          if (!active) return;

          setRole(currentRole);
          setRoleLoading(false);
        })
        .catch((error) => {
          console.error('Student role check error:', error);

          if (active) {
            setRole(null);
            setRoleLoading(false);
          }
        });

      return () => {
        active = false;
      };
    }, [user])
  );

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing || !user) return;

    setScanned(true);
    setLastData(data);
    setMessage(null);
    setProcessing(true);

    try {
      const result = await registerAttendance(data, user.id);

      setMessage(result.message);
      setSuccess(result.success);
    } catch (error) {
      console.error('Attendance registration error:', error);

      setSuccess(false);
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to register attendance. Please try again.'
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleScanAgain = () => {
    setScanned(false);
    setLastData(null);
    setMessage(null);
    setSuccess(false);
    setProcessing(false);
  };

  // ACCOUNT CHECK
  if (roleLoading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.loadingIcon}>
          <Ionicons
            name="qr-code-outline"
            size={34}
            color={PURPLE.white}
          />
        </View>

        <ActivityIndicator
          size="large"
          color={PURPLE.primary}
          style={{ marginTop: 22 }}
        />

        <Text style={styles.loadingTitle}>
          Checking your account...
        </Text>
      </View>
    );
  }

  // STUDENT-ONLY ACCESS
  if (role !== 'student') {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.lockIcon}>
          <Ionicons
            name="lock-closed-outline"
            size={36}
            color={PURPLE.primary}
          />
        </View>

        <Text style={styles.lockTitle}>Students Only</Text>

        <Text style={styles.lockMessage}>
          Only authorized student accounts can scan attendance QR codes.
        </Text>
      </View>
    );
  }

  // PERMISSION LOADING
  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PURPLE.primary} />
        <Text style={styles.loadingTitle}>
          Preparing your camera...
        </Text>
      </View>
    );
  }

  // CAMERA PERMISSION
  if (!permission.granted) {
    return (
      <View style={styles.permissionScreen}>
        <StatusBar barStyle="light-content" backgroundColor={PURPLE.dark} />

        <View style={styles.permissionHeader}>
          <Text style={styles.brand}>QRATT AA</Text>
          <Text style={styles.permissionEyebrow}>
            STUDENT ATTENDANCE PORTAL
          </Text>
        </View>

        <View style={styles.permissionContent}>
          <View style={styles.permissionIcon}>
            <Ionicons
              name="camera-outline"
              size={53}
              color={PURPLE.primary}
            />
          </View>

          <Text style={styles.permissionTitle}>
            Camera Permission Needed
          </Text>

          <Text style={styles.permissionDescription}>
            QRATT AA needs access to your camera so you can scan
            event QR codes and record your attendance.
          </Text>

          <View style={styles.permissionInfo}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={PURPLE.primary}
            />
            <Text style={styles.permissionInfoText}>
              Your camera is used for QR code scanning.
            </Text>
          </View>

          <View style={styles.permissionButton}>
            <AppButton
              theme="primary"
              title="Grant Camera Permission"
              icon="camera"
              onPress={requestPermission}
            />
          </View>
        </View>
      </View>
    );
  }

  // CAMERA SCANNER
  return (
    <View style={styles.cameraScreen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#201039"
        translucent={false}
      />

      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={
          scanned ? undefined : handleBarcodeScanned
        }
      />

      <View style={styles.cameraOverlay}>
        {/* HEADER */}
        <View style={styles.cameraHeader}>
          <View>
            <Text style={styles.cameraBrand}>QRATT AA</Text>
            <Text style={styles.cameraSubtitle}>
              ATTENDANCE SCANNER
            </Text>
          </View>

          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE SCANNER</Text>
          </View>
        </View>

        {/* SCANNING AREA */}
        <View style={styles.scannerArea}>
          <Text style={styles.instructionTitle}>
            {scanned ? 'QR Code Detected!' : 'Scan Your Event QR'}
          </Text>

          <Text style={styles.instructionDescription}>
            {scanned
              ? 'Your QR code has been captured.'
              : 'Position the event QR code inside the frame.'}
          </Text>

          <View
            style={[
              styles.scanFrame,
              scanned && success && styles.scanFrameSuccess,
              scanned && !success && styles.scanFrameDetected,
            ]}
          >
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {!scanned && (
              <View style={styles.scanCenter}>
                <View style={styles.scanCenterIcon}>
                  <Ionicons
                    name="qr-code-outline"
                    size={54}
                    color="rgba(255,255,255,0.85)"
                  />
                </View>

                <View style={styles.scanLine} />
              </View>
            )}

            {scanned && (
              <View style={styles.detectedIcon}>
                <Ionicons
                  name={
                    processing
                      ? 'hourglass-outline'
                      : success
                        ? 'checkmark-circle'
                        : 'alert-circle'
                  }
                  size={61}
                  color="#FFFFFF"
                />
              </View>
            )}
          </View>

          <View style={styles.cameraHint}>
            <Ionicons
              name="scan-outline"
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.cameraHintText}>
              Keep the QR code inside the frame
            </Text>
          </View>
        </View>

        {/* BOTTOM RESULT PANEL */}
        <View style={styles.resultPanel}>
          {!scanned ? (
            <>
              <View style={styles.panelHandle} />

              <View style={styles.readyRow}>
                <View style={styles.readyIcon}>
                  <Ionicons
                    name="qr-code-outline"
                    size={23}
                    color={PURPLE.primary}
                  />
                </View>

                <View style={styles.readyContent}>
                  <Text style={styles.readyTitle}>
                    Ready to Scan
                  </Text>
                  <Text style={styles.readyDescription}>
                    Scan your teacher's event QR code to record attendance.
                  </Text>
                </View>

                <View style={styles.readyIndicator} />
              </View>
            </>
          ) : (
            <>
              <View style={styles.panelHandle} />

              <View style={styles.resultHeading}>
                <View
                  style={[
                    styles.resultIcon,
                    success
                      ? styles.resultIconSuccess
                      : styles.resultIconError,
                  ]}
                >
                  <Ionicons
                    name={
                      processing
                        ? 'hourglass-outline'
                        : success
                          ? 'checkmark-circle-outline'
                          : 'alert-circle-outline'
                    }
                    size={26}
                    color={
                      processing
                        ? PURPLE.primary
                        : success
                          ? '#15803D'
                          : '#B91C1C'
                    }
                  />
                </View>

                <View style={styles.resultHeadingContent}>
                  <Text style={styles.resultPanelTitle}>
                    {processing
                      ? 'Recording Attendance...'
                      : success
                        ? 'Attendance Successful!'
                        : 'Scan Unsuccessful'}
                  </Text>

                  <Text style={styles.resultPanelSubtitle}>
                    {processing
                      ? 'Please wait while we process your attendance.'
                      : success
                        ? 'Your attendance has been recorded.'
                        : 'We could not record your attendance.'}
                  </Text>
                </View>
              </View>

              {processing && (
                <ActivityIndicator
                  size="large"
                  color={PURPLE.primary}
                  style={{ marginVertical: 14 }}
                />
              )}

              {!processing && message && (
                <View
                  style={[
                    styles.messageBox,
                    success
                      ? styles.messageSuccess
                      : styles.messageError,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      success
                        ? styles.messageSuccessText
                        : styles.messageErrorText,
                    ]}
                  >
                    {message}
                  </Text>
                </View>
              )}

              {lastData && (
                <View style={styles.scannedDataBox}>
                  <Text style={styles.scannedDataLabel}>
                    SCANNED QR DATA
                  </Text>

                  <Text
                    style={styles.scannedData}
                    numberOfLines={3}
                  >
                    {lastData}
                  </Text>
                </View>
              )}

              {!processing && (
                <View style={styles.scanAgainButton}>
                  <AppButton
                    theme="primary"
                    title="Scan Again"
                    icon="refresh"
                    onPress={handleScanAgain}
                  />
                </View>
              )}
            </>
          )}
        </View>

        {/* FOOTER */}
        <View style={styles.cameraFooter}>
          <Ionicons
            name="shield-checkmark-outline"
            size={15}
            color="rgba(255,255,255,0.75)"
          />
          <Text style={styles.cameraFooterText}>
            QRATT AA • SECURE ATTENDANCE
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: '#FAF9FE',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: PURPLE.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: PURPLE.dark,
    marginTop: 18,
    textAlign: 'center',
  },
  lockIcon: {
    width: 78,
    height: 78,
    borderRadius: 25,
    backgroundColor: PURPLE.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: PURPLE.dark,
    marginTop: 20,
    textAlign: 'center',
  },
  lockMessage: {
    fontSize: 13,
    color: PURPLE.muted,
    marginTop: 9,
    textAlign: 'center',
    lineHeight: 21,
  },

  // PERMISSION SCREEN
  permissionScreen: {
    flex: 1,
    backgroundColor: '#FAF9FE',
  },
  permissionHeader: {
    backgroundColor: PURPLE.dark,
    paddingTop: 30,
    paddingHorizontal: 24,
    paddingBottom: 45,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  brand: {
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#FFFFFF',
  },
  permissionEyebrow: {
    fontSize: 9,
    letterSpacing: 1.4,
    fontWeight: '700',
    color: '#D8C8FF',
    marginTop: 6,
  },
  permissionContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 25,
    paddingBottom: 30,
  },
  permissionIcon: {
    width: 105,
    height: 105,
    borderRadius: 33,
    backgroundColor: PURPLE.pale,
    borderWidth: 1,
    borderColor: PURPLE.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: PURPLE.dark,
    textAlign: 'center',
  },
  permissionDescription: {
    fontSize: 13,
    lineHeight: 21,
    color: PURPLE.muted,
    textAlign: 'center',
    marginTop: 12,
  },
  permissionInfo: {
    width: '100%',
    backgroundColor: PURPLE.pale,
    borderRadius: 15,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    gap: 10,
  },
  permissionInfoText: {
    flex: 1,
    fontSize: 11,
    color: PURPLE.deep,
    lineHeight: 17,
  },
  permissionButton: {
    width: '100%',
    marginTop: 25,
  },

  // CAMERA
  cameraScreen: {
    flex: 1,
    backgroundColor: '#171024',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(20, 10, 35, 0.26)',
  },

  // CAMERA HEADER
  cameraHeader: {
    paddingTop: Platform.OS === 'android' ? 22 : 25,
    paddingHorizontal: 22,
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(32,16,57,0.78)',
  },
  cameraBrand: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 2,
  },
  cameraSubtitle: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.3,
    color: '#D8C8FF',
    marginTop: 4,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: 20,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: '#86EFAC',
    marginRight: 7,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  // SCANNER AREA
  scannerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 25,
  },
  instructionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionDescription: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 35,
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  scanFrameSuccess: {
    borderColor: '#86EFAC',
  },
  scanFrameDetected: {
    borderColor: '#FCA5A5',
  },
  corner: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderColor: '#FFFFFF',
    borderWidth: 5,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 13,
  },
  topRight: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 13,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 13,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 13,
  },
  scanCenter: {
    width: '75%',
    height: '75%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanCenterIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 2,
    backgroundColor: '#C4B5FD',
    opacity: 0.9,
  },
  detectedIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    gap: 9,
  },
  cameraHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // RESULT PANEL
  resultPanel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
    paddingHorizontal: 21,
    paddingTop: 12,
    paddingBottom: 18,
  },
  panelHandle: {
    width: 38,
    height: 4,
    borderRadius: 5,
    backgroundColor: '#E5DDF0',
    alignSelf: 'center',
    marginBottom: 17,
  },
  readyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  readyIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: PURPLE.pale,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  readyContent: {
    flex: 1,
  },
  readyTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: PURPLE.dark,
  },
  readyDescription: {
    fontSize: 10,
    lineHeight: 16,
    color: PURPLE.muted,
    marginTop: 5,
  },
  readyIndicator: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    marginLeft: 8,
  },
  resultHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  resultIcon: {
    width: 49,
    height: 49,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultIconSuccess: {
    backgroundColor: '#DCFCE7',
  },
  resultIconError: {
    backgroundColor: '#FEE2E2',
  },
  resultHeadingContent: {
    flex: 1,
  },
  resultPanelTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: PURPLE.dark,
  },
  resultPanelSubtitle: {
    fontSize: 10,
    color: PURPLE.muted,
    marginTop: 5,
    lineHeight: 15,
  },
  messageBox: {
    padding: 13,
    borderRadius: 13,
    marginBottom: 13,
  },
  messageSuccess: {
    backgroundColor: '#DCFCE7',
  },
  messageError: {
    backgroundColor: '#FEE2E2',
  },
  messageText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  messageSuccessText: {
    color: '#166534',
  },
  messageErrorText: {
    color: '#991B1B',
  },
  scannedDataBox: {
    backgroundColor: '#FAF9FE',
    borderWidth: 1,
    borderColor: PURPLE.border,
    borderRadius: 12,
    padding: 11,
    marginBottom: 14,
  },
  scannedDataLabel: {
    fontSize: 8,
    letterSpacing: 1,
    fontWeight: '900',
    color: PURPLE.muted,
    marginBottom: 6,
  },
  scannedData: {
    fontSize: 10,
    color: PURPLE.deep,
    lineHeight: 15,
  },
  scanAgainButton: {
    marginTop: 3,
  },

  // FOOTER
  cameraFooter: {
    backgroundColor: 'rgba(32,16,57,0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 7,
  },
  cameraFooterText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.85)',
  },
});
