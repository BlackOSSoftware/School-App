import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useAppTheme } from '../../theme/ThemeContext';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline' },
  { key: 'attendance', label: 'Attendance', icon: 'checkmark-done-outline' },
  { key: 'homework', label: 'Content', icon: 'book-outline' },
  { key: 'announcement', label: 'Announcement', icon: 'megaphone-outline' },
  { key: 'profile', label: 'Profile', icon: 'person-circle-outline' },
];

export default function TeacherBottomNav({ activeTab, onTabChange }) {
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
      shadowOpacity: 0.22,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 },
      elevation: 10,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.navDock,
    },
    navItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 9,
      borderRadius: 14,
    },
    navItemActive: {
      backgroundColor: colors.teacher.navBg,
    },
    navIcon: {
      color: colors.teacher.mutedIcon,
      fontSize: 16,
    },
    navIconActive: {
      color: colors.text.inverse,
    },
    navLabel: {
      marginTop: 3,
      fontSize: 10.5,
      color: colors.teacher.textSecondary,
      fontWeight: '700',
    },
    navLabelActive: {
      color: colors.text.inverse,
    },
  });
