import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useAppTheme } from '../../theme/ThemeContext';

export default function PaginationControls({
  page,
  totalPages,
  onFirst,
  onPrev,
  onNext,
  onLast,
  disableFirst,
  disablePrev,
  disableNext,
  disableLast,
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const safeTotal = Math.max(totalPages, 1);
  const isFirstDisabled = disableFirst ?? !onFirst;
  const isLastDisabled = disableLast ?? !onLast;
  const isPrevDisabled = disablePrev ?? !onPrev;
  const isNextDisabled = disableNext ?? !onNext;

  return (
    <View style={styles.paginationRow}>
      <Pressable
        style={[styles.iconBtn, isFirstDisabled ? styles.disabledBtn : null]}
        onPress={onFirst}
        disabled={isFirstDisabled}
      >
        <Ionicons name="play-skip-back-outline" size={14} color={colors.text.inverse} />
      </Pressable>
      <Pressable
        style={[styles.pageBtn, isPrevDisabled ? styles.disabledBtn : null]}
        onPress={onPrev}
        disabled={isPrevDisabled}
      >
        <Ionicons name="chevron-back" size={14} color={colors.text.inverse} />
        <Text style={styles.pageBtnText}>Prev</Text>
      </Pressable>

      <Text style={styles.pageText}>
        Page {page} / {safeTotal}
      </Text>

      <Pressable
        style={[styles.pageBtn, isNextDisabled ? styles.disabledBtn : null]}
        onPress={onNext}
        disabled={isNextDisabled}
      >
        <Text style={styles.pageBtnText}>Next</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.text.inverse} />
      </Pressable>
      <Pressable
        style={[styles.iconBtn, isLastDisabled ? styles.disabledBtn : null]}
        onPress={onLast}
        disabled={isLastDisabled}
      >
        <Ionicons name="play-skip-forward-outline" size={14} color={colors.text.inverse} />
      </Pressable>
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    paginationRow: {
      marginTop: 14,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    pageBtn: {
      borderRadius: 12,
      backgroundColor: colors.brand.primary,
      paddingHorizontal: 12,
      paddingVertical: 9,
      minWidth: 76,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: colors.brand.secondary,
    },
    iconBtn: {
      borderRadius: 12,
      backgroundColor: colors.brand.primary,
      width: 38,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.brand.secondary,
    },
    pageBtnText: {
      color: colors.text.inverse,
      fontSize: 12.5,
      fontWeight: '800',
    },
    pageText: {
      color: colors.admin.textSecondary,
      fontSize: 12.5,
      fontWeight: '700',
    },
    disabledBtn: {
      opacity: 0.45,
    },
  });
