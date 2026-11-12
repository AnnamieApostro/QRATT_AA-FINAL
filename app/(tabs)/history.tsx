
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/lib/auth';
import {
  getAttendanceHistory,
  getTeacherEventAttendance,
  getTeacherEventSummary,
  type AttendanceRecord,
  type TeacherEventAttendance,
  type TeacherEventSummary,
} from '@/lib/attendance';
import { getProfile, type Role } from '@/lib/profiles';

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

export default function HistoryScreen() {
  const [role, setRole] = useState<Role | null>(null);

  const [studentRecords, setStudentRecords] = useState<
    AttendanceRecord[]
  >([]);

  const [teacherEvents, setTeacherEvents] = useState<
    TeacherEventAttendance[]
  >([]);

  const [teacherSummaries, setTeacherSummaries] = useState<
    TeacherEventSummary[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  const load = useCallback(async () => {
    if (!user) {
      setRole(null);
      setStudentRecords([]);
      setTeacherEvents([]);
      setTeacherSummaries([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);

      const profile = await getProfile(user.id);
      const currentRole = profile?.role ?? 'student';

      setRole(currentRole);

      if (currentRole === 'teacher') {
        const [events, summaries] = await Promise.all([
          getTeacherEventAttendance(user.id),
          getTeacherEventSummary(user.id),
        ]);

        setTeacherEvents(events);
        setTeacherSummaries(summaries);
        setStudentRecords([]);
      } else {
        const records = await getAttendanceHistory(user.id);

        setStudentRecords(records);
        setTeacherEvents([]);
        setTeacherSummaries([]);
      }
    } catch (err) {
      console.error('Attendance history loading error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load attendance records. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  const isTeacher = role === 'teacher';

  const totalStudentRecords = studentRecords.length;

  const totalTeacherAttendees = teacherSummaries.reduce(
    (total, item) => total + item.attendeeCount,
    0
  );

  // LOADING SCREEN
  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar barStyle="light-content" backgroundColor={PURPLE.dark} />

        <View style={styles.loadingIcon}>
          <Ionicons
            name="time-outline"
            size={33}
            color={PURPLE.white}
          />
        </View>

        <ActivityIndicator
          size="large"
          color={PURPLE.primary}
          style={{ marginTop: 20 }}
        />

        <Text style={styles.loadingTitle}>
          Loading attendance history...
        </Text>
      </View>
    );
  }

  // ERROR SCREEN
  if (error) {
    return (
      <View style={styles.errorScreen}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.errorIcon}>
          <Ionicons
            name="cloud-offline-outline"
            size={35}
            color={PURPLE.primary}
          />
        </View>

        <Text style={styles.errorTitle}>
          Unable to Load Records
        </Text>

        <Text style={styles.errorDescription}>{error}</Text>

        <Text
          onPress={handleRefresh}
          style={styles.retryButton}
        >
          Try Again
        </Text>
      </View>
    );
  }

  // TEACHER HISTORY
  if (isTeacher) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor={PURPLE.dark} />

        <FlatList
          data={teacherEvents}
          keyExtractor={(item) => item.eventId}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={PURPLE.primary}
              colors={[PURPLE.primary]}
            />
          }
          ListHeaderComponent={
            <View>
              <View style={styles.hero}>
                <View style={styles.heroDecorationOne} />
                <View style={styles.heroDecorationTwo} />

                <View style={styles.heroTop}>
                  <View>
                    <Text style={styles.brand}>QRATT AA</Text>
                    <Text style={styles.brandCaption}>
                      ATTENDANCE MANAGEMENT SYSTEM
                    </Text>
                  </View>

                  <View style={styles.heroIcon}>
                    <Ionicons
                      name="school-outline"
                      size={25}
                      color="#FFFFFF"
                    />
                  </View>
                </View>

                <View style={styles.heroText}>
                  <Text style={styles.eyebrow}>TEACHER PORTAL</Text>
                  <Text style={styles.heroTitle}>
                    Attendance History
                  </Text>
                  <Text style={styles.heroDescription}>
                    Review your events and monitor student attendance.
                  </Text>
                </View>

                <View style={styles.roleBadge}>
                  <Ionicons
                    name="shield-checkmark"
                    size={15}
                    color="#FFFFFF"
                  />
                  <Text style={styles.roleBadgeText}>
                    TEACHER ACCESS
                  </Text>
                </View>
              </View>

              <View style={styles.mainContent}>
                <View style={styles.sectionHeading}>
                  <View>
                    <Text style={styles.sectionTitle}>
                      Attendance Overview
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                      Summary of your attendance events
                    </Text>
                  </View>

                  <View style={styles.sectionIcon}>
                    <Ionicons
                      name="analytics-outline"
                      size={23}
                      color={PURPLE.primary}
                    />
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <View style={styles.statIcon}>
                      <Ionicons
                        name="calendar-outline"
                        size={21}
                        color={PURPLE.primary}
                      />
                    </View>

                    <Text style={styles.statNumber}>
                      {teacherEvents.length}
                    </Text>

                    <Text style={styles.statLabel}>
                      Total Events
                    </Text>
                  </View>

                  <View style={styles.statCard}>
                    <View style={styles.statIcon}>
                      <Ionicons
                        name="people-outline"
                        size={21}
                        color={PURPLE.primary}
                      />
                    </View>

                    <Text style={styles.statNumber}>
                      {totalTeacherAttendees}
                    </Text>

                    <Text style={styles.statLabel}>
                      Attendance Records
                    </Text>
                  </View>
                </View>

                <View style={styles.sectionHeading}>
                  <View>
                    <Text style={styles.sectionTitle}>
                      Your Events
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                      Event attendance details
                    </Text>
                  </View>

                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
                      {teacherEvents.length}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={37}
                  color={PURPLE.primary}
                />
              </View>

              <Text style={styles.emptyTitle}>
                No Events Yet
              </Text>

              <Text style={styles.emptyDescription}>
                Create an event from the Teacher tab. Your event
                attendance details will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const summary = teacherSummaries.find(
              (entry) => entry.eventId === item.eventId
            );

            const attendeeCount = summary?.attendeeCount ?? 0;

            return (
              <View style={styles.eventCard}>
                <View style={styles.eventCardTop}>
                  <View style={styles.eventIcon}>
                    <Ionicons
                      name="calendar"
                      size={22}
                      color={PURPLE.primary}
                    />
                  </View>

                  <View style={styles.eventCardHeading}>
                    <Text style={styles.eventTitle}>
                      {item.title}
                    </Text>

                    <Text style={styles.eventCode}>
                      {item.eventCode}
                    </Text>
                  </View>

                  <View style={styles.attendanceBadge}>
                    <Ionicons
                      name="people"
                      size={13}
                      color={PURPLE.deep}
                    />
                    <Text style={styles.attendanceBadgeText}>
                      {attendeeCount}
                    </Text>
                  </View>
                </View>

                <View style={styles.eventDivider} />

                <View style={styles.eventMetaRow}>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={PURPLE.muted}
                  />

                  <Text style={styles.eventMeta}>
                    {item.startTime
                      ? `Starts: ${formatDate(item.startTime)}`
                      : 'Start time unavailable'}
                  </Text>
                </View>

                <View style={styles.attendeesSection}>
                  <View style={styles.attendeesHeading}>
                    <Text style={styles.attendeesTitle}>
                      Student Attendance
                    </Text>

                    <Text style={styles.attendeesCount}>
                      {attendeeCount} student
                      {attendeeCount === 1 ? '' : 's'}
                    </Text>
                  </View>

                  {item.attendees.length > 0 ? (
                    item.attendees.map((attendee) => (
                      <View
                        key={`${attendee.studentId}-${attendee.scannedAt}`}
                        style={styles.attendeeRow}
                      >
                        <View style={styles.studentAvatar}>
                          <Ionicons
                            name="person-outline"
                            size={16}
                            color={PURPLE.primary}
                          />
                        </View>

                        <View style={styles.studentInfo}>
                          <Text style={styles.studentName}>
                            Student {shortId(attendee.studentId)}
                          </Text>

                          <Text style={styles.studentTime}>
                            {formatDate(attendee.scannedAt)}
                          </Text>
                        </View>

                        <Ionicons
                          name="checkmark-circle"
                          size={19}
                          color="#16A34A"
                        />
                      </View>
                    ))
                  ) : (
                    <View style={styles.noAttendees}>
                      <Ionicons
                        name="people-outline"
                        size={20}
                        color={PURPLE.muted}
                      />

                      <Text style={styles.noAttendeesText}>
                        No students have attended this event yet.
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            <View style={styles.footer}>
              <View style={styles.footerLine} />
              <Text style={styles.footerBrand}>QRATT AA</Text>
              <Text style={styles.footerCaption}>
                TEACHER ATTENDANCE PORTAL
              </Text>
            </View>
          }
        />
      </View>
    );
  }

  // STUDENT HISTORY
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE.dark} />

      <FlatList
        data={studentRecords}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={PURPLE.primary}
            colors={[PURPLE.primary]}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <View style={styles.heroDecorationOne} />
              <View style={styles.heroDecorationTwo} />

              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.brand}>QRATT AA</Text>
                  <Text style={styles.brandCaption}>
                    ATTENDANCE MANAGEMENT SYSTEM
                  </Text>
                </View>

                <View style={styles.heroIcon}>
                  <Ionicons
                    name="time-outline"
                    size={25}
                    color="#FFFFFF"
                  />
                </View>
              </View>

              <View style={styles.heroText}>
                <Text style={styles.eyebrow}>STUDENT PORTAL</Text>
                <Text style={styles.heroTitle}>
                  Attendance History
                </Text>
                <Text style={styles.heroDescription}>
                  Keep track of your event attendance records.
                </Text>
              </View>

              <View style={styles.roleBadge}>
                <Ionicons
                  name="person-circle-outline"
                  size={16}
                  color="#FFFFFF"
                />
                <Text style={styles.roleBadgeText}>
                  STUDENT ACCESS
                </Text>
              </View>
            </View>

            <View style={styles.mainContent}>
              <View style={styles.sectionHeading}>
                <View>
                  <Text style={styles.sectionTitle}>
                    Your Overview
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    Your recorded attendance
                  </Text>
                </View>

                <View style={styles.sectionIcon}>
                  <Ionicons
                    name="stats-chart-outline"
                    size={22}
                    color={PURPLE.primary}
                  />
                </View>
              </View>

              <View style={styles.studentSummaryCard}>
                <View style={styles.summaryIcon}>
                  <Ionicons
                    name="checkmark-done-circle-outline"
                    size={28}
                    color={PURPLE.primary}
                  />
                </View>

                <View style={styles.summaryContent}>
                  <Text style={styles.summaryNumber}>
                    {totalStudentRecords}
                  </Text>
                  <Text style={styles.summaryLabel}>
                    Total Attendance Records
                  </Text>
                </View>

                <View style={styles.summaryDecoration} />
              </View>

              <View style={styles.sectionHeading}>
                <View>
                  <Text style={styles.sectionTitle}>
                    Recent Records
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    Your event attendance history
                  </Text>
                </View>

                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {studentRecords.length}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="calendar-outline"
                size={38}
                color={PURPLE.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No Attendance Records
            </Text>

            <Text style={styles.emptyDescription}>
              You have no attendance records yet. Scan an event
              QR code using the Scan tab to register your attendance.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.studentRecordCard}>
            <View style={styles.recordIcon}>
              <Ionicons
                name="calendar"
                size={22}
                color={PURPLE.primary}
              />
            </View>

            <View style={styles.recordContent}>
              <Text style={styles.eventTitle}>
                {item.eventTitle}
              </Text>

              <Text style={styles.eventCode}>
                {item.eventId}
              </Text>

              <View style={styles.recordTime}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={PURPLE.muted}
                />

                <Text style={styles.recordTimeText}>
                  {formatDate(item.scannedAt)}
                </Text>
              </View>
            </View>

            <View style={styles.recordCheck}>
              <Ionicons
                name="checkmark-circle"
                size={23}
                color="#16A34A"
              />
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <View style={styles.footerLine} />
            <Text style={styles.footerBrand}>QRATT AA</Text>
            <Text style={styles.footerCaption}>
              STUDENT ATTENDANCE PORTAL
            </Text>
          </View>
        }
      />
    </View>
  );
}

