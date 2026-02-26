import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useStudentMyAttendanceReportQuery } from '../../hooks/useAttendanceQueries';
import { useMyAnnouncementsQuery } from '../../hooks/useAnnouncementQueries';
import { useStudentMyContentQuery } from '../../hooks/useContentQueries';
import { getStudentMe } from '../../services/authService';
import { useActiveSessionQuery } from '../../hooks/useSessionQueries';
import StudentAttendanceOverviewCard from './StudentAttendanceOverviewCard';
import { useAppTheme } from '../../theme/ThemeContext';

const FEES_PAYMENT_URL = 'https://paydirect.eduqfix.com/app/LhnH1iN0jJ+REh6w0QQ4ADkVRmNg4v6tsDp4KMEd/8525/21530';
const BUS_TRACKING_URL = 'https://www.tbtrack.in/gps/?lang=en';

function toIsoDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, '0');
  const day = String(safeDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getClassLabel(classInfo) {
  const name = String(classInfo?.name ?? '').trim();
  const section = String(classInfo?.section ?? '').trim();
  if (!name) {
    return '-';
  }
  return section ? `${name} (${section})` : name;
}

function ContentPreviewSection({
  title,
  icon,
  rows,
  emptyLabel,
  onViewAll,
  onOpenItem,
  colors,
  styles,
}) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <View style={styles.panelTitleWrap}>
          <Ionicons name={icon} size={16} color={colors.student.textPrimary} />
          <Text style={styles.panelTitle}>{title}</Text>
        </View>
        <Pressable style={styles.linkBtn} onPress={onViewAll}>
          <Text style={styles.linkBtnText}>View All</Text>
        </Pressable>
      </View>
      {rows.length ? (
        rows.map(item => (
          <Pressable key={item.id} style={styles.rowCard} onPress={() => onOpenItem(item)}>
            <Text style={styles.rowTitle} numberOfLines={1}>{item.title || '-'}</Text>
            <Text style={styles.rowMeta} numberOfLines={1}>
              {item.subject || '-'} | {item.classInfo?.name || '-'}-{item.classInfo?.section || '-'}
            </Text>
          </Pressable>
        ))
      ) : (
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      )}
    </View>
  );
}

