import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import PaginationControls from '../common/PaginationControls';
import { useAppTheme } from '../../theme/ThemeContext';

function StudentCard({ item, styles }) {
  return (
    <View style={styles.studentCard}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name?.charAt(0)?.toUpperCase() || 'S'}</Text>
        </View>
        <View style={styles.nameWrap}>
          <Text style={styles.studentName}>{item.name || '-'}</Text>
          <Text style={styles.studentSub}>Scholar #{item.scholarNumber || '-'}</Text>
        </View>
        <View style={[styles.statusBadge, item.status === 'inactive' ? styles.statusInactive : null]}>
          <Text style={styles.statusText}>{item.status || 'active'}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="people-outline" size={14} style={styles.metaIcon} />
        <Text style={styles.metaText}>Parent: {item.parentName || '-'}</Text>
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="call-outline" size={14} style={styles.metaIcon} />
        <Text style={styles.metaText}>Phone: {item.phoneNumber || '-'}</Text>
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={14} style={styles.metaIcon} />
        <Text style={styles.metaText}>Session: {item.sessionName || '-'}</Text>
      </View>
    </View>
  );
}

export default function TeacherClassStudentsScreen({
  classInfo,
  query,
  page,
  onPageChange,
  onBackToDashboard,
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const students = query?.data?.students ?? [];
  const totalPages = query?.data?.totalPages ?? 1;

  return (
    <View style={styles.container}>
      <View style={styles.headCard}>
        <Pressable style={styles.backInline} onPress={onBackToDashboard}>
          <Ionicons name="chevron-back" size={16} color={colors.teacher.accent} />
          <Text style={styles.backText}>Back to Dashboard</Text>
        </Pressable>
        <Text style={styles.headTitle}>Class {classInfo?.label || '-'}</Text>
        <Text style={styles.headSub}>Students assigned to this class</Text>
      </View>

      {query.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={colors.teacher.accent} />
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item, index) => item.id || `teacher-student-${index}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <StudentCard item={item} styles={styles} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No students found for this class.</Text>}
          ListFooterComponent={
            <PaginationControls
              page={page}
              totalPages={totalPages}
              onPrev={() => onPageChange(Math.max(1, page - 1))}
              onNext={() => onPageChange(Math.min(totalPages, page + 1))}
              disablePrev={page <= 1}
              disableNext={page >= totalPages}
            />
          }
        />
      )}
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
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headCard: {
      borderRadius: 20,
      backgroundColor: colors.teacher.heroBgAlt,
      borderWidth: 1,
      borderColor: colors.teacher.borderSoft,
      padding: 14,
      marginBottom: 10,
      shadowColor: '#0d5f89',
      shadowOpacity: 0.2,
      shadowRadius: 11,
      shadowOffset: { width: 0, height: 5 },
      elevation: 5,
    },
    backInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      marginBottom: 8,
    },
    backText: {
      color: colors.auth.subtitle,
      fontSize: 12,
      fontWeight: '700',
    },
    headTitle: {
      color: colors.text.inverse,
      fontSize: 20,
      fontWeight: '900',
    },
    headSub: {
      marginTop: 4,
      color: colors.auth.subtitle,
      fontSize: 12.5,
    },
    listContent: {
      paddingBottom: 20,
    },
    studentCard: {
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      padding: 12,
      marginBottom: 10,
      shadowColor: '#0c4f71',
      shadowOpacity: 0.09,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      gap: 10,
    },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.teacher.navBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: colors.text.inverse,
      fontWeight: '800',
      fontSize: 14,
    },
    nameWrap: {
      flex: 1,
    },
    studentName: {
      color: colors.teacher.textPrimary,
      fontSize: 15.5,
      fontWeight: '800',
    },
    studentSub: {
      marginTop: 2,
      color: colors.teacher.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    statusBadge: {
      borderRadius: 10,
      paddingHorizontal: 9,
      paddingVertical: 5,
      backgroundColor: colors.teacher.successBg,
      borderWidth: 1,
      borderColor: colors.teacher.successBorder,
    },
    statusInactive: {
      backgroundColor: colors.teacher.dangerBg,
      borderColor: colors.teacher.dangerBorder,
    },
    statusText: {
      color: colors.teacher.textPrimary,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'capitalize',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 5,
    },
    metaIcon: {
      color: colors.teacher.accent,
    },
    metaText: {
      color: colors.teacher.textSecondary,
      fontSize: 12.5,
    },
    emptyText: {
      color: colors.teacher.textSecondary,
      textAlign: 'center',
      marginTop: 30,
      fontSize: 13,
    },
  });
