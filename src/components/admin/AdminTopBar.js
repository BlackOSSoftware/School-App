import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';

export default function AdminTopBar({ title, onBack, onNotificationPress }) {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) + 6 }]}>
      <View style={styles.leftWrap}>
        {onBack ? (
          <Pressable style={styles.backBtn} onPress={onBack}>
            <Ionicons name="chevron-back" size={20} color={colors.admin.accent} />
          </Pressable>
        ) : null}
        <View>
          <Text style={styles.kicker}>MMPS ADMIN PANEL</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>
      <View style={styles.rightWrap}>
        <Pressable style={styles.iconBtn} onPress={toggleTheme}>
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={18}
            color={colors.admin.accent}
          />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={onNotificationPress}>
          <Ionicons name="notifications-outline" size={18} color={colors.admin.accent} />
        </Pressable>
      </View>
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
      backgroundColor: colors.admin.headerBg,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      borderBottomWidth: 1,
      borderBottomColor: colors.admin.borderSoft,
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
      backgroundColor: colors.admin.surface,
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
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
    rightWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.admin.surface,
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      shadowColor: '#0a1d33',
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
  });
