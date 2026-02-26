import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useClassesQuery } from '../../hooks/useClassQueries';
import { useSessionsQuery } from '../../hooks/useSessionQueries';
import { useSessionTransitionMutation, useStudentsQuery } from '../../hooks/useStudentQueries';
import SelectorModal from '../common/SelectorModal';
import { useAppTheme } from '../../theme/ThemeContext';

function normalizeId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const nested = value?._id ?? value?.id ?? value?.$oid ?? '';
    if (typeof nested === 'string') return nested.trim();
    if (nested && typeof nested === 'object' && typeof nested.$oid === 'string') return nested.$oid.trim();
  }
  return '';
}

function parseGrade(name) {
  const numeric = Number(String(name ?? '').trim());
  return Number.isFinite(numeric) ? numeric : null;
}

function toClassLabel(item) {
  const name = String(item?.name ?? '').trim();
  const section = String(item?.section ?? '').trim();
  return section ? `${name}-${section}` : (name || '-');
}

function toSessionLabel(session) {
  const name = String(session?.name ?? '').trim() || 'Session';
  const startDate = session?.startDate ? new Date(session.startDate) : null;
  const year = startDate && !Number.isNaN(startDate.getTime()) ? startDate.getFullYear() : '';
  return year ? `${name} (${year})` : name;
}

function pickDefaultSession(sessions) {
  if (!sessions.length) return '';
  const now = Date.now();
  const withStart = sessions
    .map(item => ({
      id: normalizeId(item),
      start: item?.startDate ? new Date(item.startDate).getTime() : Number.NaN,
      isActive: Boolean(item?.isActive),
    }))
    .filter(item => item.id);

  const upcoming = withStart
    .filter(item => Number.isFinite(item.start) && item.start > now)
    .sort((a, b) => a.start - b.start);
  if (upcoming.length) return upcoming[0].id;

  const inactive = withStart.find(item => !item.isActive);
  if (inactive?.id) return inactive.id;
  return withStart[0]?.id || '';
}

