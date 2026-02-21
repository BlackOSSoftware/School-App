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
        <Text style={styles.kicker}>STUDENT PANEL</Text>
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
      paddingBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.student.headerBg,
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
    },
    kicker: {
      color: colors.auth.subtitle,
      fontSize: 10,
      letterSpacing: 1.3,
      fontWeight: '700',
    },
    title: {
      color: colors.text.inverse,
      fontSize: 20,
      fontWeight: '800',
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.student.surface,
      borderWidth: 1,
      borderColor: colors.student.borderSoft,
    },
  });
