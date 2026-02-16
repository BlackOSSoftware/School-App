import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: '\u2302' },
  { key: 'attendance', label: 'Attendance', icon: '\u2713' },
  { key: 'announcement', label: 'Announcement', icon: '\u{1F4E3}' },
  { key: 'reports', label: 'Reports', icon: '\u25A4' },
  { key: 'profile', label: 'Profile', icon: '\u25C9' },
];

export default function AdminBottomNav({ activeTab, onTabChange }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.navbar}>
      {TABS.map(tab => {
        const isActive = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            style={[styles.navItem, isActive ? styles.navItemActive : null]}
            onPress={() => onTabChange(tab.key)}
          >
            <Text style={[styles.navIcon, isActive ? styles.navIconActive : null]}>
              {tab.icon}
            </Text>
            <Text style={[styles.navLabel, isActive ? styles.navLabelActive : null]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    navbar: {
      width: '96%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 14,
      alignSelf: 'center',
      marginBottom: 8,
      borderRadius: 20,
      shadowColor: '#1e1b3a',
      shadowOpacity: 0.16,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 2 },
      elevation: 7,
      borderTopWidth: 0,
      backgroundColor: colors.admin.navDock,
    },
    navItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 9,
      borderRadius: 14,
    },
    navItemActive: {
      backgroundColor: colors.admin.navBg,
    },
    navIcon: {
      color: colors.admin.mutedIcon,
      fontSize: 16,
    },
    navIconActive: {
      color: colors.text.inverse,
    },
    navLabel: {
      marginTop: 3,
      fontSize: 10.5,
      color: colors.admin.textSecondary,
      fontWeight: '700',
    },
    navLabelActive: {
      color: colors.text.inverse,
    },
  });
