import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../common/AppIcon.js';
import ResultDetailModal from '../common/ResultDetailModal';
import ResultEditModal from '../common/ResultEditModal';
import CustomDropdownSelector from '../common/CustomDropdownSelector';
import { useTeacherStudentsByClassQuery } from '../../hooks/useTeacherQueries';
import {
  useTeacherDeleteResultMutation,
  useTeacherStudentResultsQuery,
  useTeacherSubmitResultMutation,
  useTeacherUpdateResultMutation,
} from '../../hooks/useResultQueries';
import {
  buildAutoExamTitle,
  examNeedsMonth,
  EXAM_TYPE_OPTIONS,
  getMarksheetSubjects,
  getResultTotalOutOf,
  MONTH_OPTIONS,
} from '../../constants/resultConstants';
import { useAppTheme } from '../../theme/ThemeContext';

function getErrorMessage(error, fallback) {
  const message = error?.response?.data?.message || error?.response?.data?.error || error?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

function buildSubjectForm(subjects = [], defaultOutOf = '100') {
  return subjects.reduce((acc, subject) => {
    const key = String(subject ?? '').trim().toUpperCase();
    if (!key) return acc;
    acc[key] = { marks: '', outOf: String(defaultOutOf || '100'), isAbsent: false };
    return acc;
  }, {});
}

function getEntityId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const nested = value?._id ?? value?.id ?? value?.$oid ?? '';
    if (typeof nested === 'string') return nested.trim();
  }
  return '';
}

