import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Modal, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import AdminBottomNav from '../../components/admin/AdminBottomNav';
import AdminClassScreen from '../../components/admin/AdminClassScreen';
import AdminDashboardHome from '../../components/admin/AdminDashboardHome';
import AdminAnnouncementScreen from '../../components/admin/AdminAnnouncementScreen';
import AdminAttendanceScreen from '../../components/admin/AdminAttendanceScreen';
import AdminProfileScreen from '../../components/admin/AdminProfileScreen';
import AdminSessionScreen from '../../components/admin/AdminSessionScreen';
import AdminSessionUpgradeScreen from '../../components/admin/AdminSessionUpgradeScreen';
import AdminStudentScreen from '../../components/admin/AdminStudentScreen';
import AdminTeacherScreen from '../../components/admin/AdminTeacherScreen';
import AdminTopBar from '../../components/admin/AdminTopBar';
import { useAppTheme } from '../../theme/ThemeContext';

export default function AdminDashboard({ session, onLogout }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentScreen, setCurrentScreen] = useState('root');
  const [note, setNote] = useState('');
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const pageOpacity = useRef(new Animated.Value(0)).current;
  const pageTranslate = useRef(new Animated.Value(18)).current;
  const blobA = useRef(new Animated.Value(0)).current;
  const blobB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pageOpacity.setValue(0);
    pageTranslate.setValue(18);
    Animated.parallel([
      Animated.timing(pageOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(pageTranslate, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeTab, currentScreen, pageOpacity, pageTranslate]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (exitConfirmOpen) {
        setExitConfirmOpen(false);
        return true;
      }
      if (currentScreen !== 'root') {
        setCurrentScreen('root');
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
  }, [activeTab, currentScreen, exitConfirmOpen]);

  useEffect(() => {
    const loopA = Animated.loop(
      Animated.sequence([
        Animated.timing(blobA, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(blobA, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const loopB = Animated.loop(
      Animated.sequence([
        Animated.timing(blobB, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(blobB, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    loopA.start();
    loopB.start();

    return () => {
      loopA.stop();
      loopB.stop();
    };
  }, [blobA, blobB]);

  const onTabChange = tab => {
    setActiveTab(tab);
    setCurrentScreen('root');
    setNote('');
  };

  const onQuickActionPress = key => {
    if (key === 'session') {
      setCurrentScreen('session');
      return;
    }
    if (key === 'attendance') {
      onTabChange('attendance');
      return;
    }
    if (key === 'session-upgrade') {
      setCurrentScreen('session-upgrade');
      return;
    }
    if (key === 'announcement') {
      onTabChange('announcement');
      return;
    }
    if (key === 'manage-class') {
      setCurrentScreen('manage-class');
      return;
    }
    if (key === 'manage-student') {
      setCurrentScreen('manage-student');
      return;
    }
    if (key === 'manage-teacher') {
      setCurrentScreen('manage-teacher');
      return;
    }
    setNote(`${key} module ready for next integration.`);
  };

  const title =
    currentScreen === 'session'
      ? 'Session Management'
      : currentScreen === 'session-upgrade'
        ? 'Session Upgrade'
      : currentScreen === 'manage-class'
        ? 'Manage Class'
        : currentScreen === 'manage-student'
          ? 'Manage Student'
        : currentScreen === 'manage-teacher'
          ? 'Manage Teacher'
        : 'Admin Dashboard';

  const renderRootScreen = () => {
    if (activeTab === 'dashboard') {
      return <AdminDashboardHome onQuickActionPress={onQuickActionPress} />;
    }
    if (activeTab === 'attendance') {
      return <AdminAttendanceScreen />;
    }
    if (activeTab === 'announcement') {
      return <AdminAnnouncementScreen />;
    }
    return (
      <AdminProfileScreen session={session} onLogout={onLogout} />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          styles.blob,
          styles.blobA,
          {
            transform: [
              { translateX: blobA.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }) },
              { translateY: blobA.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          styles.blobB,
          {
            transform: [
              { translateX: blobB.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
              { translateY: blobB.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }) },
            ],
          },
        ]}
      />
      <View style={styles.gridOverlay} />
      <AdminTopBar
        title={title}
        onBack={currentScreen !== 'root' ? () => setCurrentScreen('root') : undefined}
        onNotificationPress={() => onTabChange('announcement')}
      />

      {currentScreen === 'manage-class' ||
      currentScreen === 'manage-student' ||
      currentScreen === 'manage-teacher' ||
      currentScreen === 'session-upgrade' ||
      (currentScreen === 'root' && (activeTab === 'announcement' || activeTab === 'attendance')) ? (
        <Animated.View
          style={[
            styles.contentArea,
            { opacity: pageOpacity, transform: [{ translateY: pageTranslate }] },
          ]}
        >
          {currentScreen === 'manage-class' ? <AdminClassScreen /> : null}
          {currentScreen === 'manage-student' ? <AdminStudentScreen /> : null}
          {currentScreen === 'manage-teacher' ? <AdminTeacherScreen /> : null}
          {currentScreen === 'session-upgrade' ? <AdminSessionUpgradeScreen /> : null}
          {currentScreen === 'root' && activeTab === 'announcement' ? <AdminAnnouncementScreen /> : null}
          {currentScreen === 'root' && activeTab === 'attendance' ? <AdminAttendanceScreen /> : null}
        </Animated.View>
      ) : (
        <Animated.ScrollView
          style={[
            styles.contentArea,
            { opacity: pageOpacity, transform: [{ translateY: pageTranslate }] },
          ]}
          contentContainerStyle={styles.contentContainer}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
      {note ? <Text style={styles.noteText}>{note}</Text> : null}
          {currentScreen === 'session' ? <AdminSessionScreen /> : null}
          {currentScreen === 'root' ? renderRootScreen() : null}
        </Animated.ScrollView>
      )}

      <AdminBottomNav activeTab={activeTab} onTabChange={onTabChange} />

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
    </SafeAreaView>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.admin.pageBg,
    },
    blob: {
      position: 'absolute',
      borderRadius: 180,
    },
    blobA: {
      width: 240,
      height: 240,
      top: 80,
      right: -96,
      backgroundColor: colors.admin.blobPrimary,
    },
    blobB: {
      width: 250,
      height: 250,
      bottom: 160,
      left: -110,
      backgroundColor: colors.admin.blobAccent,
    },
    gridOverlay: {
      ...StyleSheet.absoluteFillObject,
      borderTopWidth: 1,
      borderTopColor: colors.admin.gridLine,
    },
    contentArea: {
      flex: 1,
    },
    contentContainer: {
      padding: 14,
      paddingBottom: 28,
    },
    noteText: {
      color: colors.admin.accent,
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 8,
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
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      padding: 14,
    },
    exitTitle: { color: colors.admin.textPrimary, fontSize: 16, fontWeight: '900' },
    exitText: { marginTop: 6, color: colors.admin.textSecondary, fontSize: 12.5, fontWeight: '600' },
    exitActions: { marginTop: 12, flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
    exitCancelBtn: {
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.admin.surfaceStrong,
    },
    exitCancelText: { color: colors.admin.textPrimary, fontSize: 12, fontWeight: '700' },
    exitConfirmBtn: {
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.state.error,
    },
    exitConfirmText: { color: colors.text.inverse, fontSize: 12, fontWeight: '800' },
  });
