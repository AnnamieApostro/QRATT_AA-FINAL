
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { type Profile } from '@/lib/profiles';
import { useAppRole } from '@/lib/role-context';
import { COLORS } from '@/constants/colors';

type DashboardStats = {
  total: number;
  students: number;
  teachers: number;
  admins: number;
  events: number;
  attendance: number;
};

type RecentEvent = {
  id: string;
  title: string;
  event_code: string;
  created_at: string;
  start_time: string | null;
};

type RecentAttendance = {
  id: string;
  student_id: string;
  scanned_at: string;
  events: {
    title: string;
    event_code: string;
  } | null;
};

type RoleFilter = 'all' | 'student' | 'teacher' | 'admin';

const INITIAL_STATS: DashboardStats = {
  total: 0,
  students: 0,
  teachers: 0,
  admins: 0,
  events: 0,
  attendance: 0,
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Time unavailable';
  }

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getInitial(profile: Profile) {
  return (profile.full_name || profile.email || 'U')
    .trim()
    .charAt(0)
    .toUpperCase();
}

function getRoleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const role = useAppRole();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<
    RecentAttendance[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Account management state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(
    null
  );

  const loadDashboard = useCallback(async () => {
    if (!user?.id || role !== 'admin') {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const [
        profilesResult,
        studentsResult,
        teachersResult,
        adminsResult,
        eventsCountResult,
        attendanceCountResult,
        eventsResult,
        attendanceResult,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, email, full_name, role')
          .order('full_name', { ascending: true }),

        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'student'),

        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'teacher'),

        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'admin'),

        supabase
          .from('events')
          .select('id', { count: 'exact', head: true }),

        supabase
          .from('attendance')
          .select('id', { count: 'exact', head: true }),

        supabase
          .from('events')
          .select('id, title, event_code, created_at, start_time')
          .order('created_at', { ascending: false })
          .limit(5),

        supabase
          .from('attendance')
          .select(
            'id, student_id, scanned_at, events(title, event_code)'
          )
          .order('scanned_at', { ascending: false })
          .limit(8),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (studentsResult.error) throw studentsResult.error;
      if (teachersResult.error) throw teachersResult.error;
      if (adminsResult.error) throw adminsResult.error;
      if (eventsCountResult.error) throw eventsCountResult.error;
      if (attendanceCountResult.error) {
        throw attendanceCountResult.error;
      }
      if (eventsResult.error) throw eventsResult.error;
      if (attendanceResult.error) throw attendanceResult.error;

      const accountList = (profilesResult.data ?? []) as Profile[];

      setProfiles(accountList);

      setStats({
        total: accountList.length,
        students: studentsResult.count ?? 0,
        teachers: teachersResult.count ?? 0,
        admins: adminsResult.count ?? 0,
        events: eventsCountResult.count ?? 0,
        attendance: attendanceCountResult.count ?? 0,
      });

      setRecentEvents((eventsResult.data ?? []) as RecentEvent[]);

      setRecentAttendance(
        (attendanceResult.data ?? []) as unknown as RecentAttendance[]
      );
    } catch (err) {
      console.error('Admin dashboard error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load dashboard information.'
      );
    }
  }, [user?.id, role]);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      setLoading(true);
      await loadDashboard();

      if (mounted) {
        setLoading(false);
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [loadDashboard]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  // Search and role filtering
  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();

    return profiles.filter((profile) => {
      const matchesSearch =
        !query ||
        (profile.full_name || '').toLowerCase().includes(query) ||
        (profile.email || '').toLowerCase().includes(query) ||
        profile.id.toLowerCase().includes(query);

      const matchesRole =
        roleFilter === 'all' || profile.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [profiles, search, roleFilter]);

  if (role !== 'admin') {
    return (
      <View style={styles.center}>
        <Ionicons
          name="lock-closed-outline"
          size={45}
          color={COLORS.primary}
        />
        <Text style={styles.errorTitle}>Access Restricted</Text>
        <Text style={styles.errorText}>
          This page is only available to administrators.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Dashboard Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>QRATT MANAGEMENT</Text>
              <Text style={styles.headerTitle}>Admin Dashboard</Text>
              <Text style={styles.headerSubtitle}>
                Monitor accounts, events, and attendance activity.
              </Text>
            </View>

            <View style={styles.headerIcon}>
              <Ionicons
                name="shield-checkmark"
                size={28}
                color="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Ionicons
              name="alert-circle-outline"
              size={22}
              color="#DC2626"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorCardTitle}>
                Dashboard loading problem
              </Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          </View>
        )}

        {/* Account Statistics */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Account Overview</Text>
            <Text style={styles.sectionSubtitle}>
              Registered QRATT users
            </Text>
          </View>
          <Ionicons
            name="people-outline"
            size={23}
            color={COLORS.primary}
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard icon="people" label="Total Accounts" value={stats.total} />
          <StatCard icon="school" label="Students" value={stats.students} />
          <StatCard icon="person" label="Teachers" value={stats.teachers} />
          <StatCard
            icon="shield-checkmark"
            label="Administrators"
            value={stats.admins}
          />
        </View>

        {/* Activity Statistics */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Attendance Overview</Text>
            <Text style={styles.sectionSubtitle}>
              Overall system activity
            </Text>
          </View>
          <Ionicons
            name="analytics-outline"
            size={23}
            color={COLORS.primary}
          />
        </View>

        <View style={styles.activityGrid}>
          <View style={styles.activityCard}>
            <View style={styles.activityIcon}>
              <Ionicons
                name="calendar"
                size={23}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.activityNumber}>{stats.events}</Text>
            <Text style={styles.activityLabel}>Total Events</Text>
          </View>

          <View style={styles.activityCard}>
            <View style={styles.activityIcon}>
              <Ionicons
                name="checkmark-done-circle"
                size={23}
                color="#16A34A"
              />
            </View>
            <Text style={styles.activityNumber}>{stats.attendance}</Text>
            <Text style={styles.activityLabel}>Attendance Records</Text>
          </View>
        </View>

        {/* Recent Events */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Recent Events</Text>
            <Text style={styles.sectionSubtitle}>
              Latest created attendance events
            </Text>
          </View>
          <Ionicons
            name="time-outline"
            size={22}
            color={COLORS.primary}
          />
        </View>

        {recentEvents.length === 0 ? (
          <EmptyState
            title="No events yet"
            subtitle="Newly created events will appear here."
          />
        ) : (
          recentEvents.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventIcon}>
                <Ionicons
                  name="qr-code-outline"
                  size={22}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>
                  {event.title || 'Untitled Event'}
                </Text>
                <Text style={styles.eventCode}>
                  Code: {event.event_code}
                </Text>
                <Text style={styles.eventDate}>
                  Created {formatDate(event.created_at)}
                </Text>
              </View>
            </View>
          ))
        )}

        {/* Recent Attendance */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Recent Attendance</Text>
            <Text style={styles.sectionSubtitle}>
              Latest saved attendance records
            </Text>
          </View>
          <Ionicons
            name="checkmark-circle-outline"
            size={23}
            color={COLORS.primary}
          />
        </View>

        {recentAttendance.length === 0 ? (
          <EmptyState
            title="No attendance records"
            subtitle="Recorded attendance will appear here."
          />
        ) : (
          recentAttendance.map((record) => (
            <View key={record.id} style={styles.attendanceCard}>
              <View style={styles.attendanceIcon}>
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color="#16A34A"
                />
              </View>

              <View style={styles.attendanceInfo}>
                <Text style={styles.attendanceTitle}>
                  {record.events?.title || 'Attendance recorded'}
                </Text>
                <Text style={styles.attendanceStudent}>
                  Student ID: {record.student_id}
                </Text>
                <Text style={styles.attendanceDate}>
                  {formatDate(record.scanned_at)} ·{' '}
                  {formatTime(record.scanned_at)}
                </Text>
              </View>

              <View style={styles.presentBadge}>
                <Text style={styles.presentText}>Present</Text>
              </View>
            </View>
          ))
        )}

        {/* Account Management */}
        <View style={[styles.sectionHeader, styles.accountSectionHeader]}>
          <View>
            <Text style={styles.sectionTitle}>Account Management</Text>
            <Text style={styles.sectionSubtitle}>
              Search, filter, and view registered users
            </Text>
          </View>

          <View style={styles.accountCountBadge}>
            <Text style={styles.accountCountText}>
              {filteredProfiles.length}
            </Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color={COLORS.textSecondary}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, email, or account ID..."
            placeholderTextColor="#A1A1AA"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons
                name="close-circle"
                size={19}
                color={COLORS.textSecondary}
              />
            </Pressable>
          )}
        </View>

        {/* Role Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
        >
          <RoleFilterButton
            label="All"
            count={profiles.length}
            active={roleFilter === 'all'}
            onPress={() => setRoleFilter('all')}
          />
          <RoleFilterButton
            label="Students"
            count={stats.students}
            active={roleFilter === 'student'}
            onPress={() => setRoleFilter('student')}
          />
          <RoleFilterButton
            label="Teachers"
            count={stats.teachers}
            active={roleFilter === 'teacher'}
            onPress={() => setRoleFilter('teacher')}
          />
          <RoleFilterButton
            label="Admins"
            count={stats.admins}
            active={roleFilter === 'admin'}
            onPress={() => setRoleFilter('admin')}
          />
        </ScrollView>

        {/* Account List */}
        {filteredProfiles.length === 0 ? (
          <EmptyState
            title="No matching accounts"
            subtitle="Try another search term or role filter."
          />
        ) : (
          filteredProfiles.map((profile) => (
            <Pressable
              key={profile.id}
              style={({ pressed }) => [
                styles.accountCard,
                pressed && styles.accountCardPressed,
              ]}
              onPress={() => setSelectedProfile(profile)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitial(profile)}
                </Text>
              </View>

              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>
                  {profile.full_name || 'Unnamed User'}
                </Text>

                <Text style={styles.accountEmail}>
                  {profile.email || 'No email available'}
                </Text>

                <RoleBadge role={profile.role} />
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color="#A78BFA"
              />
            </Pressable>
          ))
        )}

        <Text style={styles.footer}>
          QRATT Administrator Dashboard · Attendance data is based on
          saved database records.
        </Text>
      </ScrollView>

      {/* Account Details Modal */}
      <Modal
        visible={selectedProfile !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedProfile(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Account Details</Text>

              <Pressable
                onPress={() => setSelectedProfile(null)}
                style={styles.closeButton}
                hitSlop={8}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={COLORS.textPrimary}
                />
              </Pressable>
            </View>

            {selectedProfile && (
              <>
                <View style={styles.modalAvatar}>
                  <Text style={styles.modalAvatarText}>
                    {getInitial(selectedProfile)}
                  </Text>
                </View>

                <Text style={styles.modalName}>
                  {selectedProfile.full_name || 'Unnamed User'}
                </Text>

                <Text style={styles.modalEmail}>
                  {selectedProfile.email || 'No email available'}
                </Text>

                <View style={styles.modalRole}>
                  <RoleBadge role={selectedProfile.role} />
                </View>

                <View style={styles.detailDivider} />

                <DetailRow
                  icon="person-outline"
                  label="Full Name"
                  value={selectedProfile.full_name || 'Not provided'}
                />

                <DetailRow
                  icon="mail-outline"
                  label="Email Address"
                  value={selectedProfile.email || 'Not available'}
                />

                <DetailRow
                  icon="shield-outline"
                  label="Account Role"
                  value={getRoleLabel(selectedProfile.role)}
                />

                <View style={styles.idContainer}>
                  <Text style={styles.detailLabel}>Account ID</Text>
                  <Text selectable style={styles.accountId}>
                    {selectedProfile.id}
                  </Text>
                </View>

                <View style={styles.readOnlyNotice}>
                  <Ionicons
                    name="information-circle-outline"
                    size={17}
                    color={COLORS.primary}
                  />
                  <Text style={styles.readOnlyText}>
                    This is a read-only account view. Your existing
                    account information will not be changed.
                  </Text>
                </View>

                <Pressable
                  style={styles.doneButton}
                  onPress={() => setSelectedProfile(null)}
                >
                  <Text style={styles.doneButtonText}>Close Details</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: number;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={22} color={COLORS.primary} />
      </View>
      <Text style={styles.statNumber}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function EmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.emptyCard}>
      <Ionicons
        name="file-tray-outline"
        size={32}
        color="#A78BFA"
      />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

function RoleFilterButton({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterButton,
        active && styles.filterButtonActive,
      ]}
    >
      <Text
        style={[
          styles.filterText,
          active && styles.filterTextActive,
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.filterCount,
          active && styles.filterTextActive,
        ]}
      >
        {count}
      </Text>
    </Pressable>
  );
}

function RoleBadge({ role }: { role: string }) {
  const badgeStyle =
    role === 'admin'
      ? styles.adminBadge
      : role === 'teacher'
        ? styles.teacherBadge
        : styles.studentBadge;

  const textStyle =
    role === 'admin'
      ? styles.adminBadgeText
      : role === 'teacher'
        ? styles.teacherBadgeText
        : styles.studentBadgeText;

  return (
    <View style={[styles.roleBadge, badgeStyle]}>
      <Text style={[styles.roleBadgeText, textStyle]}>
        {getRoleLabel(role)}
      </Text>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={COLORS.primary}
        />
      </View>

      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    paddingBottom: 45,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 24,
  },
  header: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    padding: 21,
    marginBottom: 27,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyebrow: {
    color: '#E9D5FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 7,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#F3E8FF',
    marginTop: 7,
    lineHeight: 19,
  },
  headerIcon: {
    width: 53,
    height: 53,
    borderRadius: 17,
    backgroundColor: '#FFFFFF30',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 27,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 5,
    fontWeight: '600',
  },
  activityGrid: {
    flexDirection: 'row',
    gap: 11,
    marginBottom: 23,
  },
  activityCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  activityNumber: {
    fontSize: 27,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  activityLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: 14,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  eventIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  eventCode: {
    fontSize: 10,
    color: COLORS.primary,
    marginTop: 4,
  },
  eventDate: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  attendanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: 12,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  attendanceIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  attendanceInfo: {
    flex: 1,
  },
  attendanceTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  attendanceStudent: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  attendanceDate: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  presentBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginLeft: 5,
  },
  presentText: {
    color: '#15803D',
    fontSize: 9,
    fontWeight: '800',
  },
  accountSectionHeader: {
    marginTop: 14,
  },
  accountCountBadge: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  accountCountText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    height: 51,
    marginBottom: 13,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textPrimary,
    paddingVertical: 10,
    paddingHorizontal: 9,
  },
  filterScroll: {
    marginBottom: 13,
    flexGrow: 0,
  },
  filterContainer: {
    gap: 8,
    paddingRight: 5,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  filterCount: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '800',
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  accountCardPressed: {
    opacity: 0.75,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  accountEmail: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 3,
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  adminBadge: {
    backgroundColor: '#EDE9FE',
  },
  adminBadgeText: {
    color: '#6D28D9',
  },
  teacherBadge: {
    backgroundColor: '#DBEAFE',
  },
  teacherBadgeText: {
    color: '#1D4ED8',
  },
  studentBadge: {
    backgroundColor: '#DCFCE7',
  },
  studentBadgeText: {
    color: '#15803D',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: COLORS.card,
    borderRadius: 23,
    padding: 21,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  closeButton: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignSelf: 'center',
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalAvatarText: {
    fontSize: 27,
    fontWeight: '800',
    color: COLORS.primary,
  },
  modalName: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalEmail: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  modalRole: {
    alignItems: 'center',
    marginTop: 11,
  },
  detailDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 17,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  detailIcon: {
    width: 37,
    height: 37,
    borderRadius: 11,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginBottom: 4,
    fontWeight: '600',
  },
  detailValue: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  idContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginTop: 1,
  },
  accountId: {
    color: COLORS.textPrimary,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 5,
  },
  readOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F3E8FF',
    borderRadius: 11,
    padding: 11,
    marginTop: 14,
  },
  readOnlyText: {
    flex: 1,
    color: '#6D28D9',
    fontSize: 10,
    lineHeight: 15,
  },
  doneButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 13,
    padding: 14,
    alignItems: 'center',
    marginTop: 17,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  errorCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FEE2E2',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  errorCardTitle: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#DC2626',
    marginTop: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 11,
    lineHeight: 17,
  },
  footer: {
    color: COLORS.textSecondary,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 22,
  },
});
