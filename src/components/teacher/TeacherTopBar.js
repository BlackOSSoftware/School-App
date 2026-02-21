import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';

export default function TeacherTopBar({ title, onBack, onNotificationPress }) {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) + 6 }]}>
      <View style={styles.leftWrap}>
        {onBack ? (
          <Pressable style={styles.backBtn} onPress={onBack}>
            <Ionicons name="chevron-back" size={20} color={colors.teacher.accent} />
          </Pressable>
        ) : null}
        <View>
          <Text style={styles.kicker}>TEACHER PANEL</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>
      <View style={styles.rightWrap}>
        <Pressable style={styles.iconBtn} onPress={toggleTheme}>
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={18}
            color={colors.teacher.accent}
          />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={onNotificationPress}>
          <Ionicons name="notifications-outline" size={18} color={colors.teacher.accent} />
        </Pressable>
      </View>
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
      backgroundColor: colors.teacher.headerBg,
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
    },
    leftWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    backBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.teacher.surface,
      borderWidth: 1,
      borderColor: colors.teacher.borderSoft,
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
    rightWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.teacher.surface,
      borderWidth: 1,
      borderColor: colors.teacher.borderSoft,
    },
  });
