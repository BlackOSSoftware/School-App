import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';

export default function StudentHomeScreen({ session }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroKicker}>WELCOME</Text>
        <Text style={styles.heroTitle}>{session?.user?.name || 'Student'}</Text>
        <Text style={styles.heroSub}>Track attendance, homework and class updates from one place.</Text>
      </View>
      <View style={styles.glanceRow}>
        <View style={styles.glanceCard}>
          <Text style={styles.glanceLabel}>Focus</Text>
          <Text style={styles.glanceValue}>Daily</Text>
        </View>
        <View style={styles.glanceCard}>
          <Text style={styles.glanceLabel}>Progress</Text>
          <Text style={styles.glanceValue}>On Track</Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    container: { paddingHorizontal: 14, paddingTop: 10 },
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
    heroTitle: { marginTop: 6, color: colors.text.inverse, fontSize: 23, fontWeight: '900' },
    heroSub: { marginTop: 4, color: colors.auth.subtitle, fontSize: 12, lineHeight: 17 },
    glanceRow: { marginTop: 10, flexDirection: 'row', gap: 10 },
    glanceCard: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.student.borderStrong,
      backgroundColor: colors.student.surface,
      padding: 10,
    },
    glanceLabel: { color: colors.student.textSecondary, fontSize: 11.5, fontWeight: '700' },
    glanceValue: { marginTop: 3, color: colors.student.textPrimary, fontSize: 13.5, fontWeight: '900' },
  });
