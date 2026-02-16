import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';

export default function TeacherDashboard({ session }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView style={styles.teacherBg} contentContainerStyle={styles.container} showsVerticalScrollIndicator>
      <Text style={styles.badge}>TEACHER SPACE</Text>
      <Text style={styles.title}>Welcome, Teacher</Text>
      <Text style={styles.subtitle}>Class controls and reports area</Text>
      <Text style={styles.meta}>Role: {session?.role ?? 'teacher'}</Text>
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
    teacherBg: {
      backgroundColor: colors.role.teacherBg,
    },
    badge: {
      color: colors.role.teacherAccent,
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
      color: colors.role.teacherAccent,
      fontSize: 13,
    },
  });
