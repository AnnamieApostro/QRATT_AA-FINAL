
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/constants/colors';

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

export default function StudentDashboard() {
  const { user } = useAuth();

  const [attendanceCount, setAttendanceCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const studentName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Student';

  const firstName = studentName.trim().split(' ')[0] || 'Student';

  const loadDashboard = useCallback(async () => {
    if (!user?.id) {
      setError('Please sign in to access your dashboard.');
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const { count, error: attendanceError } = await supabase
        .from('attendance')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', user.id);

      if (attendanceError) {
        throw attendanceError;
      }

      setAttendanceCount(count ?? 0);
    } catch (err) {
      console.error('Student dashboard error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load attendance information.'
      );
    }
  }, [user?.id]);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      setLoading(true);
      await loadDashboard();

      if (mounted) {
        setLoading(false);
      }
    }

    void initialize();

    return () => {
      mounted = false;
    };
  }, [loadDashboard]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const navigateTo = (path: string) => {
    router.push(path as any);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingLogo}>
          <Ionicons name="qr-code-outline" size={35} color={PURPLE.white} />
        </View>
        <ActivityIndicator
          size="large"
          color={PURPLE.primary}
          style={styles.loader}
        />
        <Text style={styles.loadingTitle}>Preparing your dashboard</Text>
        <Text style={styles.loadingSubtitle}>
          Please wait a moment...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE.dark} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={PURPLE.primary}
            colors={[PURPLE.primary]}
          />
        }
      >
        {/* PREMIUM HEADER */}
        <View style={styles.hero}>
          <View style={styles.heroDecorationOne} />
          <View style={styles.heroDecorationTwo} />

          <View style={styles.topBar}>
            <View>
              <Text style={styles.brand}>QRATT AA</Text>
              <Text style={styles.brandCaption}>
                QR ATTENDANCE SYSTEM
              </Text>
            </View>

            <Pressable
              style={styles.profileButton}
              onPress={() => navigateTo('/(tabs)/profile')}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
            >
              <Ionicons
                name="person-outline"
                size={22}
                color={PURPLE.white}
              />
            </Pressable>
          </View>

          <View style={styles.greetingSection}>
            <Text style={styles.greetingSmall}>WELCOME BACK</Text>
            <Text style={styles.greetingTitle}>
              Hello, {firstName}!
            </Text>
            <Text style={styles.greetingDescription}>
              Ready to keep your attendance on track?
            </Text>
          </View>

          <View style={styles.heroBottom}>
            <View style={styles.studentBadge}>
              <Ionicons
                name="school-outline"
                size={16}
                color={PURPLE.white}
              />
              <Text style={styles.studentBadgeText}>STUDENT PORTAL</Text>
            </View>

            <Ionicons
              name="qr-code-outline"
              size={54}
              color="rgba(255,255,255,0.25)"
            />
          </View>
        </View>

        {/* MAIN CONTENT */}
        <View style={styles.mainContent}>
          {/* ATTENDANCE SUMMARY */}
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>My Overview</Text>
              <Text style={styles.sectionSubtitle}>
                Your attendance at a glance
              </Text>
            </View>

            <View style={styles.overviewIcon}>
              <Ionicons
                name="analytics-outline"
                size={21}
                color={PURPLE.primary}
              />
            </View>
          </View>

          <View style={styles.statsCard}>
            <View style={styles.statsTop}>
              <View style={styles.statsIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={25}
                  color={PURPLE.primary}
                />
              </View>

              <View style={styles.statsTag}>
                <View style={styles.statusDot} />
                <Text style={styles.statsTagText}>YOUR RECORDS</Text>
              </View>
            </View>

            <Text style={styles.statsNumber}>{attendanceCount}</Text>
            <Text style={styles.statsLabel}>Recorded Attendance</Text>
            <Text style={styles.statsDescription}>
              Total attendance records under your account.
            </Text>

            <View style={styles.statsDivider} />

            <View style={styles.statsFooter}>
              <Ionicons
                name="shield-checkmark-outline"
                size={17}
                color={PURPLE.primary}
              />
              <Text style={styles.statsFooterText}>
                Your attendance information is connected to your account.
              </Text>
            </View>
          </View>

          {/* ERROR MESSAGE */}
          {error && (
            <View style={styles.errorCard}>
              <Ionicons
                name="alert-circle-outline"
                size={23}
                color="#DC2626"
              />
              <View style={styles.errorContent}>
                <Text style={styles.errorTitle}>
                  Unable to load attendance
                </Text>
                <Text style={styles.errorText}>{error}</Text>

                <Pressable
                  onPress={handleRefresh}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* QUICK ACTIONS */}
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <Text style={styles.sectionSubtitle}>
                Everything you need in one place
              </Text>
            </View>
          </View>

          {/* SCAN QR */}
          <Pressable
            style={({ pressed }) => [
              styles.scanCard,
              pressed && styles.pressed,
            ]}
            onPress={() => navigateTo('/(tabs)/scan')}
            accessibilityRole="button"
          >
            <View style={styles.scanIcon}>
              <Ionicons
                name="qr-code"
                size={29}
                color={PURPLE.white}
              />
            </View>

            <View style={styles.actionContent}>
              <Text style={styles.scanTitle}>Scan QR Code</Text>
              <Text style={styles.scanDescription}>
                Scan your teacher's attendance QR code.
              </Text>
            </View>

            <View style={styles.scanArrow}>
              <Ionicons
                name="arrow-forward"
                size={19}
                color={PURPLE.primary}
              />
            </View>
          </Pressable>

          {/* ATTENDANCE HISTORY */}
          <Pressable
            style={({ pressed }) => [
              styles.actionCard,
              pressed && styles.pressed,
            ]}
            onPress={() => navigateTo('/(tabs)/history')}
            accessibilityRole="button"
          >
            <View style={styles.actionIcon}>
              <Ionicons
                name="time-outline"
                size={25}
                color={PURPLE.primary}
              />
            </View>

            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>
                Attendance History
              </Text>
              <Text style={styles.actionDescription}>
                Review your previous attendance records.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={21}
              color={PURPLE.light}
            />
          </Pressable>

          {/* PROFILE */}
          <Pressable
            style={({ pressed }) => [
              styles.actionCard,
              pressed && styles.pressed,
            ]}
            onPress={() => navigateTo('/(tabs)/profile')}
            accessibilityRole="button"
          >
            <View style={styles.actionIcon}>
              <Ionicons
                name="person-outline"
                size={25}
                color={PURPLE.primary}
              />
            </View>

            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>My Profile</Text>
              <Text style={styles.actionDescription}>
                View your account information.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={21}
              color={PURPLE.light}
            />
          </Pressable>

          {/* INFORMATION CARD */}
          <View style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Ionicons
                name="information-circle-outline"
                size={23}
                color={PURPLE.primary}
              />
            </View>

            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Attendance reminder</Text>
              <Text style={styles.tipDescription}>
                Always check that you are scanning the correct QR code
                provided by your teacher.
              </Text>
            </View>
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <View style={styles.footerLine} />
            <Text style={styles.footerBrand}>QRATT AA</Text>
            <Text style={styles.footerText}>
              STUDENT ATTENDANCE PORTAL
            </Text>
            <Text style={styles.footerCopyright}>
              Made for smarter attendance tracking.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAF9FE',
  },

  container: {
    flex: 1,
    backgroundColor: '#FAF9FE',
  },

  content: {
    paddingBottom: 35,
  },

  // LOADING
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF9FE',
  },

  loadingLogo: {
    width: 76,
    height: 76,
    borderRadius: 25,
    backgroundColor: PURPLE.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loader: {
    marginTop: 28,
  },

  loadingTitle: {
    marginTop: 17,
    fontSize: 17,
    fontWeight: '800',
    color: PURPLE.dark,
  },

  loadingSubtitle: {
    marginTop: 7,
    fontSize: 13,
    color: PURPLE.muted,
  },

  // HERO HEADER
  hero: {
    backgroundColor: PURPLE.dark,
    paddingTop: 23,
    paddingHorizontal: 23,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },

  heroDecorationOne: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(167,139,250,0.12)',
    top: -105,
    right: -45,
  },

  heroDecorationTwo: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -85,
    left: 80,
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  brand: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    color: PURPLE.white,
  },

  brandCaption: {
    fontSize: 8,
    letterSpacing: 2,
    fontWeight: '700',
    color: '#D8C8FF',
    marginTop: 4,
  },

  profileButton: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },

  greetingSection: {
    marginTop: 37,
  },

  greetingSmall: {
    color: '#D8C8FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },

  greetingTitle: {
    fontSize: 31,
    fontWeight: '900',
    color: PURPLE.white,
    marginTop: 9,
  },

  greetingDescription: {
    fontSize: 13,
    color: '#E9DFFF',
    marginTop: 8,
  },

  heroBottom: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  studentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 20,
  },

  studentBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: PURPLE.white,
    marginLeft: 7,
  },

  // MAIN CONTENT
  mainContent: {
    paddingHorizontal: 21,
    paddingTop: 28,
  },

  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: PURPLE.dark,
  },

  sectionSubtitle: {
    fontSize: 11,
    color: PURPLE.muted,
    marginTop: 5,
  },

  overviewIcon: {
    width: 41,
    height: 41,
    borderRadius: 14,
    backgroundColor: PURPLE.pale,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ATTENDANCE CARD
  statsCard: {
    backgroundColor: PURPLE.white,
    borderRadius: 23,
    padding: 21,
    borderWidth: 1,
    borderColor: PURPLE.border,
    marginBottom: 29,
    shadowColor: PURPLE.dark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },

  statsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statsIcon: {
    width: 49,
    height: 49,
    borderRadius: 16,
    backgroundColor: PURPLE.pale,
    justifyContent: 'center',
    alignItems: 'center',
  },

  statsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F0FF',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 15,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#8B5CF6',
    marginRight: 6,
  },

  statsTagText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: PURPLE.deep,
  },

  statsNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: PURPLE.primary,
    marginTop: 18,
  },

  statsLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: PURPLE.dark,
    marginTop: 1,
  },

  statsDescription: {
    fontSize: 11,
    color: PURPLE.muted,
    marginTop: 7,
    lineHeight: 17,
  },

  statsDivider: {
    height: 1,
    backgroundColor: PURPLE.border,
    marginVertical: 17,
  },

  statsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statsFooterText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 10,
    color: PURPLE.muted,
    lineHeight: 16,
  },

  // ERROR
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 15,
    borderRadius: 17,
    marginBottom: 25,
  },

  errorContent: {
    flex: 1,
    marginLeft: 10,
  },

  errorTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B91C1C',
  },

  errorText: {
    fontSize: 11,
    color: '#991B1B',
    marginTop: 5,
    lineHeight: 17,
  },

  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 7,
    paddingHorizontal: 13,
    backgroundColor: '#FEE2E2',
    borderRadius: 9,
  },

  retryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B91C1C',
  },

  // ACTION CARDS
  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PURPLE.pale,
    borderRadius: 20,
    padding: 17,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#DDD0F7',
  },

  scanIcon: {
    width: 51,
    height: 51,
    borderRadius: 16,
    backgroundColor: PURPLE.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  scanTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: PURPLE.dark,
  },

  scanDescription: {
    fontSize: 10,
    color: PURPLE.muted,
    marginTop: 5,
    lineHeight: 16,
  },

  scanArrow: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: PURPLE.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PURPLE.white,
    borderWidth: 1,
    borderColor: PURPLE.border,
    borderRadius: 19,
    padding: 15,
    marginBottom: 12,
  },

  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: PURPLE.pale,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  actionContent: {
    flex: 1,
  },

  actionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: PURPLE.dark,
  },

  actionDescription: {
    fontSize: 10,
    color: PURPLE.muted,
    marginTop: 5,
    lineHeight: 15,
  },

  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.985 }],
  },

  // TIP
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F3EEFF',
    borderRadius: 17,
    padding: 15,
    marginTop: 17,
    borderWidth: 1,
    borderColor: PURPLE.border,
  },

  tipIcon: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: PURPLE.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tipContent: {
    flex: 1,
    marginLeft: 11,
  },

  tipTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: PURPLE.dark,
  },

  tipDescription: {
    fontSize: 10,
    color: PURPLE.muted,
    lineHeight: 16,
    marginTop: 5,
  },

  // FOOTER
  footer: {
    alignItems: 'center',
    marginTop: 36,
    paddingBottom: 10,
  },

  footerLine: {
    width: 42,
    height: 4,
    borderRadius: 5,
    backgroundColor: '#D8C8FF',
    marginBottom: 16,
  },

  footerBrand: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
    color: PURPLE.deep,
  },

  footerText: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: PURPLE.muted,
    marginTop: 5,
  },

  footerCopyright: {
    fontSize: 10,
    color: '#A99BBF',
    marginTop: 10,
  },
});
