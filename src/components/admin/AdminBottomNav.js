import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useAppTheme } from '../../theme/ThemeContext';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline' },
  { key: 'attendance', label: 'Attendance', icon: 'checkmark-done-outline' },
  { key: 'announcement', label: 'Announcement', icon: 'megaphone-outline' },
  { key: 'profile', label: 'Profile', icon: 'person-circle-outline' },
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
            <Ionicons
              name={tab.icon}
              size={16}
              style={[styles.navIcon, isActive ? styles.navIconActive : null]}
            />
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
      width: '95.5%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingTop: 8,
      paddingBottom: 12,
      alignSelf: 'center',
      marginBottom: 8,
      borderRadius: 24,
      shadowColor: '#102338',
      shadowOpacity: 0.24,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 12,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.navDock,
    },
    navItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 16,
    },
    navItemActive: {
      backgroundColor: colors.admin.navBg,
      shadowColor: '#12385e',
      shadowOpacity: 0.26,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
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
      fontSize: 10,
      color: colors.admin.textSecondary,
      fontWeight: '800',
    },
    navLabelActive: {
      color: colors.text.inverse,
    },
  });
