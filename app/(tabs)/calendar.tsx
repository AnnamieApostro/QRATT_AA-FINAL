
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/lib/auth';
import {
  getAttendanceHistory,
  getTeacherEventAttendance,
  type AttendanceRecord,
  type TeacherEventAttendance,
} from '@/lib/attendance';
import { getProfile, type Role } from '@/lib/profiles';

const COLORS = {
  dark: '#4C1D95',
  deep: '#5B21B6',
  primary: '#7C3AED',
  light: '#A78BFA',
  pale: '#F5F0FF',
  white: '#FFFFFF',
  text: '#2E1065',
  muted: '#8B7AA8',
  border: '#EDE5FA',
  background: '#FBF9FF',
  green: '#16A34A',
  greenPale: '#DCFCE7',
};

type CalendarEntry = {
  id: string;
  title: string;
  date: string;
  time: string;
  detail: string;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function dateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatSelectedDate(key: string) {
  const date = new Date(`${key}T12:00:00`);
  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function CalendarScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));

  const loadCalendar = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const profile = await getProfile(user.id);
      const currentRole = profile?.role ?? 'student';
      setRole(currentRole);

      if (currentRole === 'teacher') {
        const events = await getTeacherEventAttendance(user.id);

        const teacherEntries: CalendarEntry[] = events.flatMap(
          (event: TeacherEventAttendance) =>
            event.attendees.map((attendee) => ({
              id: `${event.eventId}-${attendee.studentId}-${attendee.scannedAt}`,
              title: event.title,
              date: dateKey(attendee.scannedAt),
              time: formatTime(attendee.scannedAt),
              detail: `Student ID: ${attendee.studentId}`,
            }))
        );

        setEntries(teacherEntries.filter((entry) => entry.date));
      } else if (currentRole === 'student') {
        const records = await getAttendanceHistory(user.id);

        const studentEntries: CalendarEntry[] = records.map(
          (record: AttendanceRecord) => ({
            id: record.id,
            title: record.eventTitle || 'Attendance recorded',
            date: dateKey(record.scannedAt),
            time: formatTime(record.scannedAt),
            detail: `Event code: ${record.eventId || 'Not available'}`,
          })
        );

        setEntries(studentEntries.filter((entry) => entry.date));
      } else {
        setEntries([]);
      }
    } catch (err) {
      console.error('Calendar loading error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load attendance calendar.'
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadCalendar();
    }, [loadCalendar])
  );

  const entriesByDate = useMemo(() => {
    const grouped: Record<string, CalendarEntry[]> = {};

    entries.forEach((entry) => {
      if (!grouped[entry.date]) grouped[entry.date] = [];
      grouped[entry.date].push(entry);
    });

    return grouped;
  }, [entries]);

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
  }, [year, month]);

  const selectedEntries = entriesByDate[selectedDate] ?? [];

  const monthEntries = entries.filter((entry) => {
    const date = new Date(`${entry.date}T12:00:00`);
    return date.getFullYear() === year && date.getMonth() === month;
  });

  const uniqueAttendanceDays = new Set(
    monthEntries.map((entry) => entry.date)
  ).size;

  const goToMonth = (direction: number) => {
    setVisibleMonth(new Date(year, month + direction, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(dateKey(today));
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your calendar...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerScreen}>
        <Ionicons
          name="cloud-offline-outline"
          size={42}
          color={COLORS.primary}
        />
        <Text style={styles.errorTitle}>Unable to load calendar</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadCalendar}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (role === 'admin') {
    return (
      <View style={styles.centerScreen}>
        <Ionicons name="calendar-outline" size={44} color={COLORS.primary} />
        <Text style={styles.errorTitle}>Calendar not available</Text>
        <Text style={styles.errorText}>
          The attendance calendar is currently available for student and
          teacher accounts.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" />

      <View style={styles.heading}>
        <View>
          <Text style={styles.eyebrow}>ATTENDANCE TRACKER</Text>
          <Text style={styles.title}>Calendar</Text>
          <Text style={styles.subtitle}>
            {role === 'teacher'
              ? 'View attendance for your events.'
              : 'Keep track of your attendance records.'}
          </Text>
        </View>

        <View style={styles.headingIcon}>
          <Ionicons name="calendar" size={27} color={COLORS.white} />
        </View>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statsIcon}>
          <Ionicons name="checkmark-circle" size={25} color={COLORS.primary} />
        </View>
        <View style={styles.statsText}>
          <Text style={styles.statsLabel}>Recorded attendance days</Text>
          <Text style={styles.statsNumber}>{uniqueAttendanceDays}</Text>
          <Text style={styles.statsCaption}>
            {MONTHS[month]} {year}
          </Text>
        </View>
        <View style={styles.statsRight}>
          <Text style={styles.statsRightNumber}>{monthEntries.length}</Text>
          <Text style={styles.statsRightLabel}>Records</Text>
        </View>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.monthHeader}>
          <TouchableOpacity
            style={styles.arrowButton}
            onPress={() => goToMonth(-1)}
            accessibilityLabel="Previous month"
          >
            <Ionicons name="chevron-back" size={21} color={COLORS.deep} />
          </TouchableOpacity>

          <View style={styles.monthTitleWrap}>
            <Text style={styles.monthTitle}>
              {MONTHS[month]} {year}
            </Text>
            <TouchableOpacity onPress={goToToday}>
              <Text style={styles.todayLink}>Go to today</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.arrowButton}
            onPress={() => goToMonth(1)}
            accessibilityLabel="Next month"
          >
            <Ionicons name="chevron-forward" size={21} color={COLORS.deep} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((day) => (
            <Text key={day} style={styles.weekday}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }

            const key = dateKey(new Date(year, month, day));
            const hasAttendance = Boolean(entriesByDate[key]?.length);
            const isSelected = selectedDate === key;
            const isToday = dateKey(new Date()) === key;

            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.dayCell,
                  isSelected && styles.selectedDayCell,
                ]}
                onPress={() => setSelectedDate(key)}
                accessibilityLabel={`${MONTHS[month]} ${day}${
                  hasAttendance ? ', attendance recorded' : ''
                }`}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    isSelected && styles.selectedDayNumber,
                    isToday && !isSelected && styles.todayNumber,
                  ]}
                >
                  {day}
                </Text>

                {hasAttendance && (
                  <View
                    style={[
                      styles.dayDot,
                      isSelected && styles.selectedDayDot,
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>Attendance recorded</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.todayLegend} />
            <Text style={styles.legendText}>Today</Text>
          </View>
        </View>
      </View>

      <View style={styles.detailsHeader}>
        <View>
          <Text style={styles.detailsTitle}>Attendance details</Text>
          <Text style={styles.detailsDate}>
            {formatSelectedDate(selectedDate)}
          </Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{selectedEntries.length}</Text>
        </View>
      </View>

      {selectedEntries.length > 0 ? (
        selectedEntries.map((entry) => (
          <View key={entry.id} style={styles.entryCard}>
            <View style={styles.entryIcon}>
              <Ionicons
                name="checkmark-circle"
                size={23}
                color={COLORS.green}
              />
            </View>
            <View style={styles.entryInfo}>
              <Text style={styles.entryTitle}>{entry.title}</Text>
              <Text style={styles.entryTime}>
                <Ionicons name="time-outline" size={13} color={COLORS.muted} />
                {'  '}{entry.time}
              </Text>
              <Text style={styles.entryDetail} numberOfLines={2}>
                {entry.detail}
              </Text>
            </View>
            <View style={styles.presentBadge}>
              <Text style={styles.presentText}>Present</Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="calendar-clear-outline"
              size={30}
              color={COLORS.light}
            />
          </View>
          <Text style={styles.emptyTitle}>No attendance records</Text>
          <Text style={styles.emptyText}>
            There are no recorded attendance entries for this date.
          </Text>
        </View>
      )}

      <Text style={styles.footerNote}>
        Only recorded attendance is displayed. An empty date does not
        automatically mean absent.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    paddingBottom: 35,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.muted,
    marginTop: 14,
    fontSize: 14,
  },
  centerScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 5,
  },
  headingIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statsIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.pale,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  statsText: {
    flex: 1,
  },
  statsLabel: {
    color: COLORS.muted,
    fontSize: 11,
  },
  statsNumber: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: '800',
    marginTop: 1,
  },
  statsCaption: {
    color: COLORS.muted,
    fontSize: 10,
  },
  statsRight: {
    alignItems: 'flex-end',
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  statsRightNumber: {
    color: COLORS.primary,
    fontSize: 21,
    fontWeight: '800',
  },
  statsRightLabel: {
    color: COLORS.muted,
    fontSize: 10,
  },
  calendarCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleWrap: {
    alignItems: 'center',
  },
  monthTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  todayLink: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 47,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    marginBottom: 3,
  },
  selectedDayCell: {
    backgroundColor: COLORS.primary,
  },
  dayNumber: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  selectedDayNumber: {
    color: COLORS.white,
    fontWeight: '800',
  },
  todayNumber: {
    color: COLORS.primary,
    fontWeight: '900',
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.green,
    marginTop: 3,
  },
  selectedDayDot: {
    backgroundColor: COLORS.white,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 14,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.green,
  },
  todayLegend: {
    width: 9,
    height: 9,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  legendText: {
    color: COLORS.muted,
    fontSize: 10,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 13,
  },
  detailsTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  detailsDate: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
  },
  countBadge: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: COLORS.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 12,
  },
  entryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  entryInfo: {
    flex: 1,
  },
  entryTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },
  entryTime: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 5,
  },
  entryDetail: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
  },
  presentBadge: {
    backgroundColor: COLORS.greenPale,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginLeft: 6,
  },
  presentText: {
    color: COLORS.green,
    fontSize: 9,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: COLORS.pale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 6,
  },
  footerNote: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 17,
  },
  errorTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 14,
  },
  errorText: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 7,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 11,
    marginTop: 18,
  },
  retryText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 12,
  },
});
