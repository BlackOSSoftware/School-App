import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AppIcon from './AppIcon';
import { useAppTheme } from '../../theme/ThemeContext';

const dropdownListeners = new Set();
let activeDropdownId = null;

function registerDropdownListener(listener) {
  dropdownListeners.add(listener);
  return () => dropdownListeners.delete(listener);
}

function setActiveDropdown(id) {
  activeDropdownId = id;
  dropdownListeners.forEach(listener => listener(activeDropdownId));
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

export default function CustomDropdownSelector({
  label,
  value = '',
  options = [],
  onSelect,
  placeholder = 'Select option',
  disabled = false,
  tone = 'teacher',
  searchPlaceholder = 'Search',
  includeNone = false,
  noneLabel = 'None',
  multiSelect = false,
  selectedValues = [],
  onChangeSelectedValues,
  showSelectAll = false,
  selectAllLabel = 'Select All',
  clearAllLabel = 'Clear All',
  valueExtractor = item => item?.value ?? '',
  labelExtractor = item => item?.label ?? '',
  containerStyle,
  triggerStyle,
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, tone), [colors, tone]);
  const [open, setOpen] = useState(false);
  const [shouldRenderDropdown, setShouldRenderDropdown] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownIdRef = useRef(`dropdown-${Math.random().toString(36).slice(2, 10)}`);
  const animated = useRef(new Animated.Value(0)).current;

  const normalizedSelectedValues = useMemo(
    () => (Array.isArray(selectedValues) ? selectedValues.map(item => normalizeText(item)).filter(Boolean) : []),
    [selectedValues],
  );

  useEffect(() => {
    const unsubscribe = registerDropdownListener(activeId => {
      if (activeId !== dropdownIdRef.current && open) {
        setOpen(false);
      }
    });
    return unsubscribe;
  }, [open]);

  useEffect(() => {
    if (open) {
      setShouldRenderDropdown(true);
    }
    Animated.timing(animated, {
      toValue: open ? 1 : 0,
      duration: 190,
      // We animate maxHeight + translateY, so native driver cannot be used here.
      useNativeDriver: false,
    }).start(() => {
      if (!open) {
        setSearch('');
        setShouldRenderDropdown(false);
      }
    });
  }, [animated, open]);

  const filtered = useMemo(() => {
    const query = normalizeText(search).toLowerCase();
    if (!query) {
      return options;
    }
    return options.filter(item => normalizeText(labelExtractor(item)).toLowerCase().includes(query));
  }, [labelExtractor, options, search]);

  const isActive = multiSelect ? normalizedSelectedValues.length > 0 : Boolean(value);

  const closeDropdown = () => {
    setOpen(false);
    if (activeDropdownId === dropdownIdRef.current) {
      setActiveDropdown(null);
    }
  };

  useEffect(() => () => {
    if (activeDropdownId === dropdownIdRef.current) {
      setActiveDropdown(null);
    }
  }, []);

  const handleSingleSelect = nextValue => {
    onSelect?.(nextValue);
    closeDropdown();
  };

  const handleMultiToggle = nextValue => {
    const active = normalizedSelectedValues.includes(nextValue);
    const nextValues = active
      ? normalizedSelectedValues.filter(item => item !== nextValue)
      : [...normalizedSelectedValues, nextValue];
    onChangeSelectedValues?.(nextValues);
  };

  const dropdownAnimatedStyle = {
    opacity: animated,
    transform: [
      {
        translateY: animated.interpolate({
          inputRange: [0, 1],
          outputRange: [-6, 0],
        }),
      },
    ],
    maxHeight: animated.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 280],
    }),
  };

  return (
    <View style={[styles.container, open ? styles.containerOpen : null, containerStyle]}>
      <Pressable
        style={[styles.trigger, triggerStyle, isActive ? styles.triggerActive : null, disabled ? styles.triggerDisabled : null]}
        onPress={() => {
          if (!disabled) {
            setOpen(prev => {
              const next = !prev;
              setActiveDropdown(next ? dropdownIdRef.current : null);
              return next;
            });
          }
        }}
      >
        <View style={styles.triggerBody}>
          {label ? <Text style={styles.label}>{label}</Text> : null}
          <Text style={[styles.value, !isActive ? styles.placeholder : null]}>{value || placeholder}</Text>
        </View>
        <AppIcon name={open ? 'chevron-up' : 'chevron-down'} size={16} color={styles.value.color} />
      </Pressable>

      {shouldRenderDropdown ? (
        <Animated.View style={[styles.dropdown, dropdownAnimatedStyle, !open ? styles.dropdownClosed : null]}>
          <View style={styles.searchRow}>
            <AppIcon name="search-outline" size={15} color={styles.label.color} />
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
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {multiSelect && showSelectAll ? (
              <Pressable
                style={styles.option}
                onPress={() => {
                  const values = filtered.map(item => normalizeText(valueExtractor(item))).filter(Boolean);
                  const allSelected = values.length > 0 && values.every(item => normalizedSelectedValues.includes(item));
                  onChangeSelectedValues?.(allSelected ? [] : values);
                }}
              >
                <Text style={styles.optionText}>
                  {filtered.length > 0 &&
                  filtered.every(item => normalizedSelectedValues.includes(normalizeText(valueExtractor(item))))
                    ? clearAllLabel
                    : selectAllLabel}
                </Text>
              </Pressable>
            ) : null}

            {!multiSelect && includeNone ? (
              <Pressable style={styles.option} onPress={() => handleSingleSelect('')}>
                <Text style={styles.optionText}>{noneLabel}</Text>
              </Pressable>
            ) : null}

            {filtered.map(item => {
              const optionValue = normalizeText(valueExtractor(item));
              const optionLabel = normalizeText(labelExtractor(item));
              if (!optionValue || !optionLabel) return null;
              const active = multiSelect ? normalizedSelectedValues.includes(optionValue) : optionValue === value;
              return (
                <Pressable
                  key={optionValue}
                  style={[styles.option, active ? styles.optionActive : null]}
                  onPress={() => {
                    if (multiSelect) {
                      handleMultiToggle(optionValue);
                      return;
                    }
                    handleSingleSelect(optionValue);
                  }}
                >
                  <Text style={[styles.optionText, active ? styles.optionTextActive : null]}>{optionLabel}</Text>
                </Pressable>
              );
            })}
            {!filtered.length ? <Text style={styles.emptyText}>No matching options.</Text> : null}
          </ScrollView>
        </Animated.View>
      ) : null}
    </View>
  );
}

