import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppIcon from './AppIcon.js';
import { useAppTheme } from '../../theme/ThemeContext';

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function resolvePalette(colors, tone) {
  if (tone === 'teacher') {
    return colors.teacher;
  }
  if (tone === 'student') {
    return colors.student;
  }
  return colors.admin;
}

export default function ResultDetailModal({
  visible,
  onClose,
  result,
  tone = 'admin',
}) {
  const { colors } = useAppTheme();
  const palette = resolvePalette(colors, tone);
  const styles = useMemo(() => createStyles(colors, palette), [colors, palette]);

  if (!visible || !result) {
    return null;
  }

  const subjectCount = Array.isArray(result.subjectMarks) ? result.subjectMarks.length : 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.hero}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroBadge}>
                <AppIcon name="document-text-outline" size={16} color={colors.text.inverse} />
                <Text style={styles.heroBadgeText}>Result Sheet</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={onClose}>
                <AppIcon name="close" size={16} color={palette.textPrimary} />
              </Pressable>
            </View>
            <Text style={styles.heroTitle}>{result.examTitle || 'Exam Result'}</Text>
            <Text style={styles.heroSub}>
              {result.studentInfo?.name || 'Student'} • {result.classInfo?.label || 'Class not available'}
            </Text>
            <Text style={styles.heroMeta}>
              {result.examType || '-'}{result.month ? ` • ${result.month}` : ''}
            </Text>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Total Marks</Text>
                <Text style={styles.metricValue}>
                  {result.totalMarks ?? 0} / {(result.outOf ?? 0) * subjectCount}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Subjects</Text>
                <Text style={styles.metricValue}>{subjectCount}</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Scholar Number</Text>
                <Text style={styles.infoValue}>{result.studentInfo?.scholarNumber || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Session</Text>
                <Text style={styles.infoValue}>{result.sessionInfo?.name || '-'}</Text>
              </View>
              <View style={styles.infoRowLast}>
                <Text style={styles.infoLabel}>Updated</Text>
                <Text style={styles.infoValue}>{formatDateTime(result.updatedAt)}</Text>
              </View>
            </View>

            <View style={styles.subjectCard}>
              <Text style={styles.sectionTitle}>Subject Wise Marks</Text>
              {Array.isArray(result.subjectMarks) && result.subjectMarks.length ? (
                result.subjectMarks.map(item => (
                  <View key={`${item.subject}-${item.marks}`} style={styles.subjectRow}>
                    <Text style={styles.subjectName}>{item.subject}</Text>
                    <View style={styles.subjectMarksPill}>
                      <Text style={styles.subjectMarksText}>{item.marks} / {result.outOf ?? 0}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No subject marks available.</Text>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors, palette) =>
  StyleSheet.create({
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
    card: {
      width: '100%',
      maxHeight: '84%',
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: palette.borderStrong,
      backgroundColor: palette.surface,
    },
    hero: {
      backgroundColor: palette.heroBgAlt,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 16,
    },
    heroTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    heroBadgeText: {
      color: colors.text.inverse,
      fontSize: 11,
      fontWeight: '800',
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.borderSoft,
    },
    heroTitle: {
      color: colors.text.inverse,
      fontSize: 21,
      fontWeight: '900',
    },
    heroSub: {
      marginTop: 5,
      color: colors.auth.subtitle,
      fontSize: 12.5,
      fontWeight: '600',
    },
    heroMeta: {
      marginTop: 4,
      color: colors.auth.subtitle,
      fontSize: 11.5,
      fontWeight: '700',
    },
    body: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    metricsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
    },
    metricCard: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.borderStrong,
      backgroundColor: palette.surfaceStrong,
      padding: 12,
    },
    metricLabel: {
      color: palette.textSecondary,
      fontSize: 11.5,
      fontWeight: '700',
    },
    metricValue: {
      marginTop: 6,
      color: palette.textPrimary,
      fontSize: 22,
      fontWeight: '900',
    },
    infoCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.borderStrong,
      backgroundColor: palette.surface,
      padding: 12,
      marginBottom: 12,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
      paddingBottom: 8,
      marginBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderSubtle,
    },
    infoRowLast: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },
    infoLabel: {
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    infoValue: {
      color: palette.textPrimary,
      fontSize: 12.5,
      fontWeight: '800',
      flexShrink: 1,
      textAlign: 'right',
    },
    subjectCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.borderStrong,
      backgroundColor: palette.surface,
      padding: 12,
      marginBottom: 16,
    },
    sectionTitle: {
      color: palette.textPrimary,
      fontSize: 14,
      fontWeight: '900',
      marginBottom: 10,
    },
    subjectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderSubtle,
    },
    subjectName: {
      color: palette.textPrimary,
      fontSize: 12.5,
      fontWeight: '800',
      flex: 1,
    },
    subjectMarksPill: {
      minWidth: 58,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 7,
      alignItems: 'center',
      backgroundColor: palette.successBg,
      borderWidth: 1,
      borderColor: palette.successBorder,
    },
    subjectMarksText: {
      color: palette.textPrimary,
      fontSize: 12,
      fontWeight: '900',
    },
    emptyText: {
      color: palette.textSecondary,
      fontSize: 12.5,
      textAlign: 'center',
      paddingVertical: 12,
    },
  });
