import React, { useMemo, useState } from 'react';
import { BackHandler, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import StudentAttendanceScreen from '../../components/student/StudentAttendanceScreen';
import StudentBottomNav from '../../components/student/StudentBottomNav';
import StudentHomeScreen from '../../components/student/StudentHomeScreen';
import StudentHomeworkScreen from '../../components/student/StudentHomeworkScreen';
import StudentNotesScreen from '../../components/student/StudentNotesScreen';
import StudentProfileScreen from '../../components/student/StudentProfileScreen';
import StudentTopBar from '../../components/student/StudentTopBar';
import { useAppTheme } from '../../theme/ThemeContext';

export default function StudentDashboard({ session, onLogout }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [prefillHomework, setPrefillHomework] = useState(null);
  const [prefillNotes, setPrefillNotes] = useState(null);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);

  React.useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (exitConfirmOpen) {
        setExitConfirmOpen(false);
        return true;
      }
      if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
        return true;
      }
      setExitConfirmOpen(true);
      return true;
    });
    return () => subscription.remove();
  }, [activeTab, exitConfirmOpen]);

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
          <StudentNotesScreen prefillSelectedItem={prefillNotes} />
        </View>
      );
    }
    if (activeTab === 'homework') {
      return (
        <View style={styles.blockWrap}>
          <StudentHomeworkScreen prefillSelectedItem={prefillHomework} />
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
        <StudentHomeScreen
          session={session}
          onOpenTab={setActiveTab}
          onOpenHomework={item => {
            setPrefillHomework(item);
            setActiveTab('homework');
          }}
          onOpenNotes={item => {
            setPrefillNotes(item);
            setActiveTab('notes');
          }}
        />
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

      <Modal
        visible={exitConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setExitConfirmOpen(false)}
      >
        <View style={styles.exitOverlay}>
          <View style={styles.exitCard}>
            <Text style={styles.exitTitle}>Exit App?</Text>
            <Text style={styles.exitText}>Are you sure you want to close the app?</Text>
            <View style={styles.exitActions}>
              <Pressable style={styles.exitCancelBtn} onPress={() => setExitConfirmOpen(false)}>
                <Text style={styles.exitCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.exitConfirmBtn} onPress={() => BackHandler.exitApp()}>
                <Text style={styles.exitConfirmText}>Exit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    blockWrap: {
      flex: 1,
      paddingHorizontal: 14,
      paddingTop: 10,
    },
    exitOverlay: {
      flex: 1,
      backgroundColor: 'rgba(12, 24, 42, 0.42)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 18,
    },
    exitCard: {
      width: '100%',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.student.borderStrong,
      backgroundColor: colors.student.surface,
      padding: 14,
    },
    exitTitle: { color: colors.student.textPrimary, fontSize: 16, fontWeight: '900' },
    exitText: { marginTop: 6, color: colors.student.textSecondary, fontSize: 12.5, fontWeight: '600' },
    exitActions: { marginTop: 12, flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
    exitCancelBtn: {
      borderWidth: 1,
      borderColor: colors.student.borderSoft,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.student.surfaceStrong,
    },
    exitCancelText: { color: colors.student.textPrimary, fontSize: 12, fontWeight: '700' },
    exitConfirmBtn: {
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.state.error,
    },
    exitConfirmText: { color: colors.text.inverse, fontSize: 12, fontWeight: '800' },
  });