const createStyles = (colors, tone) => {
  const palette = tone === 'admin' ? colors.admin : tone === 'student' ? colors.student : colors.teacher;
  return StyleSheet.create({
    container: {
      marginBottom: 12,
      position: 'relative',
      zIndex: 25,
    },
    containerOpen: {
      zIndex: 9999,
      elevation: 50,
    },
    trigger: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.borderStrong,
      backgroundColor: '#ffffff',
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    triggerActive: {
      borderColor: colors.brand.primary,
      backgroundColor: palette.successBg,
    },
    triggerDisabled: {
      opacity: 0.6,
    },
    triggerBody: { flex: 1 },
    label: {
      color: palette.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    value: {
      marginTop: 3,
      color: palette.textPrimary,
      fontSize: 13.5,
      fontWeight: '700',
    },
    placeholder: {
      color: palette.textSecondary,
    },
    dropdown: {
      marginTop: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.borderStrong,
      backgroundColor: '#ffffff',
      shadowColor: '#0b1f3f',
      shadowOpacity: 0.14,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
      maxHeight: 320,
      overflow: 'hidden',
      zIndex: 40,
    },
    dropdownClosed: {
      pointerEvents: 'none',
    },
    searchRow: {
      borderBottomWidth: 1,
      borderBottomColor: palette.borderSubtle,
      paddingHorizontal: 10,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    searchInput: {
      flex: 1,
      color: palette.textPrimary,
      fontSize: 13,
      paddingVertical: 2,
    },
    list: {
      maxHeight: 270,
      flexGrow: 0,
    },
    listContent: {
      paddingBottom: 2,
    },
    option: {
      paddingHorizontal: 12,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderSubtle,
      backgroundColor: '#ffffff',
    },
    optionActive: {
      backgroundColor: palette.successBg,
    },
    optionText: {
      color: palette.textPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
    optionTextActive: {
      color: colors.brand.primary,
      fontWeight: '800',
    },
    emptyText: {
      color: palette.textSecondary,
      fontSize: 12,
      paddingVertical: 12,
      textAlign: 'center',
    },
  });
};
