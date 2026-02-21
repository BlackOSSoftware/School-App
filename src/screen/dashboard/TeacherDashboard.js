import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import TeacherBottomNav from '../../components/teacher/TeacherBottomNav';
import TeacherClassStudentsScreen from '../../components/teacher/TeacherClassStudentsScreen';
import TeacherAnnouncementScreen from '../../components/teacher/TeacherAnnouncementScreen';
import TeacherAttendanceScreen from '../../components/teacher/TeacherAttendanceScreen';
import TeacherContentScreen from '../../components/teacher/TeacherContentScreen';
import TeacherDashboardHome from '../../components/teacher/TeacherDashboardHome';
import TeacherProfileScreen from '../../components/teacher/TeacherProfileScreen';
import TeacherTopBar from '../../components/teacher/TeacherTopBar';
import { useTeacherClassesOverviewQuery, useTeacherStudentsByClassQuery } from '../../hooks/useTeacherQueries';
import { useAppTheme } from '../../theme/ThemeContext';

const STUDENT_PAGE_LIMIT = 10;

export default function TeacherDashboard({ session, onLogout }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentScreen, setCurrentScreen] = useState('root');
  const [selectedClass, setSelectedClass] = useState(null);
  const [classStudentsPage, setClassStudentsPage] = useState(1);
  const pageOpacity = useRef(new Animated.Value(0)).current;
  const pageTranslate = useRef(new Animated.Value(18)).current;
  const blobA = useRef(new Animated.Value(0)).current;
  const blobB = useRef(new Animated.Value(0)).current;

  const overviewQuery = useTeacherClassesOverviewQuery();
  const classStudentsQuery = useTeacherStudentsByClassQuery({
    classId: selectedClass?.id,
    page: classStudentsPage,
    limit: STUDENT_PAGE_LIMIT,
    enabled: currentScreen === 'class-students' && Boolean(selectedClass?.id),
  });

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

  const teacherName =
    session?.user?.name ||
    overviewQuery?.data?.teacher?.name ||
    'Teacher';

  const onTabChange = tab => {
    setActiveTab(tab);
    setCurrentScreen('root');
    setSelectedClass(null);
    setClassStudentsPage(1);
  };

  const onQuickActionPress = key => {
    if (key === 'mark-attendance') {
      onTabChange('attendance');
      return;
    }
    if (key === 'post-homework') {
      onTabChange('homework');
      return;
    }
    if (key === 'announcement') {
      onTabChange('announcement');
      return;
    }
  };

  const onClassPress = classInfo => {
    if (!classInfo?.id) {
      return;
    }
    setSelectedClass(classInfo);
    setClassStudentsPage(1);
    setCurrentScreen('class-students');
  };

  const title =
    currentScreen === 'class-students'
      ? 'Class Students'
      : activeTab === 'attendance'
        ? 'Attendance'
      : activeTab === 'homework'
          ? 'Content'
          : activeTab === 'announcement'
            ? 'Announcement'
            : activeTab === 'profile'
              ? 'Profile'
              : 'Teacher Dashboard';

  const renderRootScreen = () => {
    if (activeTab === 'dashboard') {
      return (
        <TeacherDashboardHome
          teacherName={teacherName}
          overviewQuery={overviewQuery}
          onQuickActionPress={onQuickActionPress}
          onClassPress={onClassPress}
        />
      );
    }
    if (activeTab === 'attendance') {
      return <TeacherAttendanceScreen />;
    }
    if (activeTab === 'homework') {
      return <TeacherContentScreen />;
    }
    if (activeTab === 'announcement') {
      return <TeacherAnnouncementScreen />;
    }
    return (
      <TeacherProfileScreen session={session} onLogout={onLogout} />
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

      <TeacherTopBar
        title={title}
        onBack={currentScreen !== 'root' ? () => setCurrentScreen('root') : undefined}
        onNotificationPress={() => onTabChange('announcement')}
      />

      <Animated.View
        style={[
          styles.contentArea,
          { opacity: pageOpacity, transform: [{ translateY: pageTranslate }] },
        ]}
      >
        {currentScreen === 'class-students' ? (
          <TeacherClassStudentsScreen
            classInfo={selectedClass}
            query={classStudentsQuery}
            page={classStudentsPage}
            onPageChange={setClassStudentsPage}
            onBackToDashboard={() => setCurrentScreen('root')}
          />
        ) : activeTab === 'announcement' || activeTab === 'attendance' ? (
          renderRootScreen()
        ) : (
          <Animated.ScrollView
            contentContainerStyle={styles.contentContainer}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            {overviewQuery.isError ? (
              <Text style={styles.errorText}>
                Unable to load assigned classes. Please try again.
              </Text>
            ) : null}
            {renderRootScreen()}
          </Animated.ScrollView>
        )}
      </Animated.View>

      <TeacherBottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </SafeAreaView>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.teacher.pageBg,
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
      backgroundColor: colors.teacher.blobPrimary,
    },
    blobB: {
      width: 250,
      height: 250,
      bottom: 160,
      left: -110,
      backgroundColor: colors.teacher.blobAccent,
    },
    gridOverlay: {
      ...StyleSheet.absoluteFillObject,
      borderTopWidth: 1,
      borderTopColor: colors.teacher.gridLine,
    },
    contentArea: {
      flex: 1,
    },
    contentContainer: {
      padding: 14,
      paddingBottom: 28,
    },
    errorText: {
      color: colors.state.error,
      fontSize: 12.5,
      marginBottom: 10,
      fontWeight: '600',
    },
  });