export default function AdminSessionUpgradeScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const reveal = useRef(new Animated.Value(0)).current;

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [updatesByStudentId, setUpdatesByStudentId] = useState({});
  const [selectorState, setSelectorState] = useState({ open: false, mode: 'session', studentId: '' });
  const [message, setMessage] = useState({ type: '', text: '' });

  const classesQuery = useClassesQuery(1, 200);
  const sessionsQuery = useSessionsQuery(1, 200);
  const studentsQuery = useStudentsQuery({ page: 1, limit: 500, classId: selectedClassId, search: '' });
  const transitionMutation = useSessionTransitionMutation();

  const classes = useMemo(() => (Array.isArray(classesQuery.data?.data) ? classesQuery.data.data : []), [classesQuery.data?.data]);
  const sessions = useMemo(() => (Array.isArray(sessionsQuery.data?.data) ? sessionsQuery.data.data : []), [sessionsQuery.data?.data]);
  const rawStudents = useMemo(() => (Array.isArray(studentsQuery.data?.data) ? studentsQuery.data.data : []), [studentsQuery.data?.data]);
  const students = useMemo(
    () =>
      rawStudents.filter(item => {
        const studentSessionId = normalizeId(item?.sessionId ?? item?.session);
        return !selectedSessionId || studentSessionId !== selectedSessionId;
      }),
    [rawStudents, selectedSessionId],
  );

  const classById = useMemo(() => {
    const map = new Map();
    classes.forEach(item => {
      const id = normalizeId(item);
      if (id) map.set(id, item);
    });
    return map;
  }, [classes]);

  const selectedClass = selectedClassId ? classById.get(selectedClassId) : null;

  useEffect(() => {
    reveal.setValue(0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reveal]);

  useEffect(() => {
    if (selectedSessionId || !sessions.length) return;
    const nextId = pickDefaultSession(sessions);
    if (nextId) setSelectedSessionId(nextId);
  }, [selectedSessionId, sessions]);

  useEffect(() => {
    if (!students.length || !selectedClassId) {
      setUpdatesByStudentId({});
      return;
    }
    const sourceClass = classById.get(selectedClassId);
    const sourceGrade = parseGrade(sourceClass?.name);
    const nextGradeName = Number.isFinite(sourceGrade) ? String(sourceGrade + 1) : '';
    const promoteDefaults = Number.isFinite(sourceGrade)
      ? classes.filter(item => String(item?.name ?? '').trim() === nextGradeName)
      : classes.filter(item => normalizeId(item) !== selectedClassId);
    const defaultPromoteTargetId = normalizeId(promoteDefaults[0]);

    setUpdatesByStudentId(prev => {
      const next = {};
      students.forEach(student => {
        const studentId = normalizeId(student);
        if (!studentId) return;
        const existing = prev[studentId];
        next[studentId] = existing || {
          action: 'promote',
          targetClassId: defaultPromoteTargetId || '',
        };
      });
      return next;
    });
  }, [classById, classes, selectedClassId, students]);

  useEffect(() => {
    if (!message.text) return undefined;
    const timer = setTimeout(() => setMessage({ type: '', text: '' }), 2600);
    return () => clearTimeout(timer);
  }, [message.text]);

  const sessionItems = useMemo(
    () =>
      sessions
        .map(item => {
          const id = normalizeId(item);
          return id ? { id, label: toSessionLabel(item) } : null;
        })
        .filter(Boolean),
    [sessions],
  );

  const getRetainOptions = source => {
    const sourceName = String(source?.name ?? '').trim().toLowerCase();
    const filtered = classes.filter(item => String(item?.name ?? '').trim().toLowerCase() === sourceName);
    return filtered.length ? filtered : (source ? [source] : []);
  };

  const getPromoteOptions = source => {
    const sourceGrade = parseGrade(source?.name);
    if (!source) return [];
    if (!Number.isFinite(sourceGrade)) {
      return classes.filter(item => normalizeId(item) !== normalizeId(source));
    }
    const nextGradeName = String(sourceGrade + 1);
    const nextGradeAny = classes.filter(item => String(item?.name ?? '').trim() === nextGradeName);
    if (nextGradeAny.length) return nextGradeAny;
    return classes.filter(item => normalizeId(item) !== normalizeId(source));
  };

  const getTargetOptions = action => {
    if (!selectedClass) return [];
    if (action === 'promote') return getPromoteOptions(selectedClass);
    if (action === 'retain') return getRetainOptions(selectedClass);
    return [];
  };

  const actionItems = [
    { id: 'promote', label: 'Promote' },
    { id: 'retain', label: 'Retain' },
    { id: 'transfer', label: 'Transfer' },
  ];

  const openActionSelector = studentId => setSelectorState({ open: true, mode: 'action', studentId });
  const openTargetSelector = studentId => setSelectorState({ open: true, mode: 'target', studentId });
  const openSessionSelector = () => setSelectorState({ open: true, mode: 'session', studentId: '' });

  const closeSelector = () => setSelectorState({ open: false, mode: 'session', studentId: '' });

  const selectorItems = (() => {
    if (selectorState.mode === 'session') return sessionItems;
    if (selectorState.mode === 'action') return actionItems;
    const studentState = updatesByStudentId[selectorState.studentId];
    const targets = getTargetOptions(studentState?.action);
    return targets
      .map(item => ({ id: normalizeId(item), label: toClassLabel(item) }))
      .filter(item => item.id);
  })();

  const selectorValue = (() => {
    if (selectorState.mode === 'session') return selectedSessionId;
    const state = updatesByStudentId[selectorState.studentId] || {};
    if (selectorState.mode === 'action') return state.action || 'promote';
    return state.targetClassId || '';
  })();

  const handleSelectorPick = value => {
    if (selectorState.mode === 'session') {
      setSelectedSessionId(value || '');
      closeSelector();
      return;
    }
    if (!selectorState.studentId) {
      closeSelector();
      return;
    }

    if (selectorState.mode === 'action') {
      setUpdatesByStudentId(prev => {
        const existing = prev[selectorState.studentId] || { action: 'promote', targetClassId: '' };
        const nextAction = value || 'promote';
        const targetOptions = getTargetOptions(nextAction);
        const fallbackTargetId = nextAction === 'transfer'
          ? ''
          : normalizeId(targetOptions[0]) || selectedClassId;
        return {
          ...prev,
          [selectorState.studentId]: {
            action: nextAction,
            targetClassId:
              nextAction === 'transfer'
                ? ''
                : (targetOptions.some(item => normalizeId(item) === existing.targetClassId)
                  ? existing.targetClassId
                  : fallbackTargetId),
          },
        };
      });
      closeSelector();
      return;
    }

    setUpdatesByStudentId(prev => ({
      ...prev,
      [selectorState.studentId]: {
        ...(prev[selectorState.studentId] || { action: 'retain' }),
        targetClassId: value || '',
      },
    }));
    closeSelector();
  };

  const selectedSessionLabel = sessionItems.find(item => item.id === selectedSessionId)?.label || 'Select session';

  const submitTransition = async () => {
    if (!selectedSessionId) {
      setMessage({ type: 'error', text: 'Please select target session.' });
      return;
    }
    if (!selectedClassId) {
      setMessage({ type: 'error', text: 'Please select source class.' });
      return;
    }
    if (!students.length) {
      setMessage({ type: 'error', text: 'No students available in selected class.' });
      return;
    }

    const updates = students
      .map(student => {
        const studentId = normalizeId(student);
        const state = updatesByStudentId[studentId] || { action: 'promote', targetClassId: '' };
        const action = state.action || 'promote';
        if (action !== 'transfer' && !state.targetClassId) {
          return null;
        }
        return {
          studentId,
          action,
          targetClassId: action === 'transfer' ? undefined : state.targetClassId,
        };
      })
      .filter(Boolean);

    if (!updates.length) {
      setMessage({ type: 'error', text: 'No valid student updates prepared.' });
      return;
    }

    try {
      await transitionMutation.mutateAsync({
        sessionId: selectedSessionId,
        sourceClassId: selectedClassId,
        updates,
      });
      setMessage({ type: 'success', text: 'Session upgrade applied successfully.' });
    } catch (error) {
      const text = error?.response?.data?.message || error?.message || 'Unable to apply session transition.';
      setMessage({ type: 'error', text: String(text) });
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.heroCard,
          {
            opacity: reveal,
            transform: [
              {
                translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.heroKicker}>SESSION UPGRADE</Text>
        <Text style={styles.heroTitle}>Promote and Transition Students</Text>
        <Text style={styles.heroSub}>Pick source class, choose next session, then action per student.</Text>
      </Animated.View>

      <View style={styles.topControlsRow}>
        <Pressable style={styles.sessionBtn} onPress={openSessionSelector}>
          <Ionicons name="calendar-outline" size={16} color={colors.admin.accent} />
          <Text style={styles.sessionBtnText} numberOfLines={1}>{selectedSessionLabel}</Text>
          <Ionicons name="chevron-down" size={15} color={colors.admin.textSecondary} />
        </Pressable>
      </View>

      {message.text ? (
        <View style={[styles.banner, message.type === 'error' ? styles.bannerError : styles.bannerSuccess]}>
          <Text style={styles.bannerText}>{message.text}</Text>
        </View>
      ) : null}

      <View style={styles.bodyRow}>
        <View style={styles.classListCard}>
          <Text style={styles.blockTitle}>Classes</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {classesQuery.isLoading ? <ActivityIndicator size="small" color={colors.brand.primary} /> : null}
            {classes.map(item => {
              const classId = normalizeId(item);
              if (!classId) return null;
              const active = classId === selectedClassId;
              return (
                <Pressable
                  key={classId}
                  style={[styles.classItem, active ? styles.classItemActive : null]}
                  onPress={() => setSelectedClassId(classId)}
                >
                  <Text style={[styles.classItemText, active ? styles.classItemTextActive : null]}>
                    {toClassLabel(item)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.studentPanel}>
          <View style={styles.studentPanelHeader}>
            <Text style={styles.blockTitle}>Students {selectedClass ? `| ${toClassLabel(selectedClass)}` : ''}</Text>
            <Pressable style={styles.applyBtn} onPress={submitTransition} disabled={transitionMutation.isPending}>
              {transitionMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <>
                  <Ionicons name="flash-outline" size={14} color={colors.text.inverse} />
                  <Text style={styles.applyBtnText}>Apply Upgrade</Text>
                </>
              )}
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {!selectedClassId ? (
              <Text style={styles.placeholder}>Select a class to start transition.</Text>
            ) : studentsQuery.isLoading ? (
              <ActivityIndicator size="small" color={colors.brand.primary} />
            ) : !students.length ? (
              <Text style={styles.placeholder}>
                No pending students for selected session in this class. Already transitioned students are hidden.
              </Text>
            ) : (
              students.map((student, index) => {
                const studentId = normalizeId(student);
                if (!studentId) return null;
                const state = updatesByStudentId[studentId] || { action: 'promote', targetClassId: '' };
                const targetOptions = getTargetOptions(state.action);
                const targetLabel = targetOptions.find(item => normalizeId(item) === state.targetClassId);
                const revealPoint = Math.min(0.96, 0.32 + index * 0.03);
                return (
                  <Animated.View
                    key={studentId}
                    style={[
                      styles.studentCard,
                      {
                        opacity: reveal.interpolate({
                          inputRange: [0, revealPoint, 1],
                          outputRange: [0, 0, 1],
                        }),
                        transform: [
                          {
                            translateY: reveal.interpolate({
                              inputRange: [0, 1],
                              outputRange: [10 + index, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <View style={styles.studentTop}>
                      <Text style={styles.studentName}>{student?.name || '-'}</Text>
                      <Text style={styles.studentMeta}>Scholar #{student?.scholarNumber || '-'}</Text>
                    </View>

                    <View style={styles.rowActions}>
                      <Pressable style={styles.selectorBtn} onPress={() => openActionSelector(studentId)}>
                        <Ionicons name="sync-outline" size={14} color={colors.admin.accent} />
                        <Text style={styles.selectorBtnText}>{state.action}</Text>
                        <Ionicons name="chevron-down" size={14} color={colors.admin.textSecondary} />
                      </Pressable>

                      {state.action !== 'transfer' ? (
                        <Pressable style={styles.selectorBtn} onPress={() => openTargetSelector(studentId)}>
                          <Ionicons name="library-outline" size={14} color={colors.admin.accent} />
                          <Text style={styles.selectorBtnText} numberOfLines={1}>
                            {targetLabel ? toClassLabel(targetLabel) : 'Select class'}
                          </Text>
                          <Ionicons name="chevron-down" size={14} color={colors.admin.textSecondary} />
                        </Pressable>
                      ) : (
                        <View style={styles.transferChip}>
                          <Text style={styles.transferChipText}>Transfer: no target class needed</Text>
                        </View>
                      )}
                    </View>
                  </Animated.View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>

      <SelectorModal
        visible={selectorState.open}
        onClose={closeSelector}
        onSelect={handleSelectorPick}
        title={selectorState.mode === 'session' ? 'Select Session' : selectorState.mode === 'action' ? 'Select Action' : 'Select Target Class'}
        searchPlaceholder={selectorState.mode === 'action' ? 'Search action' : 'Search'}
        items={selectorItems}
        selectedValue={selectorValue}
        includeNone={selectorState.mode !== 'action'}
        noneLabel="None"
        valueExtractor={item => item?.id}
        labelExtractor={item => item?.label}
      />
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 14,
      paddingTop: 10,
    },
    heroCard: {
      borderRadius: 18,
      backgroundColor: colors.admin.heroBgAlt,
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      padding: 14,
      marginBottom: 10,
      shadowColor: '#1d3f86',
      shadowOpacity: 0.2,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 5,
    },
    heroKicker: { color: colors.auth.subtitle, fontSize: 10.5, letterSpacing: 1.5, fontWeight: '800' },
    heroTitle: { marginTop: 6, color: colors.text.inverse, fontSize: 22, fontWeight: '900' },
    heroSub: { marginTop: 5, color: colors.auth.subtitle, fontSize: 12.5, lineHeight: 18, fontWeight: '600' },
    topControlsRow: { marginBottom: 8 },
    sessionBtn: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sessionBtnText: { flex: 1, color: colors.admin.textPrimary, fontSize: 13, fontWeight: '700' },
    banner: {
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 8,
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
    bannerText: { color: colors.admin.textPrimary, fontSize: 12, fontWeight: '700' },
    bodyRow: { flex: 1, flexDirection: 'row', gap: 10 },
    classListCard: {
      width: 102,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      padding: 8,
    },
    blockTitle: { color: colors.admin.textPrimary, fontSize: 13, fontWeight: '900', marginBottom: 8 },
    classItem: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      backgroundColor: colors.admin.surfaceStrong,
      paddingHorizontal: 8,
      paddingVertical: 8,
      marginBottom: 7,
    },
    classItemActive: {
      borderColor: colors.brand.primary,
      backgroundColor: colors.admin.navBg,
    },
    classItemText: { color: colors.admin.textPrimary, fontSize: 12, fontWeight: '700' },
    classItemTextActive: { color: colors.text.inverse },
    studentPanel: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      padding: 10,
    },
    studentPanelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 },
    applyBtn: {
      borderRadius: 10,
      backgroundColor: colors.brand.primary,
      paddingHorizontal: 10,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      minWidth: 108,
      justifyContent: 'center',
    },
    applyBtnText: { color: colors.text.inverse, fontSize: 11.5, fontWeight: '800' },
    placeholder: { color: colors.admin.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 8 },
    studentCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      backgroundColor: colors.admin.surfaceStrong,
      padding: 10,
      marginBottom: 8,
    },
    studentTop: { marginBottom: 8 },
    studentName: { color: colors.admin.textPrimary, fontSize: 14, fontWeight: '800' },
    studentMeta: { marginTop: 2, color: colors.admin.textSecondary, fontSize: 11.5, fontWeight: '600' },
    rowActions: { gap: 7 },
    selectorBtn: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.admin.border,
      backgroundColor: colors.admin.surface,
      paddingHorizontal: 10,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    selectorBtnText: { flex: 1, color: colors.admin.textPrimary, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
    transferChip: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      backgroundColor: colors.admin.surface,
      paddingHorizontal: 9,
      paddingVertical: 8,
    },
    transferChipText: { color: colors.admin.textSecondary, fontSize: 11.5, fontWeight: '700' },
  });
