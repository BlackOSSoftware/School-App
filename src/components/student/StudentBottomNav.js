import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useAppTheme } from '../../theme/ThemeContext';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline' },
  { key: 'attendance', label: 'Attendance', icon: 'checkmark-done-outline' },
  { key: 'notes', label: 'Notes', icon: 'document-text-outline' },
  { key: 'homework', label: 'Homework', icon: 'book-outline' },
  { key: 'profile', label: 'Profile', icon: 'person-circle-outline' },
];

export default function StudentBottomNav({ activeTab, onTabChange }) {
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
            <Ionicons name={tab.icon} size={16} style={[styles.navIcon, isActive ? styles.navIconActive : null]} />
            <Text style={[styles.navLabel, isActive ? styles.navLabelActive : null]}>{tab.label}</Text>
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
      shadowColor: '#11283d',
      shadowOpacity: 0.24,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 12,
      backgroundColor: colors.student.navDock,
      borderWidth: 1,
      borderColor: colors.student.borderStrong,
    },
    navItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 16,
    },
    navItemActive: {
      backgroundColor: colors.student.navBg,
      shadowColor: '#1d4f79',
      shadowOpacity: 0.26,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    navIcon: {
      color: colors.student.mutedIcon,
      fontSize: 16,
    },
    navIconActive: {
      color: colors.text.inverse,
    },
    navLabel: {
      marginTop: 3,
      fontSize: 10,
      color: colors.student.textSecondary,
      fontWeight: '800',
    },
    navLabelActive: {
      color: colors.text.inverse,
    },
  });
