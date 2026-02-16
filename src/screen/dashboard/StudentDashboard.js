import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';

export default function StudentDashboard({ session }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView style={styles.studentBg} contentContainerStyle={styles.container} showsVerticalScrollIndicator>
      <Text style={styles.badge}>STUDENT ZONE</Text>
      <Text style={styles.title}>Welcome, Student</Text>
      <Text style={styles.subtitle}>Attendance, homework and notices</Text>
      <Text style={styles.meta}>Role: {session?.role ?? 'student'}</Text>
    </ScrollView>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 24,
    },
    studentBg: {
      backgroundColor: colors.role.studentBg,
    },
    badge: {
      color: colors.role.studentAccent,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 2,
    },
    title: {
      marginTop: 10,
      color: colors.text.primary,
      fontSize: 30,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    subtitle: {
      marginTop: 8,
      color: colors.text.secondary,
      fontSize: 16,
    },
    meta: {
      marginTop: 18,
      color: colors.role.studentAccent,
      fontSize: 13,
    },
  });