function formatDate(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return date.toLocaleString();
}

function shortId(id: string) {
  return id ? `…${id.slice(-8)}` : 'unknown';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAF9FE',
  },

  listContent: {
    paddingBottom: 30,
    flexGrow: 1,
  },

  // LOADING
  loadingScreen: {
    flex: 1,
    backgroundColor: '#FAF9FE',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 25,
  },

  loadingIcon: {
    width: 75,
    height: 75,
    borderRadius: 24,
    backgroundColor: PURPLE.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: PURPLE.dark,
    marginTop: 17,
  },

  // ERROR
  errorScreen: {
    flex: 1,
    backgroundColor: '#FAF9FE',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  errorIcon: {
    width: 75,
    height: 75,
    borderRadius: 24,
    backgroundColor: PURPLE.pale,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: PURPLE.dark,
    marginTop: 20,
    textAlign: 'center',
  },

  errorDescription: {
    fontSize: 12,
    color: PURPLE.muted,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 10,
  },

  retryButton: {
    color: PURPLE.primary,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 22,
    padding: 12,
  },

  // HERO
  hero: {
    backgroundColor: PURPLE.dark,
    paddingTop: 24,
    paddingHorizontal: 23,
    paddingBottom: 26,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },

  heroDecorationOne: {
    position: 'absolute',
    width: 205,
    height: 205,
    borderRadius: 105,
    backgroundColor: 'rgba(167,139,250,0.12)',
    top: -105,
    right: -45,
  },

  heroDecorationTwo: {
    position: 'absolute',
    width: 145,
    height: 145,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -85,
    left: 90,
  },

  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  brand: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#FFFFFF',
  },

  brandCaption: {
    fontSize: 8,
    letterSpacing: 1.4,
    fontWeight: '700',
    color: '#D8C8FF',
    marginTop: 4,
  },

  heroIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  heroText: {
    marginTop: 35,
  },

  eyebrow: {
    color: '#D8C8FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },

  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 9,
  },

  heroDescription: {
    fontSize: 12,
    lineHeight: 19,
    color: '#E9DFFF',
    marginTop: 8,
  },

  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 20,
    marginTop: 23,
  },

  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#FFFFFF',
    marginLeft: 7,
  },

  // MAIN CONTENT
  mainContent: {
    paddingHorizontal: 21,
    paddingTop: 26,
  },

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    marginTop: 5,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: PURPLE.dark,
  },

  sectionSubtitle: {
    fontSize: 11,
    color: PURPLE.muted,
    marginTop: 5,
  },

  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: PURPLE.pale,
    justifyContent: 'center',
    alignItems: 'center',
  },

  countBadge: {
    minWidth: 35,
    height: 35,
    paddingHorizontal: 9,
    borderRadius: 12,
    backgroundColor: PURPLE.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },

  countBadgeText: {
    color: PURPLE.deep,
    fontSize: 13,
    fontWeight: '900',
  },

  // STUDENT SUMMARY
  studentSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PURPLE.border,
    padding: 18,
    marginBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: PURPLE.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  summaryIcon: {
    width: 53,
    height: 53,
    borderRadius: 17,
    backgroundColor: PURPLE.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryContent: {
    marginLeft: 14,
    flex: 1,
  },

  summaryNumber: {
    fontSize: 27,
    fontWeight: '900',
    color: PURPLE.deep,
  },

  summaryLabel: {
    fontSize: 11,
    color: PURPLE.muted,
    fontWeight: '600',
    marginTop: 3,
  },

  summaryDecoration: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: PURPLE.pale,
    position: 'absolute',
    right: -24,
    bottom: -27,
  },

  // TEACHER STATS
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: PURPLE.border,
    padding: 14,
    shadowColor: PURPLE.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  statIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: PURPLE.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statNumber: {
    fontSize: 25,
    fontWeight: '900',
    color: PURPLE.deep,
    marginTop: 13,
  },

  statLabel: {
    fontSize: 10,
    color: PURPLE.muted,
    fontWeight: '600',
    marginTop: 5,
    lineHeight: 15,
  },

  // EMPTY STATE
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: PURPLE.border,
    padding: 25,
    marginHorizontal: 21,
    marginTop: 5,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 77,
    height: 77,
    borderRadius: 25,
    backgroundColor: PURPLE.pale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 17,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: PURPLE.dark,
    textAlign: 'center',
  },

  emptyDescription: {
    fontSize: 11,
    color: PURPLE.muted,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 9,
  },

  // TEACHER EVENT CARDS
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: PURPLE.border,
    padding: 16,
    marginHorizontal: 21,
    marginBottom: 15,
    shadowColor: PURPLE.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  eventCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  eventIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: PURPLE.pale,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  eventCardHeading: {
    flex: 1,
  },

  eventTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: PURPLE.dark,
    lineHeight: 20,
  },

  eventCode: {
    fontSize: 10,
    fontWeight: '700',
    color: PURPLE.muted,
    marginTop: 5,
  },

  attendanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PURPLE.pale,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 5,
  },

  attendanceBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: PURPLE.deep,
  },

  eventDivider: {
    height: 1,
    backgroundColor: PURPLE.border,
    marginVertical: 15,
  },

  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  eventMeta: {
    fontSize: 10,
    color: PURPLE.muted,
    flex: 1,
    lineHeight: 16,
  },

  attendeesSection: {
    marginTop: 17,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: PURPLE.border,
  },

  attendeesHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 11,
  },

  attendeesTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: PURPLE.dark,
  },

  attendeesCount: {
    fontSize: 10,
    color: PURPLE.muted,
    fontWeight: '600',
  },

  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F0FA',
  },

  studentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: PURPLE.pale,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  studentInfo: {
    flex: 1,
  },

  studentName: {
    fontSize: 11,
    fontWeight: '800',
    color: PURPLE.dark,
  },

  studentTime: {
    fontSize: 9,
    color: PURPLE.muted,
    marginTop: 4,
  },

  noAttendees: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9FE',
    padding: 12,
    borderRadius: 12,
    gap: 9,
  },

  noAttendeesText: {
    flex: 1,
    fontSize: 10,
    color: PURPLE.muted,
    lineHeight: 16,
  },

  // STUDENT RECORDS
  studentRecordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: PURPLE.border,
    padding: 15,
    marginHorizontal: 21,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: PURPLE.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  recordIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: PURPLE.pale,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  recordContent: {
    flex: 1,
  },

  recordTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
    gap: 6,
  },

  recordTimeText: {
    fontSize: 10,
    color: PURPLE.muted,
    flex: 1,
  },

  recordCheck: {
    marginLeft: 8,
  },

  // FOOTER
  footer: {
    alignItems: 'center',
    marginTop: 27,
    marginBottom: 15,
  },

  footerLine: {
    width: 42,
    height: 4,
    borderRadius: 5,
    backgroundColor: '#D8C8FF',
    marginBottom: 14,
  },

  footerBrand: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
    color: PURPLE.deep,
  },

  footerCaption: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: PURPLE.muted,
    marginTop: 5,
  },
});
