import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AppIcon from '../common/AppIcon.js';
import ResultEditModal from '../common/ResultEditModal';
import ResultDetailModal from '../common/ResultDetailModal';
import CustomDropdownSelector from '../common/CustomDropdownSelector';
import { useClassesQuery } from '../../hooks/useClassQueries';
import { useAdminStudentResultsQuery, useAdminUpdateResultMutation } from '../../hooks/useResultQueries';
import { useStudentsQuery } from '../../hooks/useStudentQueries';
import { useAppTheme } from '../../theme/ThemeContext';

function getEntityId(value) {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'object') {
    const nested = value?._id ?? value?.id ?? value?.$oid ?? '';
    if (typeof nested === 'string') {
      return nested.trim();
    }
  }
  return '';
}

function getClassLabel(value) {
  const name = String(value?.name ?? '').trim();
  const section = String(value?.section ?? '').trim();
  return `${name}${section ? ` - ${section}` : ''}`.trim();
}

function formatDate(value) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminStudentResultsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [editingResult, setEditingResult] = useState(null);

  const classesQuery = useClassesQuery(1, 200);
  const studentsQuery = useStudentsQuery({
    page,
    limit: 12,
    search: debouncedSearch,
    classId: selectedClassId,
    status: 'all',
  });
  const studentResultsQuery = useAdminStudentResultsQuery(selectedStudent?.id, Boolean(selectedStudent?.id));
  const updateMutation = useAdminUpdateResultMutation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const classList = Array.isArray(classesQuery.data?.data) ? classesQuery.data.data : [];
  const studentList = Array.isArray(studentsQuery.data?.data) ? studentsQuery.data.data : [];
  const resultList = Array.isArray(studentResultsQuery.data?.data) ? studentResultsQuery.data.data : [];
  const totalPages = Number(studentsQuery.data?.totalPages ?? 1);

  const handleAdminEditSave = async payload => {
    if (!editingResult?.id) return;
    try {
      await updateMutation.mutateAsync({
        resultId: editingResult.id,
        studentId: selectedStudent?.id,
        payload,
      });
      setEditingResult(null);
    } catch (_error) {}
  };

  return (
    <View style={styles.container}>
      {!selectedStudent ? (
        <>
          <View style={styles.heroCard}>
            <Text style={styles.heroOverline}>ADMIN RESULT ACCESS</Text>
            <Text style={styles.heroTitle}>Student Result Explorer</Text>
            <Text style={styles.heroSub}>Filter by class, open any student, and review complete marksheets in one premium flow.</Text>
          </View>

          <CustomDropdownSelector
            tone="admin"
            label="Class"
            value={selectedClassId ? getClassLabel(classList.find(item => getEntityId(item) === selectedClassId)) : ''}
            placeholder="Filter by class"
            options={classList}
            onSelect={value => {
              setSelectedClassId(value);
              setPage(1);
            }}
            includeNone
            noneLabel="All Classes"
            valueExtractor={item => getEntityId(item)}
            labelExtractor={item => getClassLabel(item)}
            searchPlaceholder="Search class or section"
          />

          <View style={styles.searchRow}>
            <AppIcon name="search-outline" size={16} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search student by name or scholar number"
              placeholderTextColor={colors.text.muted}
            />
          </View>

          <FlatList
            data={studentList}
            keyExtractor={(item, index) => getEntityId(item) || `admin-result-student-${index}`}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const classInfo = item?.classId;
              return (
                <Pressable
                  style={styles.studentCard}
                  onPress={() =>
                    setSelectedStudent({
                      id: getEntityId(item),
                      name: item?.name ?? '-',
                      scholarNumber: item?.scholarNumber ?? '-',
                      classLabel: getClassLabel(classInfo),
                    })
                  }
                >
                  <View style={styles.studentTopRow}>
                    <View style={styles.studentAvatar}>
                      <Text style={styles.studentAvatarText}>{String(item?.name ?? 'S').charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.studentBody}>
                      <Text style={styles.studentName}>{item?.name ?? '-'}</Text>
                      <Text style={styles.studentMeta}>Scholar #{item?.scholarNumber ?? '-'}</Text>
                    </View>
                    <AppIcon name="chevron-forward" size={16} color={colors.admin.textSecondary} />
                  </View>
                  <View style={styles.studentMetaRow}>
                    <Text style={styles.metaPill}>{getClassLabel(classInfo) || 'No class'}</Text>
                    <Text style={styles.metaPill}>{String(item?.status ?? 'active')}</Text>
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              studentsQuery.isLoading ? (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator size="small" color={colors.brand.primary} />
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No students found</Text>
                  <Text style={styles.emptySub}>Try changing the class filter or search text.</Text>
                </View>
              )
            }
            ListFooterComponent={
              studentList.length ? (
                <View style={styles.paginationRow}>
                  <Pressable style={styles.pageBtn} onPress={() => setPage(prev => Math.max(1, prev - 1))} disabled={page <= 1}>
                    <Text style={styles.pageBtnText}>Previous</Text>
                  </Pressable>
                  <Text style={styles.pageText}>{page} / {totalPages}</Text>
                  <Pressable style={styles.pageBtn} onPress={() => setPage(prev => Math.min(totalPages, prev + 1))} disabled={page >= totalPages}>
                    <Text style={styles.pageBtnText}>Next</Text>
                  </Pressable>
                </View>
              ) : null
            }
          />
        </>
      ) : (
        <>
          <View style={styles.detailHero}>
            <Pressable style={styles.backBtn} onPress={() => setSelectedStudent(null)}>
              <AppIcon name="chevron-back" size={16} color={colors.admin.accent} />
              <Text style={styles.backBtnText}>Back to Students</Text>
            </Pressable>
            <Text style={styles.detailTitle}>{selectedStudent.name}</Text>
            <Text style={styles.detailSub}>{selectedStudent.classLabel || '-'} • Scholar #{selectedStudent.scholarNumber || '-'}</Text>
          </View>

          <FlatList
            data={resultList}
            keyExtractor={(item, index) => item.id || `admin-result-${index}`}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Pressable style={styles.resultCard} onPress={() => setSelectedResult(item)}>
                <View style={styles.resultTopRow}>
                  <View>
                    <Text style={styles.resultTitle}>{item.examTitle || 'Exam Result'}</Text>
                    <Text style={styles.resultSub}>
                      {item.examType || '-'}{item.month ? ` • ${item.month}` : ''} • {formatDate(item.updatedAt)}
                    </Text>
                  </View>
                  <View style={styles.resultScorePill}>
                    <Text style={styles.resultScoreText}>
                      {item.totalMarks ?? 0} / {(item.outOf ?? 0) * (item.subjectMarks?.length ?? 0)}
                    </Text>
                  </View>
                </View>
                <View style={styles.resultActions}>
                  <Text style={styles.resultHint}>Tap to open full marksheet.</Text>
                  <Pressable style={styles.editBtn} onPress={() => setEditingResult(item)}>
                    <Text style={styles.editBtnText}>Edit</Text>
                  </Pressable>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              studentResultsQuery.isLoading ? (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator size="small" color={colors.brand.primary} />
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No results available</Text>
                  <Text style={styles.emptySub}>This student does not have any submitted marksheets yet.</Text>
                </View>
              )
            }
          />
        </>
      )}

      <ResultDetailModal
        visible={Boolean(selectedResult)}
        onClose={() => setSelectedResult(null)}
        result={selectedResult}
        tone="admin"
      />
      <ResultEditModal
        visible={Boolean(editingResult)}
        onClose={() => setEditingResult(null)}
        result={editingResult}
        tone="admin"
        saving={updateMutation.isPending}
        onSave={handleAdminEditSave}
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
      borderRadius: 20,
      backgroundColor: colors.admin.heroBgAlt,
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
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
    searchRow: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      paddingHorizontal: 12,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },
    searchIcon: {
      color: colors.admin.accent,
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      color: colors.admin.textPrimary,
      paddingVertical: 11,
      fontSize: 13.5,
    },
    listContent: {
      paddingBottom: 20,
    },
    studentCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      padding: 13,
      marginBottom: 10,
    },
    studentTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    studentAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.admin.navBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    studentAvatarText: {
      color: colors.text.inverse,
      fontSize: 14,
      fontWeight: '900',
    },
    studentBody: {
      flex: 1,
    },
    studentName: {
      color: colors.admin.textPrimary,
      fontSize: 15,
      fontWeight: '900',
    },
    studentMeta: {
      marginTop: 3,
      color: colors.admin.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    studentMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
    metaPill: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.admin.borderSubtle,
      backgroundColor: colors.admin.surfaceStrong,
      paddingHorizontal: 10,
      paddingVertical: 6,
      color: colors.admin.textSecondary,
      fontSize: 11.5,
      fontWeight: '700',
    },
    detailHero: {
      borderRadius: 20,
      backgroundColor: colors.admin.heroBgAlt,
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      padding: 14,
      marginBottom: 10,
    },
    backBtn: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 10,
    },
    backBtnText: {
      color: colors.admin.textPrimary,
      fontSize: 12,
      fontWeight: '800',
    },
    detailTitle: {
      color: colors.text.inverse,
      fontSize: 22,
      fontWeight: '900',
    },
    detailSub: {
      marginTop: 5,
      color: colors.auth.subtitle,
      fontSize: 12.5,
      fontWeight: '700',
    },
    resultCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      padding: 13,
      marginBottom: 10,
    },
    resultTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    resultTitle: {
      color: colors.admin.textPrimary,
      fontSize: 14.5,
      fontWeight: '900',
    },
    resultSub: {
      marginTop: 4,
      color: colors.admin.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    resultScorePill: {
      minWidth: 62,
      alignItems: 'center',
      borderRadius: 999,
      backgroundColor: colors.admin.successBg,
      borderWidth: 1,
      borderColor: colors.admin.successBorder,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    resultScoreText: {
      color: colors.admin.textPrimary,
      fontSize: 13,
      fontWeight: '900',
    },
    resultHint: {
      color: colors.admin.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    resultActions: {
      marginTop: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    editBtn: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surfaceStrong,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    editBtnText: {
      color: colors.admin.textPrimary,
      fontSize: 11.5,
      fontWeight: '800',
    },
    loaderWrap: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    emptyCard: {
      marginTop: 16,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      padding: 18,
      alignItems: 'center',
    },
    emptyTitle: {
      color: colors.admin.textPrimary,
      fontSize: 16,
      fontWeight: '900',
    },
    emptySub: {
      marginTop: 6,
      color: colors.admin.textSecondary,
      fontSize: 12.5,
      textAlign: 'center',
      lineHeight: 18,
    },
    paginationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingTop: 6,
    },
    pageBtn: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      backgroundColor: colors.admin.surfaceStrong,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    pageBtnText: {
      color: colors.admin.textPrimary,
      fontSize: 12,
      fontWeight: '800',
    },
    pageText: {
      color: colors.admin.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
  });
