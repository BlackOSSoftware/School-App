import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from './AppIcon';
import CustomDropdownSelector from './CustomDropdownSelector';
import {
  buildAutoExamTitle,
  examNeedsMonth,
  EXAM_TYPE_OPTIONS,
  MONTH_OPTIONS,
} from '../../constants/resultConstants';
import { useAppTheme } from '../../theme/ThemeContext';

function buildForm(result) {
  const defaultOutOf = String(result?.outOf || 100);
  const rows = Array.isArray(result?.subjectMarks) ? result.subjectMarks : [];
  const marksForm = {};
  rows.forEach(item => {
    const key = String(item?.subject ?? '').trim().toUpperCase();
    if (!key || key === 'ALL') return;
    marksForm[key] = {
      marks: item?.isAbsent ? '' : String(item?.marks ?? 0),
      outOf: String(item?.outOf ?? defaultOutOf),
      isAbsent: Boolean(item?.isAbsent),
    };
  });
  return {
    examType: result?.examType || EXAM_TYPE_OPTIONS[0],
    month: result?.month || '',
    examTitle: result?.examTitle || '',
    defaultOutOf,
    marksForm,
  };
}

export default function ResultEditModal({ visible, onClose, result, onSave, saving = false, tone = 'teacher' }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, tone), [colors, tone]);
  const [examType, setExamType] = useState('');
  const [month, setMonth] = useState('');
  const [examTitle, setExamTitle] = useState('');
  const [defaultOutOf, setDefaultOutOf] = useState('100');
  const [marksForm, setMarksForm] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!visible || !result) return;
    const next = buildForm(result);
    setExamType(next.examType);
    setMonth(next.month);
    setExamTitle(next.examTitle);
    setDefaultOutOf(next.defaultOutOf);
    setMarksForm(next.marksForm);
    setMessage('');
  }, [visible, result]);

  const subjects = Object.keys(marksForm);

  const updateSubject = (subject, patch) => {
    setMarksForm(prev => ({
      ...prev,
      [subject]: { ...(prev[subject] || {}), ...patch },
    }));
  };

  const applyOutOfToAll = (value = defaultOutOf) => {
    const next = String(value || '').replace(/[^\d]/g, '') || '100';
    setDefaultOutOf(next);
    setMarksForm(prev => {
      const copy = { ...prev };
      Object.keys(copy).forEach(key => {
        copy[key] = { ...copy[key], outOf: next };
      });
      return copy;
    });
  };

  const handleExamTypeChange = nextType => {
    setExamType(nextType);
    const nextMonth = examNeedsMonth(nextType) ? month : '';
    if (!examNeedsMonth(nextType)) setMonth('');
    setExamTitle(buildAutoExamTitle(nextType, nextMonth));
  };

  const handleSave = () => {
    if (!examType) {
      setMessage('Exam type is required.');
      return;
    }
    if (examNeedsMonth(examType) && !month) {
      setMessage(`Month is required for ${examType}.`);
      return;
    }
    const defaultOutOfNumber = Number(defaultOutOf);
    if (!Number.isFinite(defaultOutOfNumber) || defaultOutOfNumber <= 0) {
      setMessage('Default out of must be a valid number.');
      return;
    }

    const subjectMarks = subjects.map(subject => {
      const row = marksForm[subject] || {};
      const outOf = Number(row.outOf || defaultOutOfNumber);
      const marks = row.isAbsent ? 0 : Number(row.marks);
      return {
        subject,
        outOf,
        marks,
        isAbsent: Boolean(row.isAbsent),
      };
    });

    for (const item of subjectMarks) {
      if (!Number.isFinite(item.outOf) || item.outOf <= 0) {
        setMessage(`Invalid out of for ${item.subject}.`);
        return;
      }
      if (!item.isAbsent && (!Number.isFinite(item.marks) || item.marks < 0 || item.marks > item.outOf)) {
        setMessage(`Marks for ${item.subject} must be between 0 and ${item.outOf}.`);
        return;
      }
    }

    onSave?.({
      examType,
      month: examNeedsMonth(examType) ? month : '',
      examTitle: String(examTitle || '').trim() || buildAutoExamTitle(examType, month),
      outOf: defaultOutOfNumber,
      subjectMarks,
    });
  };

  if (!visible || !result) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.cardWrap}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        >
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>Edit Result</Text>
              <Pressable style={styles.closeBtn} onPress={onClose}>
                <AppIcon name="close" size={16} color={styles.title.color} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <CustomDropdownSelector
                tone={tone}
                label="Exam Type"
                value={examType}
                placeholder="Select exam type"
                options={EXAM_TYPE_OPTIONS.map(item => ({ value: item, label: item }))}
                onSelect={handleExamTypeChange}
              />
              {examNeedsMonth(examType) ? (
                <CustomDropdownSelector
                  tone={tone}
                  label="Month"
                  value={month}
                  placeholder="Select month"
                  options={MONTH_OPTIONS.map(item => ({ value: item, label: item }))}
                  onSelect={value => {
                    setMonth(value);
                    setExamTitle(buildAutoExamTitle(examType, value));
                  }}
                />
              ) : null}

              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Exam Title</Text>
                <TextInput
                  style={styles.input}
                  value={examTitle}
                  onChangeText={setExamTitle}
                  placeholder="Exam title"
                  placeholderTextColor={colors.text.muted}
                />
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Max Marks (Out of)</Text>
                <View style={styles.maxRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    value={defaultOutOf}
                    onChangeText={value => setDefaultOutOf(String(value || '').replace(/[^\d]/g, ''))}
                    keyboardType="number-pad"
                    placeholder="100"
                    placeholderTextColor={colors.text.muted}
                  />
                  <Pressable style={styles.applyBtn} onPress={() => applyOutOfToAll(defaultOutOf)}>
                    <Text style={styles.applyText}>Apply all</Text>
                  </Pressable>
                </View>
              </View>

              <Text style={styles.subjectHeading}>Subject Marks</Text>
              {subjects.map(subject => {
                const row = marksForm[subject] || {};
                return (
                  <View key={subject} style={styles.subjectCard}>
                    <View style={styles.subjectTop}>
                      <Text style={styles.subjectName}>{subject}</Text>
                      <Pressable
                        style={[styles.absentBtn, row.isAbsent ? styles.absentBtnActive : null]}
                        onPress={() => updateSubject(subject, { isAbsent: !row.isAbsent })}
                      >
                        <Text style={[styles.absentText, row.isAbsent ? styles.absentTextActive : null]}>
                          {row.isAbsent ? 'A' : 'Absent'}
                        </Text>
                      </Pressable>
                    </View>
                    <View style={styles.marksOnlyRow}>
                      {row.isAbsent ? (
                        <View style={[styles.subjectInput, styles.marksInput, styles.absentValue]}>
                          <Text style={styles.absentValueText}>A</Text>
                        </View>
                      ) : (
                        <TextInput
                          style={[styles.subjectInput, styles.marksInput]}
                          keyboardType="number-pad"
                          value={String(row.marks ?? '')}
                          onChangeText={value =>
                            updateSubject(subject, { marks: String(value || '').replace(/[^\d]/g, '') })
                          }
                          placeholder="Enter marks"
                          placeholderTextColor={colors.text.muted}
                        />
                      )}
                      <Text style={styles.outOfHint}>/ {row.outOf || defaultOutOf || 0}</Text>
                    </View>
                  </View>
                );
              })}

              {message ? <Text style={styles.error}>{message}</Text> : null}
              <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={styles.saveText}>Save Changes</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const createStyles = (colors, tone) => {
  const palette = tone === 'admin' ? colors.admin : colors.teacher;
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: palette.modalBackdrop,
    },
    cardWrap: {
      width: '100%',
      maxHeight: '88%',
    },
    card: {
      width: '100%',
      maxHeight: '100%',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: palette.borderStrong,
      backgroundColor: palette.surface,
      overflow: 'hidden',
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderSubtle,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: { color: palette.textPrimary, fontSize: 16, fontWeight: '900' },
    closeBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: palette.borderSoft,
      backgroundColor: palette.surfaceStrong,
    },
    body: { maxHeight: 520 },
    bodyContent: { padding: 14, paddingBottom: 24 },
    inputWrap: { marginBottom: 10 },
    inputLabel: { color: palette.textSecondary, fontSize: 11.5, fontWeight: '700', marginBottom: 6 },
    input: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.borderStrong,
      backgroundColor: palette.surfaceStrong,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: palette.textPrimary,
      fontSize: 13.5,
      fontWeight: '700',
    },
    maxRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    applyBtn: {
      borderRadius: 12,
      backgroundColor: colors.brand.primary,
      paddingHorizontal: 12,
      paddingVertical: 11,
    },
    applyText: { color: colors.text.inverse, fontSize: 12, fontWeight: '800' },
    subjectHeading: {
      color: palette.textPrimary,
      fontSize: 13,
      fontWeight: '900',
      marginTop: 6,
      marginBottom: 8,
    },
    subjectCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.borderSubtle,
      backgroundColor: palette.surfaceStrong,
      padding: 10,
      marginBottom: 8,
    },
    subjectTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    subjectName: { flex: 1, color: palette.textPrimary, fontSize: 12.5, fontWeight: '800' },
    absentBtn: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.borderStrong,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: palette.surface,
    },
    absentBtnActive: { backgroundColor: palette.dangerBg, borderColor: palette.dangerBorder },
    absentText: { color: palette.textSecondary, fontSize: 11, fontWeight: '800' },
    absentTextActive: { color: colors.state.error },
    marksOnlyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
    subjectInput: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.borderStrong,
      backgroundColor: palette.surface,
      textAlign: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      color: palette.textPrimary,
      fontWeight: '800',
    },
    marksInput: { flex: 1 },
    outOfHint: {
      minWidth: 56,
      color: palette.textSecondary,
      fontSize: 13,
      fontWeight: '900',
      textAlign: 'right',
    },
    absentValue: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.dangerBg,
      borderColor: palette.dangerBorder,
    },
    absentValueText: { color: colors.state.error, fontWeight: '900' },
    error: { color: colors.state.error, marginTop: 10, fontSize: 12, fontWeight: '700' },
    saveBtn: {
      marginTop: 12,
      borderRadius: 14,
      backgroundColor: colors.brand.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      marginBottom: 8,
    },
    saveText: { color: colors.text.inverse, fontSize: 13, fontWeight: '900' },
  });
};
