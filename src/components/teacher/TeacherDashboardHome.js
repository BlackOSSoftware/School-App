import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import AppIcon from '../common/AppIcon.js';
import { useAppTheme } from '../../theme/ThemeContext';

const QUICK_ACTIONS = [
  { key: 'mark-attendance', title: 'Mark Attendance', icon: 'checkmark-circle-outline' },
  { key: 'post-homework', title: 'Post Content', icon: 'book-outline' },
  { key: 'announcement', title: 'Announcement', icon: 'megaphone-outline' },
];

function SectionCard({ title, children, styles }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function TeacherDashboardHome({
  teacherName,
  overviewQuery,
  onQuickActionPress,
  onClassPress,
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const assignedClasses = overviewQuery?.data?.assignedClasses ?? [];
  const classSubjects = overviewQuery?.data?.teacher?.classSubjects ?? [];
  const classTeacherOf = overviewQuery?.data?.teacher?.classTeacherOf ?? null;
  const hasTeachingAssignment = Boolean(classTeacherOf?.id) || assignedClasses.length > 0 || classSubjects.length > 0;
  const quickActions = hasTeachingAssignment ? QUICK_ACTIONS : [];

  return (
    <>
      <View style={styles.heroCard}>
        <Text style={styles.heroKicker}>TEACHING OVERVIEW</Text>
        <Text style={styles.heroTitle}>Welcome, {teacherName || 'Teacher'}</Text>
        <Text style={styles.heroSubtitle}>
          {hasTeachingAssignment
            ? 'Daily class operations, attendance and updates in one place.'
            : 'Your account is active, but no class or lecture assignment is linked yet.'}
        </Text>
      </View>

      {!overviewQuery.isLoading && !hasTeachingAssignment ? (
        <SectionCard title="Assignment Status" styles={styles}>
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyStateIconWrap}>
              <AppIcon name="briefcase-outline" size={24} style={styles.emptyStateIcon} />
            </View>
            <Text style={styles.emptyStateTitle}>No class assignment yet</Text>
            <Text style={styles.emptyStateText}>
              Admin has not assigned a class teacher role or lecture mapping to this account yet. Once assigned, attendance, content and class actions will appear here.
            </Text>
          </View>
        </SectionCard>
      ) : null}

      {quickActions.length ? (
        <SectionCard title="Quick Actions" styles={styles}>
          <View style={styles.quickGrid}>
            {quickActions.map(action => (
              <Pressable key={action.key} style={styles.quickCard} onPress={() => onQuickActionPress(action.key)}>
                <View style={styles.quickIconWrap}>
                  <AppIcon name={action.icon} size={27} style={styles.quickIcon} />
                </View>
                <Text style={styles.quickTitle}>{action.title}</Text>
              </Pressable>
            ))}
          </View>
        </SectionCard>
      ) : null}

      {classTeacherOf?.id || overviewQuery.isLoading ? (
      <SectionCard title="Assigned Class Teacher" styles={styles}>
        {overviewQuery.isLoading ? (
          <ActivityIndicator size="small" color={colors.teacher.accent} />
        ) : classTeacherOf?.id ? (
          <Pressable style={styles.classRow} onPress={() => onClassPress(classTeacherOf)}>
            <View>
              <Text style={styles.classLabel}>{classTeacherOf.label}</Text>
              <Text style={styles.classMeta}>Class Teacher Role</Text>
            </View>
            <AppIcon name="chevron-forward" size={17} color={colors.teacher.accent} />
          </Pressable>
        ) : (
          <Text style={styles.emptyText}>No class teacher assignment found.</Text>
        )}
      </SectionCard>
      ) : null}

      {classSubjects.length || overviewQuery.isLoading ? (
      <SectionCard title="Class Subjects" styles={styles}>
        {overviewQuery.isLoading ? (
          <ActivityIndicator size="small" color={colors.teacher.accent} />
        ) : classSubjects.length ? (
          classSubjects.map(subject => (
            <Pressable key={subject} style={styles.lectureRow} onPress={() => classTeacherOf?.id ? onClassPress(classTeacherOf) : undefined}>
              <View style={styles.subjectBadge}>
                <Text style={styles.subjectText}>{subject}</Text>
              </View>
              <View style={styles.lectureBody}>
                <Text style={styles.classLabel}>{classTeacherOf?.label || 'Assigned class'}</Text>
                <Text style={styles.classMeta}>Class subject</Text>
              </View>
              <AppIcon name="chevron-forward" size={16} color={colors.teacher.accent} />
            </Pressable>
          ))
        ) : (
          <Text style={styles.emptyText}>No class subjects found.</Text>
        )}
      </SectionCard>
      ) : null}

      {assignedClasses.length || overviewQuery.isLoading ? (
      <SectionCard title="All Assigned Classes" styles={styles}>
        {overviewQuery.isLoading ? (
          <ActivityIndicator size="small" color={colors.teacher.accent} />
        ) : assignedClasses.length ? (
          assignedClasses.map(item => (
            <Pressable key={item.id} style={styles.classRow} onPress={() => onClassPress(item)}>
              <View>
                <Text style={styles.classLabel}>{item.label}</Text>
                <Text style={styles.classMeta}>View class students</Text>
              </View>
              <AppIcon name="chevron-forward" size={17} color={colors.teacher.accent} />
            </Pressable>
          ))
        ) : (
          <Text style={styles.emptyText}>No assigned classes found.</Text>
        )}
      </SectionCard>
      ) : null}
    </>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    heroCard: {
      borderRadius: 24,
      backgroundColor: colors.teacher.heroBgAlt,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.teacher.borderSoft,
      shadowColor: '#0d577d',
      shadowOpacity: 0.24,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 5 },
      elevation: 7,
    },
    heroKicker: {
      color: colors.auth.subtitle,
      fontSize: 10.5,
      letterSpacing: 1.6,
      fontWeight: '800',
    },
    heroTitle: {
      marginTop: 8,
      color: colors.text.inverse,
      fontSize: 28,
      fontWeight: '900',
      lineHeight: 33,
    },
    heroSubtitle: {
      marginTop: 8,
      color: colors.auth.subtitle,
      fontSize: 13,
      lineHeight: 19,
    },
    sectionCard: {
      borderRadius: 16,
      backgroundColor: colors.teacher.surface,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      padding: 12,
      marginBottom: 12,
      shadowColor: '#0a4f73',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    sectionTitle: {
      color: colors.teacher.textPrimary,
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 10,
    },
    quickGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 10,
    },
    quickCard: {
      width: '48.5%',
      minHeight: 84,
      borderRadius: 14,
      backgroundColor: colors.teacher.surface,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      paddingHorizontal: 10,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      shadowColor: '#0b4d70',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    quickIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.teacher.borderSoft,
      backgroundColor: colors.teacher.surfaceStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickIcon: {
      color: colors.teacher.accent,
    },
    quickTitle: {
      color: colors.teacher.textPrimary,
      fontSize: 13,
      fontWeight: '800',
      lineHeight: 18,
      flexShrink: 1,
    },
    classRow: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surfaceStrong,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    lectureRow: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surfaceStrong,
      paddingHorizontal: 10,
      paddingVertical: 10,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    subjectBadge: {
      borderRadius: 10,
      backgroundColor: colors.teacher.navBg,
      paddingHorizontal: 10,
      paddingVertical: 6,
      minWidth: 82,
      alignItems: 'center',
    },
    subjectText: {
      color: colors.text.inverse,
      fontSize: 11,
      fontWeight: '800',
    },
    lectureBody: {
      flex: 1,
    },
    classLabel: {
      color: colors.teacher.textPrimary,
      fontSize: 13.5,
      fontWeight: '800',
    },
    classMeta: {
      marginTop: 2,
      color: colors.teacher.textSecondary,
      fontSize: 11.5,
      fontWeight: '600',
    },
    emptyText: {
      color: colors.teacher.textSecondary,
      fontSize: 12.5,
      textAlign: 'center',
      paddingVertical: 12,
    },
    emptyStateCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surfaceStrong,
      paddingHorizontal: 14,
      paddingVertical: 18,
      alignItems: 'center',
    },
    emptyStateIconWrap: {
      width: 54,
      height: 54,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.teacher.surface,
      borderWidth: 1,
      borderColor: colors.teacher.borderSoft,
    },
    emptyStateIcon: {
      color: colors.teacher.accent,
    },
    emptyStateTitle: {
      marginTop: 12,
      color: colors.teacher.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    emptyStateText: {
      marginTop: 6,
      color: colors.teacher.textSecondary,
      fontSize: 12.5,
      lineHeight: 18,
      textAlign: 'center',
    },
  });
