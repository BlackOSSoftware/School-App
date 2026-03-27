import React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function KeyboardAwareModal({
  children,
  overlayStyle,
  contentContainerStyle,
  scrollContentStyle,
  dismissKeyboardOnBackdrop = false,
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.overlay, overlayStyle]}>
      {dismissKeyboardOnBackdrop ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
      ) : null}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 12) },
            scrollContentStyle,
          ]}
        >
          <View style={contentContainerStyle}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
