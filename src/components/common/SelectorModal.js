import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useAppTheme } from '../../theme/ThemeContext';

function normalizeLabel(value) {
  return String(value ?? '').trim();
}

export default function SelectorModal({
  visible,
  title = 'Select Option',
  searchPlaceholder = 'Search',
  items = [],
  selectedValue = '',
  onSelect,
  onClose,
  valueExtractor = item => item?.value ?? '',
  labelExtractor = item => item?.label ?? '',
  includeNone = false,
  noneLabel = 'None',
  maxHeight = 360,
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = normalizeLabel(search).toLowerCase();
    if (!query) {
      return items;
    }
    return items.filter(item =>
      normalizeLabel(labelExtractor(item)).toLowerCase().includes(query),
    );
  }, [items, labelExtractor, search]);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={[styles.card, { maxHeight }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{title}</Text>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={16} color={colors.admin.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={16} color={colors.admin.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.text.muted}
          />
        </View>

        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {includeNone ? (
            <Pressable
              style={[
                styles.item,
                !selectedValue ? styles.itemActive : null,
              ]}
              onPress={() => onSelect?.('')}
            >
              <Text style={[styles.itemText, !selectedValue ? styles.itemTextActive : null]}>
                {noneLabel}
              </Text>
            </Pressable>
          ) : null}

          {filtered.map(item => {
            const value = String(valueExtractor(item) ?? '').trim();
            const label = normalizeLabel(labelExtractor(item));
            if (!value || !label) {
              return null;
            }
            const active = value === selectedValue;
            return (
              <Pressable
                style={[
                  styles.item,
                  active ? styles.itemActive : null,
                ]}
                key={value}
                onPress={() => onSelect?.(value)}
              >
                <Text style={[styles.itemText, active ? styles.itemTextActive : null]}>{label}</Text>
                {active ? (
                  <Ionicons name="checkmark-circle" size={16} color={colors.brand.primary} />
                ) : null}
              </Pressable>
            );
          })}

          {!filtered.length ? <Text style={styles.emptyText}>No matching options.</Text> : null}
        </ScrollView>
      </View>
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
      zIndex: 40,
    },
    card: {
      width: '100%',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      padding: 14,
      shadowColor: '#0d1c33',
      shadowOpacity: 0.24,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    title: {
      color: colors.admin.textPrimary,
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    closeBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      backgroundColor: colors.admin.surfaceStrong,
    },
    searchRow: {
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      borderRadius: 12,
      backgroundColor: colors.admin.surfaceStrong,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      marginBottom: 10,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      color: colors.admin.textPrimary,
      fontSize: 13.5,
      paddingVertical: 10,
    },
    list: {
      maxHeight: 280,
    },
    item: {
      borderWidth: 1,
      borderColor: colors.admin.borderSubtle,
      backgroundColor: colors.admin.surfaceStrong,
      borderRadius: 11,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    itemActive: {
      borderColor: colors.brand.primary,
      backgroundColor: colors.admin.surface,
    },
    itemText: {
      color: colors.admin.textPrimary,
      fontSize: 13,
      fontWeight: '600',
      flex: 1,
    },
    itemTextActive: {
      fontWeight: '800',
    },
    emptyText: {
      color: colors.admin.textSecondary,
      fontSize: 12.5,
      textAlign: 'center',
      paddingVertical: 14,
    },
  });
