import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AnnouncementFeed from '../../components/common/AnnouncementFeed';
import StudentAttendanceScreen from '../../components/student/StudentAttendanceScreen';
import StudentBottomNav from '../../components/student/StudentBottomNav';
import StudentHomeScreen from '../../components/student/StudentHomeScreen';
import StudentHomeworkScreen from '../../components/student/StudentHomeworkScreen';
import StudentNotesScreen from '../../components/student/StudentNotesScreen';
import StudentProfileScreen from '../../components/student/StudentProfileScreen';
import StudentTopBar from '../../components/student/StudentTopBar';
import { useMyAnnouncementsQuery } from '../../hooks/useAnnouncementQueries';
import { useAppTheme } from '../../theme/ThemeContext';

export default function StudentDashboard({ session, onLogout }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [announcementPage, setAnnouncementPage] = useState(1);

  const announcementsQuery = useMyAnnouncementsQuery({
    page: announcementPage,
    limit: 10,
    enabled: activeTab === 'dashboard',
  });

  const title =
    activeTab === 'attendance'
      ? 'Attendance'
      : activeTab === 'notes'
        ? 'Notes'
        : activeTab === 'homework'
          ? 'Homework'
          : activeTab === 'profile'
            ? 'Profile'
            : 'Student Dashboard';

  const renderContent = () => {
    if (activeTab === 'attendance') {
      return <StudentAttendanceScreen />;
    }
    if (activeTab === 'notes') {
      return (
        <View style={styles.blockWrap}>
          <StudentNotesScreen />
        </View>
      );
    }
    if (activeTab === 'homework') {
      return (
        <View style={styles.blockWrap}>
          <StudentHomeworkScreen />
        </View>
      );
    }
    if (activeTab === 'profile') {
      return (
        <View style={styles.blockWrap}>
          <StudentProfileScreen session={session} onLogout={onLogout} />
        </View>
      );
    }

    return (
      <View style={styles.dashboardWrap}>
        <StudentHomeScreen session={session} />
        <Text style={styles.sectionTitle}>Announcements</Text>
        <View style={styles.announcementArea}>
          <AnnouncementFeed
            query={announcementsQuery}
            page={announcementPage}
            onPageChange={setAnnouncementPage}
            variant="student"
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.blob, styles.blobA]} />
      <View style={[styles.blob, styles.blobB]} />
      <View style={styles.gridOverlay} />
      <StudentTopBar title={title} />
      <View style={styles.contentArea}>{renderContent()}</View>
      <StudentBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.role.studentBg,
    },
    blob: {
      position: 'absolute',
      borderRadius: 180,
    },
    blobA: {
      width: 240,
      height: 240,
      top: 80,
      right: -100,
      backgroundColor: colors.student.blobPrimary,
    },
    blobB: {
      width: 240,
      height: 240,
      bottom: 120,
      left: -108,
      backgroundColor: colors.student.blobAccent,
    },
    gridOverlay: {
      ...StyleSheet.absoluteFillObject,
      borderTopWidth: 1,
      borderTopColor: colors.student.gridLine,
    },
    contentArea: {
      flex: 1,
    },
    dashboardWrap: { flex: 1 },
    announcementArea: { flex: 1, paddingHorizontal: 14 },
    sectionTitle: {
      marginTop: 12,
      marginBottom: 8,
      marginHorizontal: 14,
      color: colors.student.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    blockWrap: {
      flex: 1,
      paddingHorizontal: 14,
      paddingTop: 10,
    },
  });
