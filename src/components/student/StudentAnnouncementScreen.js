import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AnnouncementFeed from '../common/AnnouncementFeed';
import { useMyAnnouncementsQuery } from '../../hooks/useAnnouncementQueries';
import { useAppTheme } from '../../theme/ThemeContext';
import NotificationDetailsModal from '../common/NotificationDetailsModal';

export default function StudentAnnouncementScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [page, setPage] = useState(1);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const reveal = useRef(new Animated.Value(0)).current;

  const announcementsQuery = useMyAnnouncementsQuery({ page, limit: 10 });
  const total = Number(announcementsQuery.data?.total ?? 0);

  useEffect(() => {
    reveal.setValue(0);
    Animated.parallel([
      Animated.timing(reveal, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
        isInteraction: false,
      }),
    ]).start();
  }, [page, reveal]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: reveal,
          transform: [
            {
              translateY: reveal.interpolate({
                inputRange: [0, 1],
                outputRange: [14, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.heroCard}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroOverline}>STUDENT UPDATES</Text>
          <Text style={styles.heroTitle}>All Announcements</Text>
          <Text style={styles.heroSub}>
            Stay updated with school-wide and class notices in one smooth feed.
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{total}</Text>
          <Text style={styles.metricLabel}>Notices</Text>
        </View>
      </View>

      <View style={styles.feedWrap}>
        <View style={styles.feedHeader}>
          <Text style={styles.feedTitle}>Latest Updates</Text>
          {announcementsQuery.isFetching ? (
            <ActivityIndicator size="small" color={colors.brand.primary} />
          ) : null}
        </View>
        <AnnouncementFeed
          query={announcementsQuery}
          page={page}
          onPageChange={setPage}
          variant="student"
          onPressItem={setSelectedAnnouncement}
        />
      </View>

      <NotificationDetailsModal
        visible={Boolean(selectedAnnouncement)}
        item={selectedAnnouncement}
        onClose={() => setSelectedAnnouncement(null)}
        variant="student"
      />
    </Animated.View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    container: {
      flex: 1,
      marginTop: 10,
    },
    heroCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.student.borderSoft,
      backgroundColor: colors.student.heroBg,
      padding: 15,
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
      shadowColor: '#2a1668',
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 6,
    },
    heroLeft: {
      flex: 1,
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
      fontSize: 23,
      fontWeight: '900',
    },
    heroSub: {
      marginTop: 5,
      color: colors.auth.subtitle,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: '600',
    },
    metricCard: {
      width: 86,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.30)',
      backgroundColor: 'rgba(255,255,255,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
    },
    metricValue: {
      color: colors.text.inverse,
      fontSize: 24,
      fontWeight: '900',
    },
    metricLabel: {
      marginTop: 2,
      color: colors.auth.subtitle,
      fontSize: 11,
      fontWeight: '700',
    },
    feedWrap: {
      flex: 1,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.student.borderStrong,
      backgroundColor: colors.student.surface,
      paddingHorizontal: 12,
      paddingTop: 12,
    },
    feedHeader: {
      marginBottom: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    feedTitle: {
      color: colors.student.textPrimary,
      fontSize: 15,
      fontWeight: '900',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(10, 19, 36, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    modalCard: {
      width: '100%',
      maxHeight: '72%',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.student.borderStrong,
      backgroundColor: colors.student.surfaceRaised,
      padding: 14,
      shadowColor: '#101b30',
      shadowOpacity: 0.22,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    modalTitleWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    modalTitle: {
      flex: 1,
      color: colors.student.textPrimary,
      fontSize: 16,
      fontWeight: '900',
    },
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
    metaPillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    metaPill: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.student.borderSoft,
      backgroundColor: colors.student.surfaceStrong,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    metaPillText: {
      color: colors.student.textSecondary,
      fontSize: 11.5,
      fontWeight: '800',
    },
    modalDesc: {
      color: colors.student.textPrimary,
      fontSize: 13,
      lineHeight: 20,
      fontWeight: '600',
    },
    footerInfo: {
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    footerInfoText: {
      color: colors.student.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      flex: 1,
    },
  });
