import React, { useEffect, useState } from 'react';
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, event => {
      setKeyboardHeight(event?.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Android: only extra bottom padding (no KAV padding) so form does not jump off-screen.
  // iOS: KAV padding handles lift; keep a small safe bottom inset only.
  const bottomPad =
    Platform.OS === 'android'
      ? Math.max(insets.bottom + keyboardHeight + 12, 24)
      : Math.max(insets.bottom + 24, 24);

  return (
    <View style={[styles.overlay, overlayStyle]}>
      {dismissKeyboardOnBackdrop ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
      ) : null}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          contentInsetAdjustmentBehavior="always"
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }, scrollContentStyle]}
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