export default function TeacherResultEntryScreen({ assignedClass }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scrollRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [mode, setMode] = useState('create');
  const [examType, setExamType] = useState(EXAM_TYPE_OPTIONS[0]);
  const [month, setMonth] = useState('');
  const [examTitle, setExamTitle] = useState('');
  const [defaultOutOf, setDefaultOutOf] = useState('100');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [subjectForm, setSubjectForm] = useState(() =>
    buildSubjectForm(getMarksheetSubjects(assignedClass?.subjects), '100'),
  );
  const [selectedResult, setSelectedResult] = useState(null);
  const [editingResult, setEditingResult] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const classId = getEntityId(assignedClass);
  const classSubjects = getMarksheetSubjects(assignedClass?.subjects);

  const studentsQuery = useTeacherStudentsByClassQuery({
    classId,
    page: 1,
    limit: 200,
    enabled: Boolean(classId),
  });
  const submitMutation = useTeacherSubmitResultMutation();
  const updateMutation = useTeacherUpdateResultMutation();
  const deleteMutation = useTeacherDeleteResultMutation();
  const studentResultsQuery = useTeacherStudentResultsQuery(
    selectedStudentId,
    mode === 'manage' && Boolean(selectedStudentId),
  );

  useEffect(() => {
    setSubjectForm(buildSubjectForm(classSubjects, defaultOutOf || '100'));
  }, [classId]);

  useEffect(() => {
    if (!message.text) return undefined;
    const timer = setTimeout(() => setMessage({ type: '', text: '' }), 2800);
    return () => clearTimeout(timer);
  }, [message.text]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, event => {
      setKeyboardHeight(event?.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const studentList = Array.isArray(studentsQuery.data?.students) ? studentsQuery.data.students : [];
  const selectedStudent = studentList.find(item => item.id === selectedStudentId) || null;
  const resultList = Array.isArray(studentResultsQuery.data?.data) ? studentResultsQuery.data.data : [];

  const totalPreview = useMemo(() => {
    return classSubjects.reduce(
      (acc, subject) => {
        const row = subjectForm[String(subject).toUpperCase()] || {};
        const outOf = Number(row.outOf || 0);
        acc.totalOutOf += Number.isFinite(outOf) ? outOf : 0;
        if (!row.isAbsent) {
          const marks = Number(row.marks || 0);
          acc.totalMarks += Number.isFinite(marks) ? marks : 0;
        }
        return acc;
      },
      { totalMarks: 0, totalOutOf: 0 },
    );
  }, [classSubjects, subjectForm]);

  const applyOutOfToAll = (value = defaultOutOf) => {
    const next = String(value || '').replace(/[^\d]/g, '') || '100';
    setDefaultOutOf(next);
    setSubjectForm(prev => {
      const copy = { ...prev };
      Object.keys(copy).forEach(key => {
        copy[key] = { ...copy[key], outOf: next };
      });
      return copy;
    });
  };

  const updateSubject = (subject, patch) => {
    const key = String(subject ?? '').trim().toUpperCase();
    setSubjectForm(prev => ({
      ...prev,
      [key]: { ...(prev[key] || { marks: '', outOf: defaultOutOf || '100', isAbsent: false }), ...patch },
    }));
  };

  const fieldY = useRef({});
  const ensureFieldVisible = key => {
    const y = fieldY.current[key];
    if (typeof y !== 'number' || !scrollRef.current) return;
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true });
    }, 80);
  };

  const handleExamTypeChange = value => {
    setExamType(value);
    const nextMonth = examNeedsMonth(value) ? month : '';
    if (!examNeedsMonth(value)) setMonth('');
    setExamTitle(buildAutoExamTitle(value, nextMonth));
  };

  const handleSubmit = async () => {
    if (!selectedStudentId) {
      setMessage({ type: 'error', text: 'Please select a student.' });
      return;
    }
    if (!examType) {
      setMessage({ type: 'error', text: 'Exam type is required.' });
      return;
    }
    if (examNeedsMonth(examType) && !month) {
      setMessage({ type: 'error', text: `Month is required for ${examType}.` });
      return;
    }

    const defaultOutOfNumber = Number(defaultOutOf);
    if (!Number.isFinite(defaultOutOfNumber) || defaultOutOfNumber <= 0) {
      setMessage({ type: 'error', text: 'Default out of must be a valid number.' });
      return;
    }

    for (const subject of classSubjects) {
      const key = String(subject).toUpperCase();
      const row = subjectForm[key] || {};
      const outOf = Number(row.outOf);
      if (!Number.isFinite(outOf) || outOf <= 0) {
        setMessage({ type: 'error', text: `Enter out of for ${key}.` });
        return;
      }
      if (!row.isAbsent) {
        if (!String(row.marks ?? '').trim()) {
          setMessage({ type: 'error', text: `Enter marks for ${key} or mark Absent.` });
          return;
        }
        const marks = Number(row.marks);
        if (!Number.isFinite(marks) || marks < 0) {
          setMessage({ type: 'error', text: `Valid marks required for ${key}.` });
          return;
        }
        if (marks > outOf) {
          setMessage({ type: 'error', text: `${key} marks cannot exceed ${outOf}.` });
          return;
        }
      }
    }

    try {
      await submitMutation.mutateAsync({
        examType,
        month: examNeedsMonth(examType) ? month : '',
        examTitle: examTitle.trim() || buildAutoExamTitle(examType, month),
        outOf: defaultOutOfNumber,
        studentId: selectedStudentId,
        subjectMarks: classSubjects.map(subject => {
          const key = String(subject).toUpperCase();
          const row = subjectForm[key] || {};
          return {
            subject: key,
            marks: row.isAbsent ? 0 : Number(row.marks || 0),
            outOf: Number(row.outOf || defaultOutOfNumber),
            isAbsent: Boolean(row.isAbsent),
          };
        }),
      });
      setMessage({ type: 'success', text: 'Result saved successfully.' });
      setExamType(EXAM_TYPE_OPTIONS[0]);
      setMonth('');
      setExamTitle('');
      setDefaultOutOf('100');
      setSelectedStudentId('');
      setSubjectForm(buildSubjectForm(classSubjects, '100'));
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to save result.') });
    }
  };

  const handleEditSave = async payload => {
    if (!editingResult?.id) return;
    try {
      await updateMutation.mutateAsync({
        resultId: editingResult.id,
        studentId: selectedStudentId,
        payload,
      });
      setEditingResult(null);
      setMessage({ type: 'success', text: 'Result updated successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to update result.') });
    }
  };

  const handleDelete = item => {
    Alert.alert('Delete Result', `Delete "${item.examTitle || 'this result'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync({ resultId: item.id, studentId: selectedStudentId });
            if (selectedResult?.id === item.id) setSelectedResult(null);
            if (editingResult?.id === item.id) setEditingResult(null);
            setMessage({ type: 'success', text: 'Result deleted successfully.' });
          } catch (error) {
            setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to delete result.') });
          }
        },
      },
    ]);
  };

  if (!classId) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.emptyTitle}>No class assigned</Text>
        <Text style={styles.emptySub}>Ask admin to assign a class before entering results.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.container,
          {
            paddingBottom:
              Platform.OS === 'android'
                ? Math.max(26, keyboardHeight + 48)
                : Math.max(26, insets.bottom + 24),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.heroCard}>
        <Text style={styles.heroOverline}>RESULT & MARKSHEET</Text>
        <Text style={styles.heroTitle}>Teacher Marksheet</Text>
        <Text style={styles.heroSub}>
          Enter marks for {assignedClass?.label || 'your class'} with per-subject max marks and absent support.
        </Text>
      </View>

      <View style={styles.modeRow}>
        <Pressable style={[styles.modeBtn, mode === 'create' ? styles.modeBtnActive : null]} onPress={() => setMode('create')}>
          <Text style={[styles.modeText, mode === 'create' ? styles.modeTextActive : null]}>Create Result</Text>
        </Pressable>
        <Pressable style={[styles.modeBtn, mode === 'manage' ? styles.modeBtnActive : null]} onPress={() => setMode('manage')}>
          <Text style={[styles.modeText, mode === 'manage' ? styles.modeTextActive : null]}>Manage Results</Text>
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Assigned Class</Text>
          <Text style={styles.summaryValue}>{assignedClass?.label || '-'}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Subjects</Text>
          <Text style={styles.summaryValue}>{classSubjects.length}</Text>
        </View>
      </View>

      {mode === 'create' ? (
        <>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Exam Details</Text>
            <CustomDropdownSelector
              tone="teacher"
              label="Exam Type"
              value={examType}
              placeholder="Select exam type"
              options={EXAM_TYPE_OPTIONS.map(item => ({ value: item, label: item }))}
              onSelect={handleExamTypeChange}
            />
            {examNeedsMonth(examType) ? (
              <CustomDropdownSelector
                tone="teacher"
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

            <Text style={styles.inputLabel}>Exam Title</Text>
            <View style={styles.inputRow}>
              <AppIcon name="document-text-outline" size={16} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={examTitle}
                onChangeText={setExamTitle}
                placeholder={buildAutoExamTitle(examType, month) || 'Exam title'}
                placeholderTextColor={colors.text.muted}
                onFocus={() => ensureFieldVisible('examTitle')}
              />
            </View>

            <CustomDropdownSelector
              tone="teacher"
              label="Student"
              value={selectedStudent ? `${selectedStudent.name} • ${selectedStudent.scholarNumber}` : ''}
              placeholder="Select student"
              options={studentList}
              onSelect={setSelectedStudentId}
              valueExtractor={item => item.id}
              labelExtractor={item => `${item?.name ?? '-'} • ${item?.scholarNumber ?? '-'}`}
              searchPlaceholder="Search by name or scholar number"
            />
          </View>

          <View
            style={styles.sectionCard}
            onLayout={e => {
              fieldY.current.maxMarks = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.sectionTitle}>Max Marks (Out of)</Text>
            <Text style={styles.helperText}>Apply once for all subjects. Change any subject max only if needed.</Text>
            <View style={styles.maxRow}>
              <View style={[styles.inputRow, styles.maxInput]}>
                <AppIcon name="calculator-outline" size={16} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={defaultOutOf}
                  onChangeText={value => setDefaultOutOf(String(value || '').replace(/[^\d]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="100"
                  placeholderTextColor={colors.text.muted}
                  onFocus={() => ensureFieldVisible('maxMarks')}
                />
              </View>
              <Pressable style={styles.applyBtn} onPress={() => applyOutOfToAll(defaultOutOf)}>
                <Text style={styles.applyBtnText}>Apply to all</Text>
              </Pressable>
            </View>
            <View style={styles.chipRow}>
              {['10', '20', '50', '100'].map(value => (
                <Pressable key={value} style={styles.chip} onPress={() => applyOutOfToAll(value)}>
                  <Text style={styles.chipText}>/{value}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View
            style={styles.sectionCard}
            onLayout={e => {
              fieldY.current.subjectsSection = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.sectionHeadRow}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Subject Marks</Text>
              <View style={styles.totalPill}>
                <Text style={styles.totalPillText}>
                  {totalPreview.totalMarks} / {totalPreview.totalOutOf}
                </Text>
              </View>
            </View>

            {classSubjects.map(subject => {
              const key = String(subject).toUpperCase();
              const row = subjectForm[key] || { marks: '', outOf: defaultOutOf, isAbsent: false };
              return (
                <View
                  key={key}
                  style={styles.subjectCard}
                  onLayout={e => {
                    fieldY.current[key] =
                      (fieldY.current.subjectsSection || 0) + e.nativeEvent.layout.y;
                  }}
                >
                  <View style={styles.subjectTop}>
                    <Text style={styles.subjectName}>{key}</Text>
                    <Pressable
                      style={[styles.absentBtn, row.isAbsent ? styles.absentBtnActive : null]}
                      onPress={() => updateSubject(key, { isAbsent: !row.isAbsent, marks: row.isAbsent ? row.marks : '' })}
                    >
                      <Text style={[styles.absentBtnText, row.isAbsent ? styles.absentBtnTextActive : null]}>
                        {row.isAbsent ? 'Absent (A)' : 'Mark Absent'}
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
                        value={String(row.marks ?? '')}
                        onChangeText={value => updateSubject(key, { marks: String(value || '').replace(/[^\d]/g, '') })}
                        keyboardType="number-pad"
                        placeholder="Enter marks"
                        placeholderTextColor={colors.text.muted}
                        onFocus={() => ensureFieldVisible(key)}
                      />
                    )}
                    <Text style={styles.outOfHint}>/ {row.outOf || defaultOutOf || 0}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <Pressable style={styles.submitBtn} onPress={handleSubmit} disabled={submitMutation.isPending}>
            {submitMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.text.inverse} />
            ) : (
              <>
                <AppIcon name="save-outline" size={16} color={colors.text.inverse} />
                <Text style={styles.submitBtnText}>Submit Result</Text>
              </>
            )}
          </Pressable>
        </>
      ) : (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Student Results</Text>
          <CustomDropdownSelector
            tone="teacher"
            label="Student"
            value={selectedStudent ? `${selectedStudent.name} • ${selectedStudent.scholarNumber}` : ''}
            placeholder="Select student"
            options={studentList}
            onSelect={setSelectedStudentId}
            valueExtractor={item => item.id}
            labelExtractor={item => `${item?.name ?? '-'} • ${item?.scholarNumber ?? '-'}`}
            searchPlaceholder="Search by name or scholar number"
          />
          {!selectedStudentId ? (
            <Text style={styles.helperText}>Select a student to view, edit, or delete results.</Text>
          ) : studentResultsQuery.isLoading ? (
            <ActivityIndicator size="small" color={colors.brand.primary} />
          ) : (
            <FlatList
              data={resultList}
              keyExtractor={(item, index) => item.id || `teacher-result-${index}`}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Pressable style={styles.resultCard} onPress={() => setSelectedResult(item)}>
                  <View style={styles.resultTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultTitle}>{item.examTitle || 'Exam Result'}</Text>
                      <Text style={styles.resultMeta}>
                        {item.examType}
                        {item.month ? ` • ${item.month}` : ''}
                        {` • ${item.isLive ? 'Live' : 'Pending'}`}
                      </Text>
                    </View>
                    <View style={styles.totalPill}>
                      <Text style={styles.totalPillText}>
                        {item.totalMarks} / {getResultTotalOutOf(item)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.actionRow}>
                    <Pressable
                      style={styles.editBtn}
                      onPress={event => {
                        event?.stopPropagation?.();
                        setSelectedResult(null);
                        setEditingResult(item);
                      }}
                    >
                      <Text style={styles.editBtnText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      style={styles.deleteBtn}
                      onPress={event => {
                        event?.stopPropagation?.();
                        handleDelete(item);
                      }}
                    >
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </Pressable>
                  </View>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.helperText}>No results found for selected student.</Text>}
            />
          )}
        </View>
      )}

      {message.text ? (
        <View style={[styles.banner, message.type === 'error' ? styles.bannerError : styles.bannerSuccess]}>
          <Text style={styles.bannerText}>{message.text}</Text>
        </View>
      ) : null}

      <ResultDetailModal
        visible={Boolean(selectedResult)}
        onClose={() => setSelectedResult(null)}
        result={selectedResult}
        tone="teacher"
      />
      <ResultEditModal
        visible={Boolean(editingResult)}
        onClose={() => setEditingResult(null)}
        result={editingResult}
        tone="teacher"
        saving={updateMutation.isPending}
        onSave={handleEditSave}
      />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    flex: { flex: 1 },
    container: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 26 },
    centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    emptyTitle: { color: colors.teacher.textPrimary, fontSize: 18, fontWeight: '900' },
    emptySub: {
      marginTop: 6,
      color: colors.teacher.textSecondary,
      fontSize: 12.5,
      textAlign: 'center',
      lineHeight: 18,
    },
    heroCard: {
      borderRadius: 20,
      backgroundColor: colors.teacher.heroBgAlt,
      borderWidth: 1,
      borderColor: colors.teacher.borderSoft,
      padding: 14,
      marginBottom: 10,
    },
    heroOverline: { color: colors.auth.subtitle, fontSize: 10.5, letterSpacing: 1.5, fontWeight: '800' },
    heroTitle: { marginTop: 6, color: colors.text.inverse, fontSize: 24, fontWeight: '900' },
    heroSub: { marginTop: 6, color: colors.auth.subtitle, fontSize: 12.5, lineHeight: 18 },
    summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    modeRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    modeBtn: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      paddingVertical: 10,
      alignItems: 'center',
    },
    modeBtnActive: { borderColor: colors.teacher.accent, backgroundColor: colors.teacher.accent },
    modeText: { color: colors.teacher.textPrimary, fontSize: 12.5, fontWeight: '800' },
    modeTextActive: { color: colors.text.inverse },
    summaryCard: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      padding: 12,
    },
    summaryLabel: { color: colors.teacher.textSecondary, fontSize: 11.5, fontWeight: '700' },
    summaryValue: { marginTop: 6, color: colors.teacher.textPrimary, fontSize: 14, fontWeight: '900' },
    sectionCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      padding: 12,
      marginBottom: 10,
    },
    sectionHeadRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    sectionTitle: { color: colors.teacher.textPrimary, fontSize: 14, fontWeight: '900', marginBottom: 10 },
    inputRow: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surfaceStrong,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      marginBottom: 10,
    },
    inputLabel: {
      color: colors.teacher.textSecondary,
      fontSize: 11.5,
      fontWeight: '700',
      marginBottom: 6,
      marginTop: 2,
    },
    inputIcon: { color: colors.teacher.accent, marginRight: 8 },
    input: { flex: 1, color: colors.teacher.textPrimary, paddingVertical: 11, fontSize: 13.5 },
    helperText: { color: colors.teacher.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 },
    maxRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    maxInput: { flex: 1, marginBottom: 0 },
    applyBtn: {
      borderRadius: 12,
      backgroundColor: colors.teacher.navBg,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    applyBtnText: { color: colors.text.inverse, fontSize: 12, fontWeight: '800' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    chip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surfaceStrong,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    chipText: { color: colors.teacher.textPrimary, fontSize: 12, fontWeight: '800' },
    totalPill: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.teacher.successBg,
      borderWidth: 1,
      borderColor: colors.teacher.successBorder,
    },
    totalPillText: { color: colors.teacher.textPrimary, fontSize: 11.5, fontWeight: '900' },
    subjectCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.teacher.borderSubtle,
      backgroundColor: colors.teacher.surfaceStrong,
      padding: 10,
      marginBottom: 8,
    },
    subjectTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    subjectName: { color: colors.teacher.textPrimary, fontSize: 13, fontWeight: '900', flex: 1 },
    absentBtn: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: colors.teacher.surface,
    },
    absentBtnActive: {
      backgroundColor: colors.teacher.dangerBg,
      borderColor: colors.teacher.dangerBorder,
    },
    absentBtnText: { color: colors.teacher.textSecondary, fontSize: 11, fontWeight: '800' },
    absentBtnTextActive: { color: colors.state.error },
    marksOnlyRow: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    subjectInput: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.teacher.textPrimary,
      fontSize: 13.5,
      fontWeight: '800',
      textAlign: 'center',
    },
    marksInput: { flex: 1 },
    outOfHint: {
      minWidth: 64,
      color: colors.teacher.textSecondary,
      fontSize: 14,
      fontWeight: '900',
      textAlign: 'right',
    },
    absentValue: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.teacher.dangerBg,
      borderColor: colors.teacher.dangerBorder,
    },
    absentValueText: { color: colors.state.error, fontSize: 14, fontWeight: '900' },
    resultCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surfaceStrong,
      padding: 10,
      marginBottom: 8,
    },
    resultTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
    resultTitle: { color: colors.teacher.textPrimary, fontSize: 13, fontWeight: '900' },
    resultMeta: { marginTop: 3, color: colors.teacher.textSecondary, fontSize: 11.5, fontWeight: '700' },
    actionRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
    editBtn: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    editBtnText: { color: colors.teacher.textPrimary, fontSize: 11.5, fontWeight: '800' },
    deleteBtn: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.teacher.dangerBorder,
      backgroundColor: colors.teacher.dangerBg,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    deleteBtnText: { color: colors.state.error, fontSize: 11.5, fontWeight: '800' },
    submitBtn: {
      borderRadius: 14,
      backgroundColor: colors.teacher.navBg,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    submitBtnText: { color: colors.text.inverse, fontSize: 13, fontWeight: '900' },
    banner: { marginTop: 10, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
    bannerError: { backgroundColor: colors.teacher.dangerBg, borderColor: colors.teacher.dangerBorder },
    bannerSuccess: { backgroundColor: colors.teacher.successBg, borderColor: colors.teacher.successBorder },
    bannerText: { color: colors.teacher.textPrimary, fontSize: 12.5, fontWeight: '700' },
  });
