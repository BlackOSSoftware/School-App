import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import AppIcon from '../common/AppIcon.js';
import ResultDetailModal from '../common/ResultDetailModal';
import { useStudentResultsQuery } from '../../hooks/useResultQueries';
import { useAppTheme } from '../../theme/ThemeContext';

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

export default function StudentResultsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedResult, setSelectedResult] = useState(null);
  const resultsQuery = useStudentResultsQuery(true);
  const results = Array.isArray(resultsQuery.data?.data) ? resultsQuery.data.data : [];

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroOverline}>ACADEMIC PERFORMANCE</Text>
        <Text style={styles.heroTitle}>Result & Marksheet</Text>
        <Text style={styles.heroSub}>View every published exam result in one clean and easy-to-read place.</Text>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item, index) => item.id || `result-${index}`}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable style={styles.resultCard} onPress={() => setSelectedResult(item)}>
            <View style={styles.resultHead}>
              <View style={styles.resultBadge}>
                <AppIcon name="ribbon-outline" size={15} color={colors.role.studentAccent} />
                <Text style={styles.resultBadgeText}>{item.examTitle || 'Exam Result'}</Text>
              </View>
              <AppIcon name="chevron-forward" size={16} color={colors.student.textSecondary} />
            </View>
            <Text style={styles.resultClass}>{item.classInfo?.label || 'Class not available'}</Text>
            <Text style={styles.resultMeta}>{item.examType || '-'}{item.month ? ` • ${item.month}` : ''}</Text>
            <View style={styles.metricsRow}>
              <View style={styles.metricChip}>
                <Text style={styles.metricLabel}>Total</Text>
                <Text style={styles.metricValue}>{item.totalMarks ?? 0} / {(item.outOf ?? 0) * (item.subjectMarks?.length ?? 0)}</Text>
              </View>
              <View style={styles.metricChip}>
                <Text style={styles.metricLabel}>Subjects</Text>
                <Text style={styles.metricValue}>{item.subjectMarks?.length ?? 0}</Text>
              </View>
              <View style={styles.metricChip}>
                <Text style={styles.metricLabel}>Updated</Text>
                <Text style={styles.metricValueSmall}>{formatDate(item.updatedAt)}</Text>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          resultsQuery.isLoading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="small" color={colors.brand.primary} />
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No results published yet</Text>
              <Text style={styles.emptySub}>Your submitted marksheets will appear here automatically.</Text>
            </View>
          )
        }
      />

      <ResultDetailModal
        visible={Boolean(selectedResult)}
        onClose={() => setSelectedResult(null)}
        result={selectedResult}
        tone="student"
      />
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    heroCard: {
      borderRadius: 20,
      backgroundColor: colors.student.heroBgAlt,
      borderWidth: 1,
      borderColor: colors.student.borderSoft,
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
    listContent: {
      paddingBottom: 20,
    },
    resultCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.student.borderStrong,
      backgroundColor: colors.student.surface,
      padding: 13,
      marginBottom: 10,
    },
    resultHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    resultBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      flex: 1,
    },
    resultBadgeText: {
      color: colors.student.textPrimary,
      fontSize: 14,
      fontWeight: '900',
      flex: 1,
    },
    resultClass: {
      marginTop: 8,
      color: colors.student.textSecondary,
      fontSize: 12.5,
      fontWeight: '700',
    },
    resultMeta: {
      marginTop: 4,
      color: colors.student.textSecondary,
      fontSize: 11.5,
      fontWeight: '700',
    },
    metricsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    metricChip: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.student.borderSubtle,
      backgroundColor: colors.student.surfaceStrong,
      padding: 10,
    },
    metricLabel: {
      color: colors.student.textSecondary,
      fontSize: 10.5,
      fontWeight: '700',
    },
    metricValue: {
      marginTop: 6,
      color: colors.student.textPrimary,
      fontSize: 16,
      fontWeight: '900',
    },
    metricValueSmall: {
      marginTop: 6,
      color: colors.student.textPrimary,
      fontSize: 11.5,
      fontWeight: '800',
    },
    loaderWrap: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    emptyCard: {
      marginTop: 18,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.student.borderStrong,
      backgroundColor: colors.student.surface,
      padding: 18,
      alignItems: 'center',
    },
    emptyTitle: {
      color: colors.student.textPrimary,
      fontSize: 16,
      fontWeight: '900',
    },
    emptySub: {
      marginTop: 6,
      color: colors.student.textSecondary,
      fontSize: 12.5,
      textAlign: 'center',
      lineHeight: 18,
    },
  });
