
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import AppButton from '@/components/AppButton';
import { useAuth, signOut } from '@/lib/auth';
import {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  type Profile,
} from '@/lib/profiles';

const PURPLE = {
  primary: '#7545D6',
  dark: '#452080',
  light: '#F1EAFF',
  background: '#F8F6FC',
  white: '#FFFFFF',
  text: '#29164D',
  secondary: '#8B7BA8',
  border: '#E9E1F5',
  green: '#26966D',
};

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);

    try {
      const result = await getProfile(user.id);
      setProfile(result);
      setDraftName(result?.full_name ?? '');
    } catch (error: any) {
      Alert.alert(
        'Unable to load profile',
        error?.message || 'Please try again.'
      );
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleChoosePhoto = async () => {
    if (!user || uploadingPhoto) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const selectedPhoto = result.assets[0];

      setUploadingPhoto(true);

      const uploadResult = await uploadProfilePhoto(
        user.id,
        selectedPhoto.uri,
        selectedPhoto.mimeType || 'image/jpeg'
      );

      if (uploadResult.error || !uploadResult.url) {
        Alert.alert(
          'Photo upload failed',
          uploadResult.error || 'Please try again.'
        );
        return;
      }

      setProfile((previous) =>
        previous
          ? { ...previous, avatar_url: uploadResult.url }
          : previous
      );

      Alert.alert('Success', 'Your profile photo has been updated.');
    } catch (error: any) {
      Alert.alert(
        'Unable to select photo',
        error?.message || 'Please try again.'
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    if (!user || !profile?.avatar_url) return;

    Alert.alert(
      'Remove profile photo',
      'Are you sure you want to remove your current profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setUploadingPhoto(true);

            try {
              const { error } = await updateProfile(user.id, {
                avatar_url: null,
              });

              if (error) {
                Alert.alert('Unable to remove photo', error);
                return;
              }

              setProfile((previous) =>
                previous
                  ? { ...previous, avatar_url: null }
                  : previous
              );

              Alert.alert('Success', 'Your profile photo was removed.');
            } catch (error: any) {
              Alert.alert(
                'Error',
                error?.message || 'Could not remove your photo.'
              );
            } finally {
              setUploadingPhoto(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveName = async () => {
    if (!user) return;

    const trimmedName = draftName.trim();

    if (!trimmedName) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }

    setSaving(true);

    try {
      const { error } = await updateProfile(user.id, {
        full_name: trimmedName,
      });

      if (error) {
        Alert.alert('Unable to save', error);
        return;
      }

      setProfile((previous) =>
        previous ? { ...previous, full_name: trimmedName } : previous
      );

      setDraftName(trimmedName);
      setEditing(false);
      Alert.alert('Success', 'Your profile name has been updated.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update your name.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setDraftName(profile?.full_name ?? '');
    setEditing(false);
  };

  const handleSignOut = async () => {
    setLoading(true);

    try {
      await signOut();
      router.replace('/login');
    } catch (error: any) {
      Alert.alert('Sign out failed', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const role = profile?.role ?? 'student';

  const roleDetails = {
    admin: {
      label: 'Administrator',
      icon: 'shield-checkmark-outline' as const,
    },
    teacher: {
      label: 'Teacher',
      icon: 'school-outline' as const,
    },
    student: {
      label: 'Student',
      icon: 'person-outline' as const,
    },
  };

  const currentRole =
    roleDetails[role as keyof typeof roleDetails] ?? roleDetails.student;

  const initials = (profile?.full_name || 'User')
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE.dark} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerEyebrow}>ACCOUNT SETTINGS</Text>
              <Text style={styles.headerTitle}>My Profile</Text>
              <Text style={styles.headerSubtitle}>
                Manage your personal information
              </Text>
            </View>

            <View style={styles.headerIcon}>
              <Ionicons
                name="person-circle-outline"
                size={30}
                color={PURPLE.white}
              />
            </View>
          </View>

          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}

              <Pressable
                onPress={handleChoosePhoto}
                disabled={uploadingPhoto}
                style={styles.cameraButton}
              >
                <Ionicons
                  name="camera"
                  size={17}
                  color={PURPLE.white}
                />
              </Pressable>
            </View>

            <View style={styles.avatarTextContainer}>
              <Text style={styles.avatarName}>
                {profile?.full_name || 'Welcome!'}
              </Text>
              <Text style={styles.avatarRole}>{currentRole.label}</Text>

              <View style={styles.photoActions}>
                <Pressable
                  onPress={handleChoosePhoto}
                  disabled={uploadingPhoto}
                  style={styles.photoButton}
                >
                  {uploadingPhoto ? (
                    <ActivityIndicator
                      size="small"
                      color={PURPLE.white}
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="image-outline"
                        size={14}
                        color={PURPLE.white}
                      />
                      <Text style={styles.photoButtonText}>Edit Photo</Text>
                    </>
                  )}
                </Pressable>

                {profile?.avatar_url ? (
                  <Pressable
                    onPress={handleRemovePhoto}
                    disabled={uploadingPhoto}
                    style={styles.removePhotoButton}
                  >
                    <Text style={styles.removePhotoText}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        {profileLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PURPLE.primary} />
            <Text style={styles.loadingText}>Loading your profile...</Text>
          </View>
        ) : profile ? (
          <>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <Text style={styles.sectionSubtitle}>
                Your account details
              </Text>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.cardTop}>
                <View style={styles.cardIcon}>
                  <Ionicons
                    name="person-outline"
                    size={21}
                    color={PURPLE.primary}
                  />
                </View>

                <View style={styles.cardHeading}>
                  <Text style={styles.cardTitle}>Account Details</Text>
                  <Text style={styles.cardDescription}>
                    Your registered information
                  </Text>
                </View>

                <View style={styles.verifiedBadge}>
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={PURPLE.green}
                  />
                  <Text style={styles.verifiedText}>Active</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.fieldLabel}>ACCOUNT ROLE</Text>

              <View style={styles.roleContainer}>
                <View style={styles.roleIcon}>
                  <Ionicons
                    name={currentRole.icon}
                    size={20}
                    color={PURPLE.primary}
                  />
                </View>
                <Text style={styles.roleName}>{currentRole.label}</Text>
              </View>

              <Text style={styles.fieldLabel}>FULL NAME</Text>

              {editing ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={styles.nameInput}
                    value={draftName}
                    onChangeText={setDraftName}
                    editable={!saving}
                    placeholder="Enter your full name"
                    placeholderTextColor={PURPLE.secondary}
                    autoCapitalize="words"
                  />

                  <View style={styles.editActions}>
                    <Pressable
                      onPress={handleCancelEdit}
                      disabled={saving}
                      style={styles.cancelButton}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>

                    <Pressable
                      onPress={handleSaveName}
                      disabled={saving}
                      style={styles.saveButton}
                    >
                      {saving ? (
                        <ActivityIndicator color={PURPLE.white} />
                      ) : (
                        <>
                          <Ionicons
                            name="checkmark"
                            size={17}
                            color={PURPLE.white}
                          />
                          <Text style={styles.saveButtonText}>Save</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.valueRow}>
                  <Text style={styles.fieldValue}>
                    {profile.full_name || 'No name added yet'}
                  </Text>

                  <Pressable
                    onPress={() => setEditing(true)}
                    style={styles.editButton}
                  >
                    <Ionicons
                      name="create-outline"
                      size={17}
                      color={PURPLE.primary}
                    />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </Pressable>
                </View>
              )}

              <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>

              <View style={styles.detailRow}>
                <Ionicons
                  name="mail-outline"
                  size={19}
                  color={PURPLE.secondary}
                />
                <Text style={styles.fieldValue}>
                  {profile.email || user?.email || 'Not available'}
                </Text>
              </View>

              <Text style={styles.fieldLabel}>USER ID</Text>

              <View style={styles.idContainer}>
                <Ionicons
                  name="finger-print-outline"
                  size={19}
                  color={PURPLE.secondary}
                />
                <Text selectable style={styles.idText}>
                  {profile.id}
                </Text>
              </View>
            </View>

            <View style={styles.tipCard}>
              <View style={styles.tipIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={22}
                  color={PURPLE.primary}
                />
              </View>

              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Account Security</Text>
                <Text style={styles.tipDescription}>
                  Keep your account information private. Your account role
                  and access permissions are managed securely.
                </Text>
              </View>
            </View>

            <View style={styles.logoutSection}>
              <Text style={styles.sectionTitle}>Account Actions</Text>

              <AppButton
                title={loading ? 'Signing Out...' : 'Sign Out'}
                icon="log-out-outline"
                onPress={handleSignOut}
                disabled={loading}
              />
            </View>
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons
              name="person-circle-outline"
              size={54}
              color={PURPLE.secondary}
            />
            <Text style={styles.emptyTitle}>Profile unavailable</Text>
            <Text style={styles.emptyDescription}>
              We could not load your account information.
            </Text>

            <Pressable onPress={loadProfile} style={styles.retryButton}>
              <Ionicons
                name="refresh-outline"
                size={17}
                color={PURPLE.white}
              />
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.footer}>
          QRATT AA • Your Attendance Companion
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PURPLE.background,
  },
  scrollContent: {
    paddingBottom: 35,
  },
  header: {
    backgroundColor: PURPLE.dark,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 32,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerEyebrow: {
    color: '#CBB9F3',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  headerTitle: {
    color: PURPLE.white,
    fontSize: 29,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#D8C9F4',
    fontSize: 13,
    marginTop: 6,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
  },
  avatarWrapper: {
    width: 82,
    height: 82,
    position: 'relative',
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#B99AEF',
    borderWidth: 3,
    borderColor: '#FFFFFF70',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3,
    borderColor: '#FFFFFF70',
  },
  avatarText: {
    color: PURPLE.dark,
    fontSize: 23,
    fontWeight: '800',
  },
  cameraButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: PURPLE.primary,
    borderWidth: 2,
    borderColor: PURPLE.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  avatarName: {
    color: PURPLE.white,
    fontSize: 19,
    fontWeight: '700',
  },
  avatarRole: {
    color: '#D8C9F4',
    fontSize: 13,
    marginTop: 5,
  },
  photoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF25',
    borderWidth: 1,
    borderColor: '#FFFFFF45',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minWidth: 88,
    justifyContent: 'center',
  },
  photoButtonText: {
    color: PURPLE.white,
    fontSize: 11,
    fontWeight: '700',
  },
  removePhotoButton: {
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  removePhotoText: {
    color: '#E8DDFB',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeading: {
    paddingHorizontal: 22,
    marginTop: 27,
    marginBottom: 14,
  },
  sectionTitle: {
    color: PURPLE.text,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: PURPLE.secondary,
    fontSize: 12,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: PURPLE.white,
    marginHorizontal: 18,
    padding: 19,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: PURPLE.border,
    shadowColor: PURPLE.dark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: PURPLE.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeading: {
    flex: 1,
    marginLeft: 11,
  },
  cardTitle: {
    color: PURPLE.text,
    fontSize: 15,
    fontWeight: '800',
  },
  cardDescription: {
    color: PURPLE.secondary,
    fontSize: 11,
    marginTop: 3,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF8F2',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 6,
    gap: 4,
  },
  verifiedText: {
    color: PURPLE.green,
    fontSize: 10,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: PURPLE.border,
    marginVertical: 19,
  },
  fieldLabel: {
    color: PURPLE.secondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 17,
    marginBottom: 9,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PURPLE.light,
    borderRadius: 12,
    padding: 11,
  },
  roleIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: PURPLE.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleName: {
    color: PURPLE.dark,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 11,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  fieldValue: {
    flex: 1,
    color: PURPLE.text,
    fontSize: 14,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PURPLE.light,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 5,
  },
  editButtonText: {
    color: PURPLE.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  editContainer: {
    gap: 10,
  },
  nameInput: {
    backgroundColor: PURPLE.background,
    borderWidth: 1,
    borderColor: PURPLE.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: PURPLE.text,
    fontSize: 14,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 9,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: PURPLE.border,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: PURPLE.secondary,
    fontWeight: '700',
    fontSize: 12,
  },
  saveButton: {
    backgroundColor: PURPLE.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minWidth: 75,
  },
  saveButtonText: {
    color: PURPLE.white,
    fontWeight: '700',
    fontSize: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: PURPLE.background,
    borderRadius: 11,
    padding: 12,
  },
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: PURPLE.background,
    borderRadius: 11,
    padding: 12,
  },
  idText: {
    flex: 1,
    color: PURPLE.secondary,
    fontSize: 11,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#F0EBFA',
    marginHorizontal: 18,
    marginTop: 18,
    padding: 16,
    borderRadius: 17,
    gap: 12,
  },
  tipIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: PURPLE.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    color: PURPLE.dark,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 5,
  },
  tipDescription: {
    color: PURPLE.secondary,
    fontSize: 11,
    lineHeight: 17,
  },
  logoutSection: {
    marginHorizontal: 22,
    marginTop: 25,
    gap: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 65,
  },
  loadingText: {
    color: PURPLE.secondary,
    fontSize: 13,
    marginTop: 12,
  },
  emptyCard: {
    backgroundColor: PURPLE.white,
    margin: 20,
    marginTop: 35,
    padding: 25,
    borderRadius: 22,
    alignItems: 'center',
  },
  emptyTitle: {
    color: PURPLE.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyDescription: {
    color: PURPLE.secondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
  retryButton: {
    backgroundColor: PURPLE.primary,
    borderRadius: 11,
    paddingHorizontal: 18,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 17,
  },
  retryText: {
    color: PURPLE.white,
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    color: PURPLE.secondary,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 27,
  },
});
