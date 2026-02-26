import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';

export default function StudentTopBar({ title }) {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) + 6 }]}>
      <View>
        <Text style={styles.kicker}>MMPS STUDENT PANEL</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Pressable style={styles.iconBtn} onPress={toggleTheme}>
        <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={18} color={colors.role.studentAccent} />
      </Pressable>
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    topBar: {
      paddingHorizontal: 16,
      paddingBottom: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.student.headerBg,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      borderBottomWidth: 1,
      borderBottomColor: colors.student.borderSoft,
    },
    kicker: {
      color: colors.auth.subtitle,
      fontSize: 10,
      letterSpacing: 1.3,
      fontWeight: '700',
    },
    title: {
      color: colors.text.inverse,
      fontSize: 22,
      fontWeight: '900',
      letterSpacing: 0.2,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.student.surface,
      borderWidth: 1,
      borderColor: colors.student.borderSoft,
      shadowColor: '#0d2435',
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
  });
