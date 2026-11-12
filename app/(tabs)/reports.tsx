
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

import { useAuth } from '@/lib/auth';
import {
  getAttendanceHistory,
  getTeacherEventAttendance,
  type AttendanceRecord,
  type TeacherEventAttendance,
} from '@/lib/attendance';
import { getProfile, type Role } from '@/lib/profiles';

const C = {
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

type Period = 'daily' | 'weekly' | 'monthly';

type ReportEntry = {
  id: string;
  title: string;
  eventCode: string;
  scannedAt: string;
  studentId?: string;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getPeriodStart(period: Period) {
  const today = startOfDay(new Date());

  if (period === 'daily') return today;

  if (period === 'weekly') {
    const daysSinceMonday = (today.getDay() + 6) % 7;
    today.setDate(today.getDate() - daysSinceMonday);
    return today;
  }

  return new Date(today.getFullYear(), today.getMonth(), 1);
}

function getPeriodLabel(period: Period) {
  const now = new Date();

  if (period === 'daily') {
    return now.toLocaleDateString([], {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  if (period === 'weekly') {
    const start = getPeriodStart('weekly');
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    return `${start.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    })} – ${end.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
  }

  return now.toLocaleDateString([], {
    month: 'long',
    year: 'numeric',
  });
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Time unavailable';

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export default function ReportsScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [period, setPeriod] = useState<Period>('monthly');
  const [entries, setEntries] = useState<ReportEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
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

        const teacherEntries: ReportEntry[] = events.flatMap(
          (event: TeacherEventAttendance) =>
            event.attendees.map((attendee) => ({
              id: `${event.eventId}-${attendee.studentId}-${attendee.scannedAt}`,
              title: event.title,
              eventCode: event.eventCode,
              scannedAt: attendee.scannedAt,
              studentId: attendee.studentId,
            }))
        );

        setEntries(teacherEntries);
      } else if (currentRole === 'student') {
        const records = await getAttendanceHistory(user.id);

        const studentEntries: ReportEntry[] = records.map(
          (record: AttendanceRecord) => ({
            id: record.id,
            title: record.eventTitle || 'Attendance recorded',
            eventCode: record.eventId,
            scannedAt: record.scannedAt,
          })
        );

        setEntries(studentEntries);
      } else {
        setEntries([]);
      }
    } catch (err) {
      console.error('Reports loading error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load attendance reports.'
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadReports();
    }, [loadReports])
  );

  const filteredEntries = useMemo(() => {
    const start = getPeriodStart(period);
    const now = new Date();

    return entries.filter((entry) => {
      const date = new Date(entry.scannedAt);
      return (
        !Number.isNaN(date.getTime()) &&
        date >= start &&
        date <= now
      );
    });
  }, [entries, period]);

  const attendanceDays = useMemo(
    () =>
      new Set(
        filteredEntries.map((entry) => {
          const date = new Date(entry.scannedAt);
          return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        })
      ).size,
    [filteredEntries]
  );

  const eventSummaries = useMemo(() => {
    const grouped: Record<
      string,
      { title: string; eventCode: string; count: number }
    > = {};

    filteredEntries.forEach((entry) => {
      const key = entry.eventCode || entry.title;

      if (!grouped[key]) {
        grouped[key] = {
          title: entry.title,
          eventCode: entry.eventCode,
          count: 0,
        };
      }

      grouped[key].count += 1;
    });

    return Object.values(grouped).sort((a, b) => b.count - a.count);
  }, [filteredEntries]);

  const sortedEntries = useMemo(
    () =>
      [...filteredEntries].sort(
        (a, b) =>
          new Date(b.scannedAt).getTime() -
          new Date(a.scannedAt).getTime()
      ),
    [filteredEntries]
  );

  const createCsv = () => {
    const headers = [
      'Event Title',
      'Event Code',
      ...(role === 'teacher' ? ['Student ID'] : []),
      'Attendance Date',
      'Attendance Time',
      'Status',
    ];

    const rows = sortedEntries.map((entry) => [
      entry.title,
      entry.eventCode,
      ...(role === 'teacher' ? [entry.studentId || 'Unavailable'] : []),
      formatDate(entry.scannedAt),
      formatTime(entry.scannedAt),
      'Present',
    ]);

    return [
      headers.map(csvCell).join(','),
      ...rows.map((row) => row.map(csvCell).join(',')),
    ].join('\r\n');
  };

  const createPdfHtml = () => {
    const tableRows = sortedEntries
      .map(
        (entry) => `
          <tr>
            <td>${escapeHtml(entry.title)}</td>
            <td>${escapeHtml(entry.eventCode || 'N/A')}</td>
            ${
              role === 'teacher'
                ? `<td>${escapeHtml(entry.studentId || 'Unavailable')}</td>`
                : ''
            }
            <td>${escapeHtml(formatDate(entry.scannedAt))}</td>
            <td>${escapeHtml(formatTime(entry.scannedAt))}</td>
            <td>Present</td>
          </tr>
        `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #2E1065;
            padding: 24px;
          }
          h1 {
            color: #5B21B6;
            margin-bottom: 5px;
          }
          .subtitle {
            color: #777;
            margin-bottom: 24px;
          }
          .summary {
            background: #F5F0FF;
            padding: 16px;
            border-radius: 10px;
            margin-bottom: 20px;
          }
          .summary strong {
            color: #5B21B6;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          th {
            background: #5B21B6;
            color: white;
            text-align: left;
            padding: 9px;
          }
          td {
            border-bottom: 1px solid #EDE5FA;
            padding: 9px;
          }
          tr:nth-child(even) {
            background: #FBF9FF;
          }
          .footer {
            margin-top: 25px;
            color: #777;
            font-size: 10px;
          }
        </style>
      </head>
      <body>
        <h1>QRATT Attendance Report</h1>
        <p class="subtitle">${escapeHtml(getPeriodLabel(period))}</p>

        <div class="summary">
          <p><strong>Account role:</strong> ${escapeHtml(role || '')}</p>
          <p><strong>Total attendance records:</strong> ${filteredEntries.length}</p>
          <p><strong>Days with records:</strong> ${attendanceDays}</p>
          <p><strong>Events with attendance:</strong> ${eventSummaries.length}</p>
        </div>

        <h3>Attendance Records</h3>
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Code</th>
              ${role === 'teacher' ? '<th>Student ID</th>' : ''}
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${
              tableRows ||
              `<tr><td colspan="${role === 'teacher' ? 6 : 5}">No records found for this period.</td></tr>`
            }
          </tbody>
        </table>

        <p class="footer">
          Generated by QRATT. This report contains saved attendance
          records only and does not determine absences or late arrivals.
        </p>
      </body>
      </html>
    `;
  };

  const exportPdf = async () => {
    if (exporting) return;

    try {
      setExporting(true);

      const html = createPdfHtml();

      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        const result = await Print.printToFileAsync({ html });

        const available = await Sharing.isAvailableAsync();

        if (!available) {
          Alert.alert(
            'Sharing unavailable',
            `The PDF was created at: ${result.uri}`
          );
          return;
        }

        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share QRATT Attendance Report',
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (err) {
      console.error('PDF export error:', err);
      Alert.alert(
        'PDF export failed',
        err instanceof Error ? err.message : 'Unable to create PDF.'
      );
    } finally {
      setExporting(false);
    }
  };

  const exportExcel = async () => {
    if (exporting) return;

    try {
      setExporting(true);

      const csv = '\uFEFF' + createCsv();
      const filename = `QRATT_Report_${period}_${Date.now()}.csv`;

      if (Platform.OS === 'web') {
        const blob = new Blob([csv], {
          type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const directory = FileSystem.cacheDirectory;

        if (!directory) {
          throw new Error('File storage is unavailable.');
        }

        const fileUri = directory + filename;

        await FileSystem.writeAsStringAsync(fileUri, csv, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        const available = await Sharing.isAvailableAsync();

        if (available) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Share QRATT Excel Report',
            UTI: 'public.comma-separated-values-text',
          });
        } else {
          await Share.share({
            title: 'QRATT Attendance Report',
            message: fileUri,
          });
        }
      }
    } catch (err) {
      console.error('Excel export error:', err);
      Alert.alert(
        'Excel export failed',
        err instanceof Error ? err.message : 'Unable to create spreadsheet.'
      );
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Preparing your reports...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={42} color={C.primary} />
        <Text style={styles.errorTitle}>Unable to load reports</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadReports}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (role === 'admin') {
    return (
      <View style={styles.center}>
        <Ionicons name="bar-chart-outline" size={44} color={C.primary} />
        <Text style={styles.errorTitle}>Reports not available</Text>
        <Text style={styles.errorText}>
          This reports screen is currently available for student and teacher
          accounts.
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
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>QRATT ANALYTICS</Text>
          <Text style={styles.title}>Attendance Reports</Text>
          <Text style={styles.subtitle}>
            {role === 'teacher'
              ? 'Review attendance across your events.'
              : 'Review your recorded attendance.'}
          </Text>
        </View>
        <View style={styles.headingIcon}>
          <Ionicons name="bar-chart" size={27} color={C.white} />
        </View>
      </View>

      <View style={styles.periodCard}>
        <Text style={styles.periodHeading}>Report period</Text>

        <View style={styles.periodOptions}>
          {(['daily', 'weekly', 'monthly'] as Period[]).map((item) => {
            const active = period === item;

            return (
              <TouchableOpacity
                key={item}
                style={[
                  styles.periodButton,
                  active && styles.periodButtonActive,
                ]}
                onPress={() => setPeriod(item)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    active && styles.periodButtonTextActive,
                  ]}
                >
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.periodDateRow}>
          <Ionicons name="calendar-outline" size={15} color={C.primary} />
          <Text style={styles.periodDate}>{getPeriodLabel(period)}</Text>
        </View>
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="checkmark-circle-outline" size={22} color={C.primary} />
          </View>
          <Text style={styles.summaryNumber}>{filteredEntries.length}</Text>
          <Text style={styles.summaryLabel}>
            {role === 'teacher' ? 'Attendance entries' : 'Attendance records'}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="calendar-outline" size={22} color={C.primary} />
          </View>
          <Text style={styles.summaryNumber}>{attendanceDays}</Text>
          <Text style={styles.summaryLabel}>Days with records</Text>
        </View>

        <View style={[styles.summaryCard, styles.fullSummaryCard]}>
          <View style={styles.summaryIcon}>
            <Ionicons name="albums-outline" size={22} color={C.primary} />
          </View>
          <Text style={styles.summaryNumber}>{eventSummaries.length}</Text>
          <Text style={styles.summaryLabel}>Events with attendance</Text>
        </View>
      </View>

      <View style={styles.exportCard}>
        <Text style={styles.exportTitle}>Export your report</Text>
        <Text style={styles.exportSubtitle}>
          Download or share the records for the selected period.
        </Text>

        <View style={styles.exportButtons}>
          <TouchableOpacity
            style={[styles.exportButton, styles.pdfButton]}
            onPress={exportPdf}
            disabled={exporting}
          >
            <Ionicons name="document-text-outline" size={21} color="#FFFFFF" />
            <Text style={styles.exportButtonText}>
              {exporting ? 'Preparing...' : 'Export PDF'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exportButton, styles.excelButton]}
            onPress={exportExcel}
            disabled={exporting}
          >
            <Ionicons name="grid-outline" size={21} color="#FFFFFF" />
            <Text style={styles.exportButtonText}>
              {exporting ? 'Preparing...' : 'Export Excel'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.exportNote}>
          Excel export uses CSV format, which can be opened in Microsoft Excel.
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Event summary</Text>
          <Text style={styles.sectionSubtitle}>Attendance grouped by event</Text>
        </View>
        <View style={styles.sectionIcon}>
          <Ionicons name="stats-chart" size={18} color={C.primary} />
        </View>
      </View>

      {eventSummaries.length > 0 ? (
        eventSummaries.map((event, index) => (
          <View key={`${event.eventCode}-${index}`} style={styles.eventCard}>
            <View style={styles.eventNumber}>
              <Text style={styles.eventNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventCode}>
                Code: {event.eventCode || 'Not available'}
              </Text>
            </View>
            <View style={styles.eventCount}>
              <Text style={styles.eventCountNumber}>{event.count}</Text>
              <Text style={styles.eventCountLabel}>
                {role === 'teacher' ? 'Attendees' : 'Records'}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="document-text-outline" size={34} color={C.light} />
          <Text style={styles.emptyTitle}>No records for this period</Text>
          <Text style={styles.emptyText}>
            Try another report period or check again after attendance has
            been recorded.
          </Text>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Recent records</Text>
          <Text style={styles.sectionSubtitle}>
            {filteredEntries.length} records in this period
          </Text>
        </View>
      </View>

      {sortedEntries.length > 0 ? (
        sortedEntries.slice(0, 20).map((entry) => (
          <View key={entry.id} style={styles.recordCard}>
            <View style={styles.recordIcon}>
              <Ionicons name="checkmark-circle" size={22} color={C.green} />
            </View>
            <View style={styles.recordInfo}>
              <Text style={styles.recordTitle}>{entry.title}</Text>
              <Text style={styles.recordDate}>
                {formatDate(entry.scannedAt)} · {formatTime(entry.scannedAt)}
              </Text>
              {role === 'teacher' && entry.studentId ? (
                <Text style={styles.recordStudent} numberOfLines={1}>
                  Student ID: {entry.studentId}
                </Text>
              ) : null}
            </View>
            <View style={styles.recordStatus}>
              <Text style={styles.recordStatusText}>Present</Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.noRecordsText}>
          No attendance records to display.
        </Text>
      )}

      {filteredEntries.length > 20 && (
        <Text style={styles.limitNote}>
          Showing the latest 20 records. Export files include all records in
          the selected period.
        </Text>
      )}

      <Text style={styles.footerNote}>
        Reports are based on saved attendance records. They do not determine
        absences or late arrivals.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background,
  },
  content: {
    padding: 20,
    paddingBottom: 35,
  },
  center: {
    flex: 1,
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  loadingText: {
    color: C.muted,
    fontSize: 13,
    marginTop: 13,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  eyebrow: {
    color: C.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  title: {
    color: C.text,
    fontSize: 27,
    fontWeight: '800',
  },
  subtitle: {
    color: C.muted,
    fontSize: 12,
    marginTop: 5,
  },
  headingIcon: {
    width: 53,
    height: 53,
    borderRadius: 17,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  periodCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 16,
  },
  periodHeading: {
    color: C.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
  },
  periodOptions: {
    flexDirection: 'row',
    backgroundColor: C.pale,
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: C.primary,
  },
  periodButtonText: {
    color: C.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  periodButtonTextActive: {
    color: C.white,
  },
  periodDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
    gap: 7,
  },
  periodDate: {
    color: C.deep,
    fontSize: 11,
    fontWeight: '700',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  fullSummaryCard: {
    width: '100%',
  },
  summaryIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: C.pale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  summaryNumber: {
    color: C.text,
    fontSize: 25,
    fontWeight: '800',
  },
  summaryLabel: {
    color: C.muted,
    fontSize: 10,
    marginTop: 3,
  },
  exportCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 25,
  },
  exportTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: '800',
  },
  exportSubtitle: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
    marginBottom: 15,
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  exportButton: {
    flex: 1,
    minHeight: 47,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 8,
  },
  pdfButton: {
    backgroundColor: C.primary,
  },
  excelButton: {
    backgroundColor: '#15803D',
  },
  exportButtonText: {
    color: C.white,
    fontSize: 11,
    fontWeight: '800',
  },
  exportNote: {
    color: C.muted,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 11,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 2,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: C.muted,
    fontSize: 10,
    marginTop: 4,
  },
  sectionIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: C.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 13,
    marginBottom: 9,
  },
  eventNumber: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: C.pale,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  eventNumberText: {
    color: C.primary,
    fontWeight: '800',
    fontSize: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    color: C.text,
    fontSize: 12,
    fontWeight: '800',
  },
  eventCode: {
    color: C.muted,
    fontSize: 10,
    marginTop: 4,
  },
  eventCount: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  eventCountNumber: {
    color: C.primary,
    fontSize: 19,
    fontWeight: '800',
  },
  eventCountLabel: {
    color: C.muted,
    fontSize: 9,
  },
  emptyCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 25,
    alignItems: 'center',
  },
  emptyTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 11,
  },
  emptyText: {
    color: C.muted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 6,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginBottom: 8,
  },
  recordIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: C.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  recordInfo: {
    flex: 1,
  },
  recordTitle: {
    color: C.text,
    fontSize: 12,
    fontWeight: '800',
  },
  recordDate: {
    color: C.muted,
    fontSize: 10,
    marginTop: 4,
  },
  recordStudent: {
    color: C.muted,
    fontSize: 9,
    marginTop: 3,
  },
  recordStatus: {
    backgroundColor: C.greenPale,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginLeft: 5,
  },
  recordStatusText: {
    color: C.green,
    fontSize: 9,
    fontWeight: '800',
  },
  noRecordsText: {
    color: C.muted,
    fontSize: 11,
    textAlign: 'center',
    padding: 18,
  },
  limitNote: {
    color: C.muted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 5,
  },
  footerNote: {
    color: C.muted,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 18,
  },
  errorTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 14,
  },
  errorText: {
    color: C.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 7,
  },
  retryButton: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 11,
    marginTop: 18,
  },
  retryText: {
    color: C.white,
    fontWeight: '800',
    fontSize: 12,
  },
});
