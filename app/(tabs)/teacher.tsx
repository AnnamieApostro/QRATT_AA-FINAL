
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';

import { useAuth } from '@/lib/auth';
import { createEvent } from '@/lib/events';
import { getUserRole, type Role } from '@/lib/profiles';
import { buildQRPayload } from '@/lib/qr';

const C = {
  purple: '#6C4DFF',
  dark: '#3F278F',
  deep: '#5438D6',
  lavender: '#EEE9FF',
  pale: '#F8F6FF',
  background: '#F8F7FC',
  white: '#FFFFFF',
  text: '#241B3D',
  muted: '#8A849B',
  border: '#E8E3F2',
  green: '#15803D',
  greenBg: '#DCFCE7',
  red: '#DC4545',
  redBg: '#FFF1F1',
};

function toLocalISO(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
  );
}

function formatDateTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });

  return `${month} ${pad(date.getDate())}, ${date.getFullYear()} at ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

const QUICK_END_OPTIONS = [
  { label: '+30 min', ms: 30 * 60 * 1000 },
  { label: '+1 hour', ms: 60 * 60 * 1000 },
  { label: '+2 hours', ms: 2 * 60 * 60 * 1000 },
];

type EditTarget = 'start' | 'end';

export default function TeacherScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [eventId, setEventId] = useState('');

  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(
    () => new Date(Date.now() + 60 * 60 * 1000)
  );

  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editingPart, setEditingPart] = useState<'date' | 'time'>('date');

  const [payload, setPayload] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const isAndroid = Platform.OS === 'android';

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
          console.error('Teacher role check error:', error);

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

  const openPicker = (target: EditTarget) => {
    setMessage(null);
    setEditTarget(target);
    setEditingPart('date');
  };

  const onPickerChange = (
    event: DateTimePickerEvent,
    selected?: Date
  ) => {
    if (!editTarget) return;

    if (event.type === 'dismissed' || !selected) {
      setEditTarget(null);
      setEditingPart('date');
      return;
    }

    const current = editTarget === 'start' ? startDate : endDate;
    const next = new Date(current);

    next.setFullYear(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate()
    );

    next.setHours(
      selected.getHours(),
      selected.getMinutes(),
      0,
      0
    );

    if (editTarget === 'start') {
      setStartDate(next);
    } else {
      setEndDate(next);
    }

    if (isAndroid && editingPart === 'date') {
      setEditingPart('time');
    } else {
      setEditTarget(null);
      setEditingPart('date');
    }
  };

  const handleQuickEnd = (ms: number) => {
    setMessage(null);
    setEndDate(new Date(startDate.getTime() + ms));
  };

  const handleCreateEvent = async () => {
    if (creating) return;

    const event = {
      eventId: eventId.trim(),
      title: title.trim(),
      start: toLocalISO(startDate),
      end: toLocalISO(endDate),
    };

    if (!event.eventId || !event.title) {
      setMessage('Event title and code are required.');
      setPayload(null);
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      setMessage('End time must be after start time.');
      setPayload(null);
      return;
    }

    try {
      setCreating(true);
      setMessage(null);
      setPayload(null);

      const { error } = await createEvent(event);

      if (error) {
        setMessage(error);
        return;
      }

      setMessage('Event saved successfully! Your QR code is ready.');
      setPayload(buildQRPayload(event));
    } catch (error) {
      console.error('Create event error:', error);

      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to create the event. Please try again.'
      );
    } finally {
      setCreating(false);
    }
  };

  if (roleLoading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.loadingIcon}>
          <Ionicons name="school-outline" size={32} color={C.white} />
        </View>

        <ActivityIndicator
          size="large"
          color={C.purple}
          style={{ marginTop: 22 }}
        />

        <Text style={styles.loadingTitle}>Checking your account...</Text>
      </View>
    );
  }

  if (role !== 'teacher') {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.lockIcon}>
          <Ionicons
            name="lock-closed-outline"
            size={36}
            color={C.purple}
          />
        </View>

        <Text style={styles.lockTitle}>Teachers Only</Text>

        <Text style={styles.lockMessage}>
          Only authorized teacher accounts can create attendance events.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={C.dark}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.hero}>
          <View style={styles.circleOne} />
          <View style={styles.circleTwo} />

          <View style={styles.topBar}>
            <View>
              <Text style={styles.brand}>QRATT AA</Text>
              <Text style={styles.brandCaption}>
                QR ATTENDANCE SYSTEM
              </Text>
            </View>

            <View style={styles.headerIcon}>
              <Ionicons
                name="school-outline"
                size={25}
                color={C.white}
              />
            </View>
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.eyebrow}>TEACHER PORTAL</Text>
            <Text style={styles.heroTitle}>Create Event QR</Text>
            <Text style={styles.heroDescription}>
              Organize your attendance events and generate QR codes
              for your students.
            </Text>
          </View>

          <View style={styles.accessBadge}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={C.white}
            />
            <Text style={styles.accessText}>TEACHER ACCESS</Text>
          </View>
        </View>

        <View style={styles.mainContent}>
          {/* EVENT DETAILS */}
          <SectionHeading
            title="Event Details"
            subtitle="Enter your attendance event information"
            icon="document-text-outline"
          />

          <View style={styles.card}>
            <FieldHeading
              title="Event Title"
              icon="create-outline"
            />

            <TextInput
              style={styles.input}
              value={title}
              onChangeText={(value) => {
                setTitle(value);
                setMessage(null);
              }}
              placeholder="e.g. Founders Day Assembly"
              placeholderTextColor="#AAA4B8"
              maxLength={100}
            />

            <Text style={styles.hint}>
              Enter the name of your attendance event.
            </Text>

            <View style={styles.fieldSpacer} />

            <FieldHeading
              title="Event Code"
              icon="key-outline"
            />

            <TextInput
              style={styles.input}
              value={eventId}
              onChangeText={(value) => {
                setEventId(value);
                setMessage(null);
              }}
              placeholder="e.g. EVT-2026-0002"
              placeholderTextColor="#AAA4B8"
              autoCapitalize="characters"
              maxLength={50}
            />

            <Text style={styles.hint}>
              Enter a unique code for this event.
            </Text>
          </View>

          {/* SCHEDULE */}
          <SectionHeading
            title="Event Schedule"
            subtitle="Choose when attendance will be available"
            icon="calendar-outline"
          />

          <View style={styles.card}>
            <Text style={styles.label}>Start Date & Time</Text>

            <PickerField
              value={formatDateTime(startDate)}
              icon="play-circle-outline"
              onPress={() => openPicker('start')}
            />

            <Text style={styles.label}>End Date & Time</Text>

            <PickerField
              value={formatDateTime(endDate)}
              icon="stop-circle-outline"
              onPress={() => openPicker('end')}
            />

            <View style={styles.quickHeading}>
              <Ionicons
                name="flash-outline"
                size={18}
                color={C.purple}
              />
              <Text style={styles.quickTitle}>Quick End Time</Text>
            </View>

            <View style={styles.chipRow}>
              {QUICK_END_OPTIONS.map((option) => (
                <Pressable
                  key={option.label}
                  style={({ pressed }) => [
                    styles.chip,
                    pressed && styles.chipPressed,
                  ]}
                  onPress={() => handleQuickEnd(option.ms)}
                >
                  <Text style={styles.chipText}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.hint}>
              Select a duration to automatically set the end time.
            </Text>
          </View>

          {/* DATE PICKER */}
          {editTarget && (
            <View style={styles.pickerCard}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>
                  Choose {editTarget === 'start' ? 'Start' : 'End'}{' '}
                  {isAndroid ? editingPart : 'Date & Time'}
                </Text>

                <Pressable
                  onPress={() => {
                    setEditTarget(null);
                    setEditingPart('date');
                  }}
                  hitSlop={10}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={25}
                    color={C.purple}
                  />
                </Pressable>
              </View>

              <DateTimePicker
                value={editTarget === 'start' ? startDate : endDate}
                mode={isAndroid ? editingPart : 'datetime'}
                display={isAndroid ? 'default' : 'spinner'}
                onChange={onPickerChange}
              />

              {isAndroid && editingPart === 'time' && (
                <Text style={styles.pickerHint}>
                  Select the time to finish setting your schedule.
                </Text>
              )}
            </View>
          )}

          {/* MESSAGE */}
          {message && (
            <View
              style={[
                styles.messageCard,
                payload ? styles.successCard : styles.errorCard,
              ]}
            >
              <Ionicons
                name={
                  payload
                    ? 'checkmark-circle-outline'
                    : 'alert-circle-outline'
                }
                size={22}
                color={payload ? C.green : C.red}
              />

              <Text
                style={[
                  styles.messageText,
                  { color: payload ? C.green : C.red },
                ]}
              >
                {message}
              </Text>
            </View>
          )}

          {/* CREATE EVENT */}
          <View style={styles.createCard}>
            <View style={styles.createInfo}>
              <View style={styles.createIcon}>
                <Ionicons
                  name="qr-code-outline"
                  size={24}
                  color={C.purple}
                />
              </View>

              <View style={styles.createInfoContent}>
                <Text style={styles.createTitle}>
                  Ready to generate?
                </Text>
                <Text style={styles.createDescription}>
                  Create your event and prepare its attendance QR code.
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.createButton,
                pressed && !creating && styles.createButtonPressed,
                creating && styles.buttonDisabled,
              ]}
              onPress={handleCreateEvent}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <>
                  <Ionicons
                    name="add-circle-outline"
                    size={21}
                    color={C.white}
                  />
                  <Text style={styles.createButtonText}>
                    Create Event
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={19}
                    color={C.white}
                  />
                </>
              )}
            </Pressable>
          </View>

          {/* QR CODE RESULT */}
          {payload && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <View style={styles.resultIcon}>
                  <Ionicons
                    name="qr-code"
                    size={23}
                    color={C.purple}
                  />
                </View>

                <View style={styles.resultHeaderText}>
                  <Text style={styles.resultTitle}>
                    QR Code Generated!
                  </Text>
                  <Text style={styles.resultSubtitle}>
                    Your attendance event is ready.
                  </Text>
                </View>

                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={C.green}
                />
              </View>

              <View style={styles.qrContainer}>
                <View style={styles.qrBox}>
                  <QRCode
                    value={payload}
                    size={200}
                    color="#24123F"
                    backgroundColor="#FFFFFF"
                  />
                </View>
              </View>

              <View style={styles.scanInstruction}>
                <Ionicons
                  name="phone-portrait-outline"
                  size={21}
                  color={C.purple}
                />
                <Text style={styles.scanInstructionText}>
                  Students can scan this QR code using the Scan tab
                  in QRATT AA.
                </Text>
              </View>

              <Text style={styles.payloadLabel}>QR PAYLOAD</Text>

              <View style={styles.payloadBox}>
                <Text style={styles.payloadText}>{payload}</Text>
              </View>
            </View>
          )}

          {/* FOOTER */}
          <View style={styles.footer}>
            <View style={styles.footerLine} />
            <Text style={styles.footerBrand}>QRATT AA</Text>
            <Text style={styles.footerCaption}>
              TEACHER ATTENDANCE PORTAL
            </Text>
            <Text style={styles.footerCopyright}>
              Smarter attendance management.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

type SectionHeadingProps = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
};

function SectionHeading({
  title,
  subtitle,
  icon,
}: SectionHeadingProps) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionHeadingText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>

      <View style={styles.sectionIcon}>
        <Ionicons name={icon} size={22} color={C.purple} />
      </View>
    </View>
  );
}

type FieldHeadingProps = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
};

function FieldHeading({ title, icon }: FieldHeadingProps) {
  return (
    <View style={styles.fieldHeading}>
      <View style={styles.fieldIcon}>
        <Ionicons name={icon} size={19} color={C.purple} />
      </View>
      <Text style={styles.fieldHeadingText}>{title}</Text>
    </View>
  );
}

type PickerFieldProps = {
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

function PickerField({ value, icon, onPress }: PickerFieldProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.pickerField,
        pressed && styles.pickerFieldPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.pickerFieldIcon}>
        <Ionicons name={icon} size={21} color={C.purple} />
      </View>

      <Text style={styles.pickerValue}>{value}</Text>

      <Ionicons
        name="calendar-outline"
        size={19}
        color={C.muted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 35,
  },

  // LOADING AND ACCESS
  centered: {
    flex: 1,
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingIcon: {
    width: 75,
    height: 75,
    borderRadius: 24,
    backgroundColor: C.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.dark,
    marginTop: 16,
  },
  lockIcon: {
    width: 76,
    height: 76,
    borderRadius: 25,
    backgroundColor: C.lavender,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: C.dark,
    marginTop: 20,
  },
  lockMessage: {
    fontSize: 13,
    color: C.muted,
    marginTop: 9,
    textAlign: 'center',
    lineHeight: 20,
  },

  // HERO HEADER
  hero: {
    backgroundColor: C.dark,
    paddingTop: 24,
    paddingHorizontal: 23,
    paddingBottom: 26,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  circleOne: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(167,139,250,0.14)',
    top: -105,
    right: -45,
  },
  circleTwo: {
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
    color: C.white,
  },
  brandCaption: {
    fontSize: 8,
    letterSpacing: 1.5,
    fontWeight: '700',
    color: '#D8C8FF',
    marginTop: 4,
  },
  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    marginTop: 37,
  },
  eyebrow: {
    color: '#D8C8FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: C.white,
    marginTop: 9,
  },
  heroDescription: {
    fontSize: 12,
    lineHeight: 19,
    color: '#E9DFFF',
    marginTop: 8,
  },
  accessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 20,
    marginTop: 25,
  },
  accessText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: C.white,
    marginLeft: 7,
  },

  // MAIN CONTENT
  mainContent: {
    paddingHorizontal: 21,
    paddingTop: 27,
  },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 5,
  },
  sectionHeadingText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: C.dark,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: C.muted,
    marginTop: 5,
  },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.lavender,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },

  // CARDS AND FIELDS
  card: {
    backgroundColor: C.white,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: C.border,
    padding: 17,
    marginBottom: 26,
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  fieldHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
  },
  fieldIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: C.lavender,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  fieldHeadingText: {
    fontSize: 13,
    fontWeight: '800',
    color: C.dark,
  },
  fieldSpacer: {
    height: 23,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: C.dark,
    marginBottom: 10,
    marginTop: 15,
  },
  input: {
    backgroundColor: '#FAF9FE',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 14,
    color: C.dark,
  },
  hint: {
    fontSize: 10,
    color: C.muted,
    marginTop: 8,
    lineHeight: 15,
  },

  // PICKER
  pickerField: {
    backgroundColor: '#FAF9FE',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  pickerFieldPressed: {
    backgroundColor: C.lavender,
  },
  pickerFieldIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: C.lavender,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  pickerValue: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: C.dark,
    marginRight: 7,
  },
  pickerCard: {
    backgroundColor: C.white,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: C.border,
    padding: 15,
    marginBottom: 22,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.dark,
  },
  pickerHint: {
    fontSize: 11,
    color: C.muted,
    textAlign: 'center',
    marginTop: 10,
  },

  // QUICK TIME
  quickHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 12,
  },
  quickTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: C.dark,
    marginLeft: 7,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  chip: {
    backgroundColor: C.lavender,
    borderWidth: 1,
    borderColor: '#DDD0F7',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  chipPressed: {
    backgroundColor: '#E1D8FF',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.deep,
  },

  // MESSAGES
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    padding: 14,
    marginBottom: 18,
    gap: 10,
  },
  successCard: {
    backgroundColor: C.greenBg,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  errorCard: {
    backgroundColor: C.redBg,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  messageText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },

  // CREATE BUTTON
  createCard: {
    backgroundColor: C.lavender,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#DDD0F7',
    padding: 17,
    marginTop: 5,
    marginBottom: 25,
  },
  createInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 17,
  },
  createIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createInfoContent: {
    flex: 1,
    marginLeft: 11,
  },
  createTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: C.dark,
  },
  createDescription: {
    fontSize: 10,
    color: C.muted,
    marginTop: 5,
    lineHeight: 15,
  },
  createButton: {
    minHeight: 54,
    backgroundColor: C.purple,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: C.purple,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  createButtonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '800',
  },

  // QR RESULT
  resultCard: {
    backgroundColor: C.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    padding: 17,
    marginBottom: 25,
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: C.lavender,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  resultHeaderText: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: C.dark,
  },
  resultSubtitle: {
    fontSize: 10,
    color: C.muted,
    marginTop: 4,
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: 23,
    marginBottom: 20,
  },
  qrBox: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    padding: 15,
    borderRadius: 19,
  },
  scanInstruction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.lavender,
    borderRadius: 14,
    padding: 13,
    gap: 9,
  },
  scanInstructionText: {
    flex: 1,
    fontSize: 10,
    color: C.deep,
    lineHeight: 16,
  },
  payloadLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.3,
    color: C.muted,
    marginTop: 18,
    marginBottom: 8,
  },
  payloadBox: {
    backgroundColor: '#FAF9FE',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
  },
  payloadText: {
    fontSize: 10,
    color: C.deep,
    lineHeight: 16,
    textAlign: 'center',
  },

  // FOOTER
  footer: {
    alignItems: 'center',
    marginTop: 22,
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
    color: C.deep,
  },
  footerCaption: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.3,
    color: C.muted,
    marginTop: 5,
  },
  footerCopyright: {
    fontSize: 10,
    color: '#A99BBF',
    marginTop: 10,
  },
});
