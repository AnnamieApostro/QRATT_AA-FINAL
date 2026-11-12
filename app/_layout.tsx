import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect, Stack, useSegments } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getUserRole, type Role } from '@/lib/profiles';
import { RoleContext } from '@/lib/role-context';

export default function RootLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();

  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [roleError, setRoleError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadRole() {
      if (!session?.user?.id) {
        setRole(null);
        setRoleError(null);
        setRoleLoading(false);
        return;
      }

      setRoleLoading(true);
      setRoleError(null);

      try {
        const userRole = await getUserRole(session.user.id);

        if (mounted) {
          if (!userRole) {
            setRoleError('Your account role could not be found.');
            setRole(null);
          } else {
            setRole(userRole);
          }
        }
      } catch (error) {
        console.error('Failed to load user role:', error);

        if (mounted) {
          setRoleError('Unable to load your account role. Please try again.');
          setRole(null);
        }
      } finally {
        if (mounted) {
          setRoleLoading(false);
        }
      }
    }

    loadRole();

    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  if (loading || (session && roleLoading)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading QRATT...</Text>
      </View>
    );
  }

  if (!session) {
    const firstSegment = segments[0];

    if (firstSegment !== 'login' && firstSegment !== 'register') {
      return <Redirect href="/login" />;
    }
  }

  if (session && roleError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorTitle}>Account Error</Text>
        <Text style={styles.errorText}>{roleError}</Text>
      </View>
    );
  }

  if (session && !role) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Checking account role...</Text>
      </View>
    );
  }

  if (session && role) {
    const firstSegment = segments[0];

    if (firstSegment === 'login' || firstSegment === 'register') {
      if (role === 'admin') {
        return <Redirect href="/(tabs)/admin" />;
      }

      if (role === 'teacher') {
        return <Redirect href="/(tabs)/teacher" />;
      }

      return <Redirect href="/(tabs)" />;
    }
  }

  return (
    <RoleContext.Provider value={role}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </RoleContext.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
});