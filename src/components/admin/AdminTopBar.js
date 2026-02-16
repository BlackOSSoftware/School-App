import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';

export default function AdminTopBar({ title, onBack }) {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) + 6 }]}>
      <View style={styles.leftWrap}>
        {onBack ? (
          <Pressable style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backIcon}>{'\u2039'}</Text>
          </Pressable>
        ) : null}
        <View>
          <Text style={styles.kicker}>ADMIN PANEL</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>
      <View style={styles.rightWrap}>
        <Pressable style={styles.iconBtn} onPress={toggleTheme}>
          <Text style={styles.iconText}>{isDark ? '\u2600' : '\u263E'}</Text>
        </Pressable>
        <Pressable style={styles.iconBtn}>
          <Text style={styles.iconText}>{'\u{1F514}'}</Text>
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
      borderBottomWidth: 0,
      backgroundColor: colors.admin.headerBg,
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
      borderWidth: 0,
    },
    backIcon: {
      color: colors.admin.accent,
      fontSize: 24,
      fontWeight: '500',
      marginTop: -2,
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
      backgroundColor: colors.admin.surface,
    },
    iconText: {
      color: colors.admin.accent,
      fontSize: 18,
    },
  });
