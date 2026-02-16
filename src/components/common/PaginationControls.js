import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';

export default function PaginationControls({
  page,
  totalPages,
  onPrev,
  onNext,
  disablePrev,
  disableNext,
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.paginationRow}>
      <Pressable
        style={[styles.pageBtn, disablePrev ? styles.disabledBtn : null]}
        onPress={onPrev}
        disabled={disablePrev}
      >
        <Text style={styles.pageBtnText}>Prev</Text>
      </Pressable>

      <Text style={styles.pageText}>
        Page {page} / {Math.max(totalPages, 1)}
      </Text>

      <Pressable
        style={[styles.pageBtn, disableNext ? styles.disabledBtn : null]}
        onPress={onNext}
        disabled={disableNext}
      >
        <Text style={styles.pageBtnText}>Next</Text>
      </Pressable>
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    paginationRow: {
      marginTop: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    pageBtn: {
      borderRadius: 8,
      backgroundColor: colors.brand.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    pageBtnText: {
      color: colors.text.inverse,
      fontSize: 12,
      fontWeight: '700',
    },
    pageText: {
      color: colors.admin.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    disabledBtn: {
      opacity: 0.45,
    },
  });
