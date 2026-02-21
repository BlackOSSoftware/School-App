import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {
  useActiveSessionQuery,
  useCreateSessionMutation,
  useSessionsQuery,
  useUpdateSessionMutation,
} from '../../hooks/useSessionQueries';
import PaginationControls from '../common/PaginationControls';
import { useAppTheme } from '../../theme/ThemeContext';

function formatDate(dateValue) {
  if (!dateValue) {
    return '-';
  }
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toIsoDate(dateObj) {
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) {
    return '';
  }
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

function getErrorMessage(error, fallback) {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

function MessageBanner({ type, text, onClose, styles }) {
  if (!text) {
    return null;
  }

  return (
    <View style={[styles.banner, type === 'error' ? styles.bannerError : styles.bannerSuccess]}>
      <Text style={styles.bannerText}>{text}</Text>
      <Pressable onPress={onClose}>
        <Text style={styles.bannerClose}>x</Text>
      </Pressable>
    </View>
  );
}

function ConfirmModal({ visible, title, message, onCancel, onConfirm, styles }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.confirmCard}>
          <Text style={styles.confirmTitle}>{title}</Text>
          <Text style={styles.confirmMessage}>{message}</Text>
          <View style={styles.confirmRow}>
            <Pressable style={styles.confirmBtnGhost} onPress={onCancel}>
              <Text style={styles.confirmBtnGhostText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.confirmBtnSolid} onPress={onConfirm}>
              <Text style={styles.confirmBtnSolidText}>Confirm</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DateField({ label, value, onPress, styles }) {
  return (
    <View style={styles.dateFieldWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable style={styles.dateBtn} onPress={onPress}>
        <Ionicons name="calendar-outline" size={17} style={styles.dateBtnIcon} />
        <Text style={styles.dateBtnText}>{toIsoDate(value)}</Text>
      </Pressable>
    </View>
  );
}

export default function AdminSessionScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const reveal = useRef(new Animated.Value(0)).current;
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [confirmState, setConfirmState] = useState({
    visible: false,
    id: '',
    title: '',
    message: '',
    nextActive: true,
  });

  const [createName, setCreateName] = useState('');
  const [createStartDate, setCreateStartDate] = useState(new Date());
  const [createEndDate, setCreateEndDate] = useState(new Date());
  const [createIsActive, setCreateIsActive] = useState(true);
  const [createPickerField, setCreatePickerField] = useState('');

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editSessionId, setEditSessionId] = useState('');
  const [editName, setEditName] = useState('');
  const [editStartDate, setEditStartDate] = useState(new Date());
  const [editEndDate, setEditEndDate] = useState(new Date());
  const [editIsActive, setEditIsActive] = useState(false);
  const [editPickerField, setEditPickerField] = useState('');

  const limit = 20;
  const sessionsQuery = useSessionsQuery(page, limit);
  const activeSessionQuery = useActiveSessionQuery();
  const createSessionMutation = useCreateSessionMutation();
  const updateSessionMutation = useUpdateSessionMutation();

  const listResponse = sessionsQuery.data ?? {};
  const sessionList = Array.isArray(listResponse.data) ? listResponse.data : [];
  const totalPages = Number(listResponse.totalPages ?? 1);
  const activeSession = activeSessionQuery.data?.data ?? null;

  const closeMessage = () => setMessage({ type: '', text: '' });

  useEffect(() => {
    if (!message.text) {
      return undefined;
    }
    const timer = setTimeout(() => setMessage({ type: '', text: '' }), 2800);
    return () => clearTimeout(timer);
  }, [message.text]);

  const onCreate = async () => {
    if (!createName.trim()) {
      setMessage({ type: 'error', text: 'Session name is required.' });
      return;
    }

    try {
      await createSessionMutation.mutateAsync({
        name: createName.trim(),
        startDate: toIsoDate(createStartDate),
        endDate: toIsoDate(createEndDate),
        isActive: createIsActive,
      });
      setCreateName('');
      setCreateIsActive(true);
      setMessage({ type: 'success', text: 'Session created successfully.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: getErrorMessage(error, 'Unable to create session.'),
      });
    }
  };

  const openEdit = (item) => {
    setEditSessionId(item._id);
    setEditName(item.name ?? '');
    setEditStartDate(toDate(item.startDate));
    setEditEndDate(toDate(item.endDate));
    setEditIsActive(Boolean(item.isActive));
    setEditModalVisible(true);
  };

  const saveEdit = async () => {
    if (!editSessionId) {
      return;
    }
    if (!editName.trim()) {
      setMessage({ type: 'error', text: 'Session name is required for edit.' });
      return;
    }

    try {
      await updateSessionMutation.mutateAsync({
        id: editSessionId,
        payload: {
          name: editName.trim(),
          startDate: toIsoDate(editStartDate),
          endDate: toIsoDate(editEndDate),
          isActive: editIsActive,
        },
      });
      setEditModalVisible(false);
      setMessage({ type: 'success', text: 'Session updated successfully.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: getErrorMessage(error, 'Unable to update session.'),
      });
    }
  };

  const openStatusConfirm = (item, nextActive) => {
    setConfirmState({
      visible: true,
      id: item._id,
      title: nextActive ? 'Set Active Session' : 'Set Inactive Session',
      message: nextActive
        ? 'Only one session should stay active at a time. Continue?'
        : 'This session will be marked inactive. Continue?',
      nextActive,
    });
  };

  const runStatusUpdate = async () => {
    try {
      await updateSessionMutation.mutateAsync({
        id: confirmState.id,
        payload: { isActive: confirmState.nextActive },
      });
      setConfirmState(prev => ({ ...prev, visible: false }));
      setMessage({ type: 'success', text: 'Session status updated.' });
    } catch (error) {
      setConfirmState(prev => ({ ...prev, visible: false }));
      setMessage({
        type: 'error',
        text: getErrorMessage(error, 'Unable to update status.'),
      });
    }
  };

  const isBusy = useMemo(
    () =>
      sessionsQuery.isLoading ||
      activeSessionQuery.isLoading ||
      createSessionMutation.isPending ||
      updateSessionMutation.isPending,
    [
      activeSessionQuery.isLoading,
      createSessionMutation.isPending,
      sessionsQuery.isLoading,
      updateSessionMutation.isPending,
    ],
  );

  useEffect(() => {
    reveal.setValue(0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reveal]);

  return (
    <View style={styles.section}>
      <Animated.View
        style={[
          styles.heroCard,
          {
            opacity: reveal,
            transform: [
              {
                translateY: reveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.heroOverline}>ACADEMIC CONTROL</Text>
        <Text style={styles.sectionTitle}>Session Management</Text>
        <Text style={styles.heroSub}>Create and maintain one active session at a time.</Text>
      </Animated.View>
      <MessageBanner type={message.type} text={message.text} onClose={closeMessage} styles={styles} />

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Create Session</Text>
        <Text style={styles.inputLabel}>Session Name</Text>
        <View style={styles.inputRow}>
          <Ionicons name="book-outline" size={17} style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            placeholder="Session name (e.g. 2026-27)"
            placeholderTextColor={colors.text.muted}
            value={createName}
            onChangeText={setCreateName}
          />
        </View>

        <DateField
          label="Start Date"
          value={createStartDate}
          styles={styles}
          onPress={() => setCreatePickerField('start')}
        />
        <DateField
          label="End Date"
          value={createEndDate}
          styles={styles}
          onPress={() => setCreatePickerField('end')}
        />

        {createPickerField ? (
          <DateTimePicker
            value={createPickerField === 'start' ? createStartDate : createEndDate}
            mode="date"
            display="calendar"
            onChange={(_, selectedDate) => {
              setCreatePickerField('');
              if (!selectedDate) {
                return;
              }
              if (createPickerField === 'start') {
                setCreateStartDate(selectedDate);
              } else {
                setCreateEndDate(selectedDate);
              }
            }}
          />
        ) : null}

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Active Session</Text>
          <Switch value={createIsActive} onValueChange={setCreateIsActive} />
        </View>

        <Pressable
          style={[styles.primaryBtn, createSessionMutation.isPending ? styles.disabledBtn : null]}
          onPress={onCreate}
          disabled={createSessionMutation.isPending}
        >
          <Text style={styles.primaryBtnText}>Create Session</Text>
        </Pressable>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Active Session</Text>
        {activeSessionQuery.isLoading ? (
          <ActivityIndicator color={colors.brand.primary} />
        ) : activeSession ? (
          <View style={styles.activeCard}>
            <Text style={styles.activeName}>{activeSession.name}</Text>
            <Text style={styles.activeMeta}>
              {formatDate(activeSession.startDate)} to {formatDate(activeSession.endDate)}
            </Text>
          </View>
        ) : (
          <Text style={styles.placeholderText}>No active session found.</Text>
        )}
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeaderRow}>
          <Text style={styles.panelTitle}>All Sessions</Text>
          {isBusy ? <ActivityIndicator size="small" color={colors.brand.primary} /> : null}
        </View>

        <FlatList
          data={sessionList}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <View style={styles.listContent}>
                <Text style={styles.listName}>{item.name}</Text>
                <Text style={styles.listMeta}>
                  {formatDate(item.startDate)} to {formatDate(item.endDate)}
                </Text>
              </View>
              <View style={styles.listBtnRow}>
                <Pressable style={styles.smallGhostBtn} onPress={() => openEdit(item)}>
                  <Text style={styles.smallGhostBtnText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={[styles.smallBtn, item.isActive ? styles.smallBtnActive : null]}
                  onPress={() => openStatusConfirm(item, !item.isActive)}
                >
                  <Text
                    style={[
                      styles.smallBtnText,
                      item.isActive ? styles.smallBtnTextActive : null,
                    ]}
                  >
                    {item.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            sessionsQuery.isLoading ? null : (
              <Text style={styles.placeholderText}>No sessions available.</Text>
            )
          }
        />

        <PaginationControls
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage(prev => Math.max(1, prev - 1))}
          onNext={() => setPage(prev => Math.min(totalPages, prev + 1))}
          disablePrev={page <= 1}
          disableNext={page >= totalPages}
        />
      </View>

      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.editCard}>
            <Text style={styles.editTitle}>Edit Session</Text>

            <Text style={styles.inputLabel}>Session Name</Text>
            <View style={styles.inputRow}>
              <Ionicons name="create-outline" size={17} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={editName}
                onChangeText={setEditName}
                placeholder="Session name"
                placeholderTextColor={colors.text.muted}
              />
            </View>

            <DateField
              label="Start Date"
              value={editStartDate}
              styles={styles}
              onPress={() => setEditPickerField('start')}
            />
            <DateField
              label="End Date"
              value={editEndDate}
              styles={styles}
              onPress={() => setEditPickerField('end')}
            />

            {editPickerField ? (
              <DateTimePicker
                value={editPickerField === 'start' ? editStartDate : editEndDate}
                mode="date"
                display="calendar"
                onChange={(_, selectedDate) => {
                  setEditPickerField('');
                  if (!selectedDate) {
                    return;
                  }
                  if (editPickerField === 'start') {
                    setEditStartDate(selectedDate);
                  } else {
                    setEditEndDate(selectedDate);
                  }
                }}
              />
            ) : null}

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Active Session</Text>
              <Switch value={editIsActive} onValueChange={setEditIsActive} />
            </View>

            <View style={styles.confirmRow}>
              <Pressable style={styles.confirmBtnGhost} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.confirmBtnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmBtnSolid} onPress={saveEdit}>
                <Text style={styles.confirmBtnSolidText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={confirmState.visible}
        title={confirmState.title}
        message={confirmState.message}
        styles={styles}
        onCancel={() => setConfirmState(prev => ({ ...prev, visible: false }))}
        onConfirm={runStatusUpdate}
      />
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
  section: {
    marginTop: 8,
  },
  heroCard: {
    borderRadius: 18,
    backgroundColor: colors.admin.heroBg,
    borderWidth: 0,
    padding: 14,
    marginBottom: 10,
  },
  heroOverline: {
    color: colors.auth.subtitle,
    fontSize: 10.5,
    letterSpacing: 1.6,
    fontWeight: '800',
  },
  sectionTitle: {
    color: colors.text.inverse,
    fontSize: 25,
    fontWeight: '900',
    marginTop: 6,
  },
  heroSub: {
    marginTop: 5,
    color: colors.auth.subtitle,
    fontSize: 12.5,
    lineHeight: 18,
  },
  banner: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerError: {
    backgroundColor: colors.admin.dangerBg,
    borderWidth: 1,
    borderColor: colors.admin.dangerBorder,
  },
  bannerSuccess: {
    backgroundColor: colors.admin.successBg,
    borderWidth: 1,
    borderColor: colors.admin.successBorder,
  },
  bannerText: {
    flex: 1,
    color: colors.admin.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    paddingRight: 10,
  },
  bannerClose: {
    color: colors.admin.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  panel: {
    borderRadius: 18,
    backgroundColor: colors.admin.surface,
    borderWidth: 1,
    borderColor: colors.admin.borderStrong,
    padding: 14,
    marginBottom: 12,
  },
  panelTitle: {
    color: colors.admin.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    color: colors.admin.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.admin.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.admin.textPrimary,
    marginBottom: 10,
  },
  inputRow: {
    borderWidth: 1,
    borderColor: colors.admin.borderSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.admin.surfaceStrong,
  },
  inputIcon: {
    color: colors.admin.accent,
    marginRight: 8,
  },
  inputWithIcon: {
    flex: 1,
    color: colors.admin.textPrimary,
    paddingVertical: 11,
    fontSize: 13.5,
  },
  dateFieldWrap: {
    marginBottom: 10,
  },
  dateBtn: {
    borderWidth: 1,
    borderColor: colors.admin.borderSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.admin.surfaceStrong,
  },
  dateBtnIcon: {
    color: colors.admin.accent,
    marginRight: 8,
  },
  dateBtnText: {
    color: colors.admin.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  switchText: {
    color: colors.admin.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  primaryBtn: {
    borderRadius: 10,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.45,
  },
  activeCard: {
    borderRadius: 10,
    padding: 10,
    backgroundColor: colors.admin.surfaceStrong,
  },
  activeName: {
    color: colors.admin.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  activeMeta: {
    marginTop: 4,
    color: colors.admin.textSecondary,
    fontSize: 12,
  },
  placeholderText: {
    color: colors.admin.textSecondary,
    fontSize: 13,
  },
  listItem: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.admin.border,
    backgroundColor: colors.admin.surfaceSoft,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  listContent: {
    flex: 1,
    paddingRight: 8,
  },
  listName: {
    color: colors.admin.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  listMeta: {
    marginTop: 2,
    color: colors.admin.textSecondary,
    fontSize: 12,
  },
  listBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 8,
  },
  smallBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallBtnActive: {
    backgroundColor: colors.brand.primary,
  },
  smallBtnText: {
    color: colors.brand.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  smallBtnTextActive: {
    color: colors.text.inverse,
  },
  smallGhostBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.admin.borderSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallGhostBtnText: {
    color: colors.admin.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.admin.modalBackdrop,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  editCard: {
    width: '100%',
    borderRadius: 14,
    backgroundColor: colors.admin.surface,
    borderWidth: 1,
    borderColor: colors.admin.borderStrong,
    padding: 14,
  },
  editTitle: {
    color: colors.admin.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  confirmCard: {
    width: '100%',
    borderRadius: 14,
    backgroundColor: colors.admin.surface,
    borderWidth: 1,
    borderColor: colors.admin.borderStrong,
    padding: 14,
  },
  confirmTitle: {
    color: colors.admin.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  confirmMessage: {
    color: colors.admin.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  confirmRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  confirmBtnGhost: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.admin.borderSoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  confirmBtnGhostText: {
    color: colors.admin.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  confirmBtnSolid: {
    borderRadius: 10,
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  confirmBtnSolidText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
