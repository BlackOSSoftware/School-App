import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AppIcon from '../common/AppIcon.js';
import ResultDetailModal from '../common/ResultDetailModal';
import ResultEditModal from '../common/ResultEditModal';
import CustomDropdownSelector from '../common/CustomDropdownSelector';
import { useTeacherStudentsByClassQuery } from '../../hooks/useTeacherQueries';
import { useTeacherStudentResultsQuery, useTeacherSubmitResultMutation, useTeacherUpdateResultMutation } from '../../hooks/useResultQueries';
import { buildAutoExamTitle, EXAM_TYPE_OPTIONS, MONTH_OPTIONS } from '../../constants/resultConstants';
import { useAppTheme } from '../../theme/ThemeContext';

function getErrorMessage(error, fallback) {
  const message = error?.response?.data?.message || error?.response?.data?.error || error?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

function buildMarksForm(subjects = []) {
  return subjects.reduce((acc, subject) => {
    acc[String(subject ?? '').trim().toUpperCase()] = '';
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
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mode, setMode] = useState('create');
  const [examType, setExamType] = useState(EXAM_TYPE_OPTIONS[0]);
  const [month, setMonth] = useState('');
  const [examTitle, setExamTitle] = useState('');
  const [outOf, setOutOf] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [marksForm, setMarksForm] = useState(() => buildMarksForm(assignedClass?.subjects));
  const [selectedResult, setSelectedResult] = useState(null);
  const [editingResult, setEditingResult] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const classId = getEntityId(assignedClass);
  const classSubjects = Array.isArray(assignedClass?.subjects) ? assignedClass.subjects : [];

  const studentsQuery = useTeacherStudentsByClassQuery({
    classId,
    page: 1,
    limit: 200,
    enabled: Boolean(classId),
  });
  const submitMutation = useTeacherSubmitResultMutation();
  const updateMutation = useTeacherUpdateResultMutation();
  const studentResultsQuery = useTeacherStudentResultsQuery(selectedStudentId, mode === 'manage' && Boolean(selectedStudentId));

  useEffect(() => {
    setMarksForm(buildMarksForm(classSubjects));
  }, [classId, classSubjects]);

  useEffect(() => {
    if (!message.text) {
      return undefined;
    }
    const timer = setTimeout(() => setMessage({ type: '', text: '' }), 2800);
    return () => clearTimeout(timer);
  }, [message.text]);

  const studentList = Array.isArray(studentsQuery.data?.students) ? studentsQuery.data.students : [];
  const selectedStudent = studentList.find(item => item.id === selectedStudentId) || null;
  const resultList = Array.isArray(studentResultsQuery.data?.data) ? studentResultsQuery.data.data : [];

  const totalPreview = classSubjects.reduce((sum, subject) => {
    const value = Number(marksForm[String(subject).toUpperCase()] || 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  const onChangeMarks = (subject, value) => {
    const normalizedSubject = String(subject ?? '').trim().toUpperCase();
    const sanitized = String(value ?? '').replace(/[^\d]/g, '');
    setMarksForm(prev => ({
      ...prev,
      [normalizedSubject]: sanitized,
    }));
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
    if (examType === 'Monthly Test' && !month) {
      setMessage({ type: 'error', text: 'Month is required for Monthly Test.' });
      return;
    }
    const outOfNumber = Number(outOf);
    if (!Number.isFinite(outOfNumber) || outOfNumber <= 0) {
      setMessage({ type: 'error', text: 'Out of must be a valid number.' });
      return;
    }

    const missingSubject = classSubjects.find(subject => !String(marksForm[String(subject).toUpperCase()] ?? '').trim());
    if (missingSubject) {
      setMessage({ type: 'error', text: `Enter marks for ${String(missingSubject).toUpperCase()}.` });
      return;
    }

    const invalidMark = classSubjects.find(subject => {
      const key = String(subject).toUpperCase();
      const marks = Number(marksForm[key] || 0);
      return marks > outOfNumber;
    });
    if (invalidMark) {
      setMessage({ type: 'error', text: `${String(invalidMark).toUpperCase()} marks cannot exceed ${outOfNumber}.` });
      return;
    }

    try {
      await submitMutation.mutateAsync({
        examType,
        month: examType === 'Monthly Test' ? month : '',
        examTitle: examTitle.trim() || buildAutoExamTitle(examType, month),
        outOf: outOfNumber,
        studentId: selectedStudentId,
        subjectMarks: classSubjects.map(subject => ({
          subject,
          marks: Number(marksForm[String(subject).toUpperCase()] || 0),
        })),
      });
      setMessage({ type: 'success', text: 'Result saved successfully.' });
      setExamType(EXAM_TYPE_OPTIONS[0]);
      setMonth('');
      setExamTitle('');
      setOutOf('');
      setSelectedStudentId('');
      setMarksForm(buildMarksForm(classSubjects));
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

  if (!classId) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.emptyTitle}>No class assigned</Text>
        <Text style={styles.emptySub}>Ask admin to assign a class before entering results.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <Text style={styles.heroOverline}>RESULT MANAGEMENT</Text>
        <Text style={styles.heroTitle}>Create Marksheet</Text>
        <Text style={styles.heroSub}>
          Submit subject-wise marks for {assignedClass?.label || 'your class'} in a clean and professional format.
        </Text>
      </View>

      <View style={styles.modeRow}>
        <Pressable style={[styles.modeBtn, mode === 'create' ? styles.modeBtnActive : null]} onPress={() => setMode('create')}>
          <Text style={styles.modeText}>Create Result</Text>
        </Pressable>
        <Pressable style={[styles.modeBtn, mode === 'manage' ? styles.modeBtnActive : null]} onPress={() => setMode('manage')}>
          <Text style={styles.modeText}>Manage Results</Text>
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
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Exam Details</Text>
        <CustomDropdownSelector
          tone="teacher"
          label="Exam Type"
          value={examType}
          placeholder="Select exam type"
          options={EXAM_TYPE_OPTIONS.map(item => ({ value: item, label: item }))}
          onSelect={value => {
            setExamType(value);
            if (value !== 'Monthly Test') {
              setMonth('');
            }
            setExamTitle(buildAutoExamTitle(value, month));
          }}
        />
        {examType === 'Monthly Test' ? (
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
        <Text style={styles.inputLabel}>Out Of</Text>
        <View style={styles.inputRow}>
          <AppIcon name="calculator-outline" size={16} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={outOf}
            onChangeText={value => setOutOf(String(value || '').replace(/[^\d]/g, ''))}
            keyboardType="number-pad"
            placeholder="Enter total marks (e.g. 100)"
            placeholderTextColor={colors.text.muted}
          />
        </View>
        <View style={styles.inputRow}>
          <AppIcon name="document-text-outline" size={16} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={examTitle}
            onChangeText={setExamTitle}
            placeholder={buildAutoExamTitle(examType, month) || 'Exam title'}
            placeholderTextColor={colors.text.muted}
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
            <Text style={styles.helperText}>Select a student to view all submitted results.</Text>
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
                      <Text style={styles.resultMeta}>{item.examType}{item.month ? ` • ${item.month}` : ''}</Text>
                    </View>
                    <View style={styles.totalPill}>
                      <Text style={styles.totalPillText}>{item.totalMarks} / {(item.outOf || 0) * (item.subjectMarks?.length || 0)}</Text>
                    </View>
                  </View>
                  <Pressable style={styles.editBtn} onPress={() => setEditingResult(item)}>
                    <Text style={styles.editBtnText}>Edit Result</Text>
                  </Pressable>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.helperText}>No results found for selected student.</Text>}
            />
          )}
        </View>
      )}

      {mode === 'create' ? (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeadRow}>
          <Text style={styles.sectionTitle}>Subject Wise Marks</Text>
          <View style={styles.totalPill}>
            <Text style={styles.totalPillText}>Total {totalPreview}</Text>
          </View>
        </View>
        {classSubjects.map(subject => {
          const key = String(subject).toUpperCase();
          return (
            <View key={key} style={styles.subjectRow}>
              <View style={styles.subjectInfo}>
                <Text style={styles.subjectName}>{key}</Text>
                <Text style={styles.subjectHint}>Enter marks in numbers only (max {outOf || 0})</Text>
              </View>
              <TextInput
                style={styles.subjectInput}
                value={marksForm[key] ?? ''}
                onChangeText={value => onChangeMarks(key, value)}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.text.muted}
              />
            </View>
          );
        })}
      </View>
      ) : null}

      {mode === 'create' ? (
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
      ) : null}

      {message.text ? (
        <View style={[styles.banner, message.type === 'error' ? styles.bannerError : styles.bannerSuccess]}>
          <Text style={styles.bannerText}>{message.text}</Text>
        </View>
      ) : null}

      <ResultDetailModal visible={Boolean(selectedResult)} onClose={() => setSelectedResult(null)} result={selectedResult} tone="teacher" />
      <ResultEditModal
        visible={Boolean(editingResult)}
        onClose={() => setEditingResult(null)}
        result={editingResult}
        tone="teacher"
        saving={updateMutation.isPending}
        onSave={handleEditSave}
      />
    </ScrollView>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 26,
    },
    centerState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    emptyTitle: {
      color: colors.teacher.textPrimary,
      fontSize: 18,
      fontWeight: '900',
    },
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
    heroOverline: {
      color: colors.auth.subtitle,
      fontSize: 10.5,
      letterSpacing: 1.5,
      fontWeight: '800',
    },
    heroTitle: {
      marginTop: 6,
      color: colors.text.inverse,
      fontSize: 24,
      fontWeight: '900',
    },
    heroSub: {
      marginTop: 6,
      color: colors.auth.subtitle,
      fontSize: 12.5,
      lineHeight: 18,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
    },
    modeRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
    },
    modeBtn: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      paddingVertical: 10,
      alignItems: 'center',
    },
    modeBtnActive: {
      borderColor: colors.brand.primary,
      backgroundColor: colors.teacher.successBg,
    },
    modeText: {
      color: colors.teacher.textPrimary,
      fontSize: 12.5,
      fontWeight: '800',
    },
    summaryCard: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      padding: 12,
    },
    summaryLabel: {
      color: colors.teacher.textSecondary,
      fontSize: 11.5,
      fontWeight: '700',
    },
    summaryValue: {
      marginTop: 6,
      color: colors.teacher.textPrimary,
      fontSize: 14,
      fontWeight: '900',
    },
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
    sectionTitle: {
      color: colors.teacher.textPrimary,
      fontSize: 14,
      fontWeight: '900',
      marginBottom: 10,
    },
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
    inputIcon: {
      color: colors.teacher.accent,
      marginRight: 8,
    },
    input: {
      flex: 1,
      color: colors.teacher.textPrimary,
      paddingVertical: 11,
      fontSize: 13.5,
    },
    helperText: {
      color: colors.teacher.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
    },
    totalPill: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.teacher.successBg,
      borderWidth: 1,
      borderColor: colors.teacher.successBorder,
    },
    totalPillText: {
      color: colors.teacher.textPrimary,
      fontSize: 11.5,
      fontWeight: '900',
    },
    subjectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: colors.teacher.borderSubtle,
    },
    subjectInfo: {
      flex: 1,
    },
    subjectName: {
      color: colors.teacher.textPrimary,
      fontSize: 13,
      fontWeight: '900',
    },
    subjectHint: {
      marginTop: 2,
      color: colors.teacher.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    subjectInput: {
      width: 86,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surfaceStrong,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.teacher.textPrimary,
      fontSize: 13.5,
      fontWeight: '800',
      textAlign: 'center',
    },
    resultCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surfaceStrong,
      padding: 10,
      marginBottom: 8,
    },
    resultTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      justifyContent: 'space-between',
    },
    resultTitle: {
      color: colors.teacher.textPrimary,
      fontSize: 13,
      fontWeight: '900',
    },
    resultMeta: {
      marginTop: 3,
      color: colors.teacher.textSecondary,
      fontSize: 11.5,
      fontWeight: '700',
    },
    editBtn: {
      marginTop: 8,
      alignSelf: 'flex-end',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    editBtnText: {
      color: colors.teacher.textPrimary,
      fontSize: 11.5,
      fontWeight: '800',
    },
    submitBtn: {
      borderRadius: 14,
      backgroundColor: colors.teacher.navBg,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    submitBtnText: {
      color: colors.text.inverse,
      fontSize: 13,
      fontWeight: '900',
    },
    banner: {
      marginTop: 10,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
    },
    bannerError: {
      backgroundColor: colors.teacher.dangerBg,
      borderColor: colors.teacher.dangerBorder,
    },
    bannerSuccess: {
      backgroundColor: colors.teacher.successBg,
      borderColor: colors.teacher.successBorder,
    },
    bannerText: {
      color: colors.teacher.textPrimary,
      fontSize: 12.5,
      fontWeight: '700',
    },
  });
