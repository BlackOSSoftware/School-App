import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AppIcon from './AppIcon';
import CustomDropdownSelector from './CustomDropdownSelector';
import { buildAutoExamTitle, EXAM_TYPE_OPTIONS, MONTH_OPTIONS } from '../../constants/resultConstants';
import { useAppTheme } from '../../theme/ThemeContext';

function normalizeSubjectMarks(rows = []) {
  if (!Array.isArray(rows)) return {};
  return rows.reduce((acc, item) => {
    const key = String(item?.subject ?? '').trim().toUpperCase();
    if (key) {
      acc[key] = String(Number(item?.marks ?? 0));
    }
    return acc;
  }, {});
}

export default function ResultEditModal({ visible, onClose, result, onSave, saving = false, tone = 'teacher' }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, tone), [colors, tone]);
  const [examType, setExamType] = useState('');
  const [month, setMonth] = useState('');
  const [examTitle, setExamTitle] = useState('');
  const [outOf, setOutOf] = useState('');
  const [marksForm, setMarksForm] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!visible || !result) return;
    setExamType(result.examType || EXAM_TYPE_OPTIONS[0]);
    setMonth(result.month || '');
    setExamTitle(result.examTitle || '');
    setOutOf(String(result.outOf || 100));
    setMarksForm(normalizeSubjectMarks(result.subjectMarks));
    setMessage('');
  }, [visible, result]);

  const onChangeMark = (subject, value) => {
    const key = String(subject || '').trim().toUpperCase();
    setMarksForm(prev => ({ ...prev, [key]: String(value || '').replace(/[^\d]/g, '') }));
  };

  const handleExamTypeChange = nextType => {
    setExamType(nextType);
    if (nextType !== 'Monthly Test') {
      setMonth('');
    }
    setExamTitle(buildAutoExamTitle(nextType, nextType === 'Monthly Test' ? month : ''));
  };

  const handleMonthChange = nextMonth => {
    setMonth(nextMonth);
    setExamTitle(buildAutoExamTitle(examType, nextMonth));
  };

  const handleSave = () => {
    const outOfNumber = Number(outOf);
    if (!examType) {
      setMessage('Exam type is required.');
      return;
    }
    if (examType === 'Monthly Test' && !month) {
      setMessage('Month is required for Monthly Test.');
      return;
    }
    if (!Number.isFinite(outOfNumber) || outOfNumber <= 0) {
      setMessage('Out of must be a valid number.');
      return;
    }
    const subjectMarks = Array.isArray(result?.subjectMarks)
      ? result.subjectMarks.map(item => {
          const subject = String(item?.subject ?? '').trim().toUpperCase();
          const marks = Number(marksForm[subject] || 0);
          return { subject, marks };
        })
      : [];

    const invalid = subjectMarks.find(item => !Number.isFinite(item.marks) || item.marks < 0 || item.marks > outOfNumber);
    if (invalid) {
      setMessage(`Marks for ${invalid.subject} must be between 0 and ${outOfNumber}.`);
      return;
    }
    onSave?.({
      examType,
      month: examType === 'Monthly Test' ? month : '',
      examTitle: String(examTitle || '').trim() || buildAutoExamTitle(examType, month),
      outOf: outOfNumber,
      subjectMarks,
    });
  };

  if (!visible || !result) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit Result</Text>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <AppIcon name="close" size={16} color={styles.title.color} />
            </Pressable>
          </View>
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <CustomDropdownSelector
              tone={tone}
              label="Exam Type"
              value={examType}
              placeholder="Select exam type"
              options={EXAM_TYPE_OPTIONS.map(item => ({ value: item, label: item }))}
              onSelect={handleExamTypeChange}
            />
            {examType === 'Monthly Test' ? (
              <CustomDropdownSelector
                tone={tone}
                label="Month"
                value={month}
                placeholder="Select month"
                options={MONTH_OPTIONS.map(item => ({ value: item, label: item }))}
                onSelect={handleMonthChange}
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
              <Text style={styles.inputLabel}>Out Of</Text>
              <TextInput
                style={styles.input}
                value={outOf}
                onChangeText={value => setOutOf(String(value || '').replace(/[^\d]/g, ''))}
                keyboardType="number-pad"
                placeholder="100"
                placeholderTextColor={colors.text.muted}
              />
            </View>
            <Text style={styles.subjectHeading}>Subject Marks</Text>
            {(result.subjectMarks || []).map(item => {
              const subject = String(item?.subject ?? '').trim().toUpperCase();
              return (
                <View key={subject} style={styles.subjectRow}>
                  <Text style={styles.subjectName}>{subject}</Text>
                  <TextInput
                    style={styles.subjectInput}
                    keyboardType="number-pad"
                    value={marksForm[subject] ?? ''}
                    onChangeText={value => onChangeMark(subject, value)}
                    placeholder="0"
                    placeholderTextColor={colors.text.muted}
                  />
                </View>
              );
            })}
            {message ? <Text style={styles.error}>{message}</Text> : null}
            <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={colors.text.inverse} /> : <Text style={styles.saveText}>Save Changes</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors, tone) => {
  const palette = tone === 'admin' ? colors.admin : colors.teacher;
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: palette.modalBackdrop },
    card: {
      width: '100%',
      maxHeight: '88%',
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
    body: { padding: 14 },
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
    subjectHeading: { color: palette.textPrimary, fontSize: 13, fontWeight: '900', marginTop: 6, marginBottom: 8 },
    subjectRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderSubtle,
      paddingVertical: 8,
    },
    subjectName: { flex: 1, color: palette.textPrimary, fontSize: 12.5, fontWeight: '800' },
    subjectInput: {
      width: 92,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.borderStrong,
      backgroundColor: palette.surfaceStrong,
      textAlign: 'center',
      paddingVertical: 8,
      color: palette.textPrimary,
      fontWeight: '800',
    },
    error: { color: colors.state.error, marginTop: 10, fontSize: 12, fontWeight: '700' },
    saveBtn: {
      marginTop: 12,
      borderRadius: 14,
      backgroundColor: colors.brand.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
    },
    saveText: { color: colors.text.inverse, fontSize: 13, fontWeight: '900' },
  });
};