export default function StudentHomeScreen({ session, onOpenTab, onOpenHomework, onOpenNotes }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);
  const [showBusModal, setShowBusModal] = useState(false);

  const activeSessionQuery = useActiveSessionQuery();
  const studentMeQuery = useQuery({
    queryKey: ['student', 'me', 'dashboard'],
    queryFn: getStudentMe,
    staleTime: 20 * 1000,
  });

  const toDate = useMemo(() => toIsoDate(new Date()), []);
  const fromDate = useMemo(() => {
    const start = activeSessionQuery.data?.data?.startDate;
    return toIsoDate(start || new Date());
  }, [activeSessionQuery.data?.data?.startDate]);

  const attendanceQuery = useStudentMyAttendanceReportQuery({ from: fromDate, to: toDate });
  const homeworkQuery = useStudentMyContentQuery({ type: 'homework', page: 1, limit: 3 });
  const notesQuery = useStudentMyContentQuery({ type: 'notes', page: 1, limit: 3 });
  const announcementsQuery = useMyAnnouncementsQuery({ page: 1, limit: showAllAnnouncements ? 20 : 4 });

  const profile = studentMeQuery.data?.data ?? {};
  const classInfo = profile?.class ?? session?.user?.class ?? {};
  const sessionInfo = profile?.session ?? {};
  const busInfo = profile?.bus ?? {};
  const classLabel = getClassLabel(classInfo);
  const sessionLabel = String(sessionInfo?.name || activeSessionQuery.data?.data?.name || '-').trim();
  const busUsername = String(busInfo?.trackingUsername ?? '').trim();
  const busPassword = String(busInfo?.trackingPassword ?? '').trim();
  const hasBusCredentials = Boolean(busUsername || busPassword);
  const announcements = Array.isArray(announcementsQuery.data?.data) ? announcementsQuery.data.data : [];
  const homework = Array.isArray(homeworkQuery.data?.data) ? homeworkQuery.data.data.slice(0, 3) : [];
  const notes = Array.isArray(notesQuery.data?.data) ? notesQuery.data.data.slice(0, 3) : [];

  const handleOpenFees = async () => {
    try {
      await Linking.openURL(FEES_PAYMENT_URL);
    } catch {
      // no-op
    }
  };

  const handleOpenBusLink = async () => {
    try {
      await Linking.openURL(BUS_TRACKING_URL);
    } catch {
      // no-op
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <Text style={styles.heroKicker}>WELCOME BACK</Text>
        <Text style={styles.heroTitle}>{session?.user?.name || profile?.name || 'Student'}</Text>
        <Text style={styles.heroSub}>Class {classLabel} | Session {sessionLabel}</Text>
      </View>

      <View style={styles.glanceRow}>
        <View style={styles.glanceCard}>
          <Text style={styles.glanceLabel}>Daily Focus</Text>
          <Text style={styles.glanceValue}>Learn. Practice. Improve.</Text>
        </View>
        <View style={styles.glanceCard}>
          <Text style={styles.glanceLabel}>Academic Rhythm</Text>
          <Text style={styles.glanceValue}>Consistent & On Track</Text>
        </View>
      </View>

      {attendanceQuery.isLoading ? <ActivityIndicator size="small" color={colors.brand.primary} /> : null}
      <StudentAttendanceOverviewCard report={attendanceQuery.data?.data} subtitle={`Session Snapshot | ${sessionLabel}`} />

      <ContentPreviewSection
        title="Recent Homework"
        icon="book-outline"
        rows={homework}
        emptyLabel="No recent homework."
        onViewAll={() => onOpenTab?.('homework')}
        onOpenItem={item => onOpenHomework?.(item)}
        colors={colors}
        styles={styles}
      />

      <ContentPreviewSection
        title="Recent Notes"
        icon="document-text-outline"
        rows={notes}
        emptyLabel="No recent notes."
        onViewAll={() => onOpenTab?.('notes')}
        onOpenItem={item => onOpenNotes?.(item)}
        colors={colors}
        styles={styles}
      />

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <View style={styles.panelTitleWrap}>
            <Ionicons name="megaphone-outline" size={16} color={colors.student.textPrimary} />
            <Text style={styles.panelTitle}>Recent Announcements</Text>
          </View>
          <Pressable style={styles.linkBtn} onPress={() => setShowAllAnnouncements(prev => !prev)}>
            <Text style={styles.linkBtnText}>{showAllAnnouncements ? 'Show Less' : 'View All'}</Text>
          </Pressable>
        </View>
        {announcementsQuery.isLoading ? <ActivityIndicator size="small" color={colors.brand.primary} /> : null}
        {announcements.length ? (
          announcements.map((item, index) => (
            <View key={item?._id || `announcement-${index}`} style={styles.rowCard}>
              <Text style={styles.rowTitle} numberOfLines={1}>{item?.title || '-'}</Text>
              <Text style={styles.rowMeta} numberOfLines={2}>{item?.description || '-'}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No announcements found.</Text>
        )}
      </View>

      <View style={styles.actionBtnRow}>
        <Pressable style={styles.secondaryActionBtn} onPress={() => setShowBusModal(true)}>
          <Ionicons name="bus-outline" size={15} color={colors.student.textPrimary} />
          <Text style={styles.secondaryActionText}>Bus Tracking</Text>
        </Pressable>
        <Pressable style={styles.primaryActionBtn} onPress={handleOpenFees}>
          <Ionicons name="card-outline" size={15} color={colors.text.inverse} />
          <Text style={styles.primaryActionText}>Pay Fees</Text>
        </Pressable>
      </View>

      </ScrollView>

      {showBusModal ? (
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropTap} onPress={() => setShowBusModal(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <Ionicons name="bus-outline" size={16} color={colors.student.textPrimary} />
                <Text style={styles.modalTitle}>Bus Tracking</Text>
              </View>
              <Pressable style={styles.modalCloseBtn} onPress={() => setShowBusModal(false)}>
                <Ionicons name="close" size={16} color={colors.student.textPrimary} />
              </Pressable>
            </View>

            <Text style={styles.modalHint}>Use these credentials on the tracking portal.</Text>

            <View style={styles.credentialCard}>
              <Text style={styles.credentialLabel}>Username</Text>
              <Text style={styles.credentialValue}>{busUsername || '-'}</Text>
            </View>
            <View style={styles.credentialCard}>
              <Text style={styles.credentialLabel}>Password</Text>
              <Text style={styles.credentialValue}>{busPassword || '-'}</Text>
            </View>

            {!hasBusCredentials ? (
              <Text style={styles.modalWarning}>Bus credentials are not assigned for this student yet.</Text>
            ) : null}

            <View style={styles.modalActionRow}>
              <Pressable style={styles.modalGhostBtn} onPress={() => setShowBusModal(false)}>
                <Text style={styles.modalGhostText}>Close</Text>
              </Pressable>
              <Pressable style={styles.modalPrimaryBtn} onPress={handleOpenBusLink}>
                <Ionicons name="open-outline" size={14} color={colors.text.inverse} />
                <Text style={styles.modalPrimaryText}>Open Link</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    screen: { flex: 1 },
    container: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 22, gap: 10 },
    heroCard: {
      borderRadius: 20,
      backgroundColor: colors.student.heroBg,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.student.borderSoft,
      shadowColor: '#2a1668',
      shadowOpacity: 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 7,
    },
    heroKicker: { color: colors.auth.subtitle, fontSize: 10.5, letterSpacing: 1.4, fontWeight: '800' },
    heroTitle: { marginTop: 6, color: colors.text.inverse, fontSize: 24, fontWeight: '900' },
    heroSub: { marginTop: 4, color: colors.auth.subtitle, fontSize: 12.5, lineHeight: 18, fontWeight: '600' },
    glanceRow: { marginTop: 10, flexDirection: 'row', gap: 10 },
    glanceCard: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.student.borderStrong,
      backgroundColor: colors.student.surface,
      padding: 10,
    },
    glanceLabel: { color: colors.student.textSecondary, fontSize: 11, fontWeight: '800' },
    glanceValue: { marginTop: 3, color: colors.student.textPrimary, fontSize: 12.5, fontWeight: '800', lineHeight: 17 },
    panel: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.student.borderStrong,
      backgroundColor: colors.student.surface,
      padding: 12,
    },
    panelHeader: {
      marginBottom: 9,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    panelTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
    panelTitle: { color: colors.student.textPrimary, fontSize: 14.5, fontWeight: '900' },
    linkBtn: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.student.borderSoft,
      backgroundColor: colors.student.surfaceStrong,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    linkBtnText: { color: colors.brand.primary, fontSize: 11.5, fontWeight: '800' },
    rowCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.student.borderSoft,
      backgroundColor: colors.student.surfaceStrong,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 7,
    },
    rowTitle: { color: colors.student.textPrimary, fontSize: 14, fontWeight: '800' },
    rowMeta: { marginTop: 3, color: colors.student.textSecondary, fontSize: 12, fontWeight: '600' },
    emptyText: { color: colors.student.textSecondary, fontSize: 12, fontWeight: '600' },
    actionBtnRow: { marginTop: 2, flexDirection: 'row', gap: 10 },
    primaryActionBtn: {
      flex: 1,
      borderRadius: 12,
      backgroundColor: colors.brand.primary,
      paddingVertical: 11,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    primaryActionText: { color: colors.text.inverse, fontSize: 12.5, fontWeight: '800' },
    secondaryActionBtn: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.student.borderStrong,
      backgroundColor: colors.student.surface,
      paddingVertical: 11,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    secondaryActionText: { color: colors.student.textPrimary, fontSize: 12.5, fontWeight: '800' },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(10, 19, 36, 0.46)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
      zIndex: 30,
    },
    modalBackdropTap: { ...StyleSheet.absoluteFillObject },
    modalCard: {
      width: '100%',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.student.borderStrong,
      backgroundColor: colors.student.surfaceRaised,
      padding: 14,
      shadowColor: '#101b30',
      shadowOpacity: 0.2,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    modalTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    modalTitle: { color: colors.student.textPrimary, fontSize: 16, fontWeight: '900' },
    modalCloseBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.student.borderSoft,
      backgroundColor: colors.student.surfaceStrong,
    },
    modalHint: {
      color: colors.student.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 10,
    },
    credentialCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.student.borderSoft,
      backgroundColor: colors.student.surface,
      paddingHorizontal: 10,
      paddingVertical: 9,
      marginBottom: 8,
    },
    credentialLabel: { color: colors.student.textSecondary, fontSize: 11, fontWeight: '800' },
    credentialValue: { marginTop: 2, color: colors.student.textPrimary, fontSize: 14, fontWeight: '800' },
    modalWarning: {
      marginTop: 2,
      color: colors.student.textSecondary,
      fontSize: 11.5,
      fontWeight: '700',
    },
    modalActionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    modalGhostBtn: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.student.borderStrong,
      backgroundColor: colors.student.surface,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalGhostText: { color: colors.student.textPrimary, fontSize: 12.5, fontWeight: '800' },
    modalPrimaryBtn: {
      flex: 1,
      borderRadius: 12,
      backgroundColor: colors.brand.primary,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    modalPrimaryText: { color: colors.text.inverse, fontSize: 12.5, fontWeight: '800' },
  });
