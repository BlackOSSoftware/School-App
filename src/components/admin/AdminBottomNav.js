import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../common/AppIcon.js';
import { useAppTheme } from '../../theme/ThemeContext';

const TABS = [
  { key: 'dashboard', label: 'Home', a11yLabel: 'Dashboard', icon: 'grid-outline' },
  { key: 'attendance', label: 'Attendance', a11yLabel: 'Attendance', icon: 'checkmark-done-outline' },
  { key: 'videos', label: 'Videos', a11yLabel: 'Videos', icon: 'play-circle-outline' },
  { key: 'announcement', label: 'Notice', a11yLabel: 'Announcement', icon: 'megaphone-outline' },
  { key: 'profile', label: 'Profile', a11yLabel: 'Profile', icon: 'person-circle-outline' },
];

function AdminBottomNav({ activeTab, onTabChange }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.navbar, { marginBottom: Math.max(4, insets.bottom * 0.2) + 5 }]}>
      {TABS.map(tab => {
        const isActive = activeTab === tab.key;
        return (
          <NavItem
            key={tab.key}
            tab={tab}
            isActive={isActive}
            styles={styles}
            onPress={() => onTabChange(tab.key)}
          />
        );
      })}
    </View>
  );
}

export default AdminBottomNav;

function NavItem({ tab, isActive, styles, onPress }) {
  const focusAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const pressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(focusAnim, {
      toValue: isActive ? 1 : 0,
      friction: 8,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [focusAnim, isActive]);

  const onPressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 8,
      tension: 140,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 0,
      friction: 8,
      tension: 140,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={tab.a11yLabel}
      accessibilityState={{ selected: isActive }}
    >
      <Animated.View
        style={[
          styles.navItem,
          isActive ? styles.navItemActive : null,
          {
            transform: [
              {
                scale: pressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.95],
                }),
              },
              {
                translateY: focusAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -2],
                }),
              },
            ],
          },
        ]}
      >
        <Animated.View
          style={{
            transform: [
              {
                scale: focusAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.08],
                }),
              },
            ],
          }}
        >
          <AppIcon name={tab.icon} size={21} style={[styles.navIcon, isActive ? styles.navIconActive : null]} />
        </Animated.View>
        <Text numberOfLines={1} style={[styles.navLabel, isActive ? styles.navLabelActive : null]}>{tab.label}</Text>
        <Animated.View style={[styles.activeDot, { opacity: focusAnim, transform: [{ scaleX: focusAnim }] }]} />
      </Animated.View>
    </Pressable>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    navbar: {
      width: '95%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 7,
      paddingTop: 8,
      paddingBottom: 8,
      alignSelf: 'center',
      borderRadius: 28,
      shadowColor: '#102338',
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.navDock,
    },
    navItem: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 9,
      paddingHorizontal: 4,
      borderRadius: 16,
    },
    navItemActive: {
      backgroundColor: colors.brand.primary,
      shadowColor: colors.brand.primary,
      shadowOpacity: 0.28,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    navIcon: {
      color: colors.admin.textSecondary,
      fontSize: 20,
    },
    navIconActive: {
      color: colors.text.inverse,
    },
    navLabel: {
      marginTop: 4,
      color: colors.admin.textPrimary,
      fontSize: 11.5,
      lineHeight: 15,
      fontWeight: '800',
      textAlign: 'center',
      flexShrink: 1,
    },
    navLabelActive: {
      color: colors.text.inverse,
      fontWeight: '800',
    },
    activeDot: {
      marginTop: 4,
      width: 12,
      height: 3,
      borderRadius: 999,
      backgroundColor: colors.text.inverse,
    },
  });
