import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppIcon from './AppIcon';
import { useAppTheme } from '../../theme/ThemeContext';

export default function SelectorField({
  label,
  value,
  placeholder,
  onPress,
  icon = 'chevron-down',
  tone = 'teacher',
  active = false,
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, tone), [colors, tone]);
  const palette = tone === 'admin' ? colors.admin : tone === 'student' ? colors.student : colors.teacher;
  return (
    <Pressable style={[styles.row, active ? styles.rowActive : null]} onPress={onPress}>
      <View style={styles.body}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, !value ? styles.placeholder : null]}>{value || placeholder}</Text>
      </View>
      <AppIcon name={icon} size={16} color={palette.textPrimary} />
    </Pressable>
  );
}

const createStyles = (colors, tone) => {
  const palette = tone === 'admin' ? colors.admin : tone === 'student' ? colors.student : colors.teacher;
  return StyleSheet.create({
    row: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.borderStrong,
      backgroundColor: '#ffffff',
      paddingHorizontal: 16,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    rowActive: {
      borderColor: colors.brand.primary,
      backgroundColor: palette.successBg,
    },
    body: { flex: 1 },
    label: {
      color: palette.textSecondary,
      fontSize: 10.5,
      fontWeight: '700',
    },
    value: {
      marginTop: 4,
      color: palette.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    placeholder: {
      color: palette.textSecondary,
    },
  });
};
