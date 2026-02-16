import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLoginMutation, getApiErrorMessage } from '../../hooks/useLoginMutation';
import { setAuthToken } from '../../api/client';
import { useAppTheme } from '../../theme/ThemeContext';

const DEFAULT_FCM_TOKEN = 'student_device_token_1';

export default function LoginScreen({ onLoginSuccess }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [hidePassword, setHidePassword] = useState(true);
  const [errorModal, setErrorModal] = useState({ visible: false, title: '', message: '' });
  const passwordInputRef = useRef(null);

  const loginMutation = useLoginMutation();

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(24)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(38)).current;
  const floatA = useRef(new Animated.Value(0)).current;
  const floatB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 550,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(headerTranslate, {
        toValue: 0,
        duration: 550,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 700,
        delay: 130,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslate, {
        toValue: 0,
        duration: 700,
        delay: 130,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const loopA = Animated.loop(
      Animated.sequence([
        Animated.timing(floatA, {
          toValue: 1,
          duration: 3100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatA, {
          toValue: 0,
          duration: 3100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const loopB = Animated.loop(
      Animated.sequence([
        Animated.timing(floatB, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatB, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    loopA.start();
    loopB.start();

    return () => {
      loopA.stop();
      loopB.stop();
    };
  }, [cardOpacity, cardTranslate, floatA, floatB, headerOpacity, headerTranslate]);

  const topBlobTransform = useMemo(
    () => [
      {
        translateY: floatA.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -14],
        }),
      },
      {
        translateX: floatA.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 12],
        }),
      },
    ],
    [floatA],
  );

  const bottomBlobTransform = useMemo(
    () => [
      {
        translateY: floatB.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 10],
        }),
      },
      {
        translateX: floatB.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10],
        }),
      },
    ],
    [floatB],
  );

  const isLoading = loginMutation.isPending;
  const identifierLabel = 'Email / Scholar Number';
  const identifierPlaceholder = 'Enter email or scholar number';
  const showError = (title, message) =>
    setErrorModal({ visible: true, title, message });

  const submit = async () => {
    if (!identifier.trim() || !password.trim()) {
      showError('Missing fields', 'Please enter identifier and password.');
      return;
    }

    try {
      const result = await loginMutation.loginWithIdentifier({
        identifier,
        password,
        fcmToken: DEFAULT_FCM_TOKEN,
      });

      if (!result?.token) {
        showError('Login failed', 'Token not found in API response.');
        return;
      }
      if (!result?.role) {
        showError('Login failed', 'Role not found in API response.');
        return;
      }

      setAuthToken(result.token);
      onLoginSuccess?.({
        token: result.token,
        role: result.role,
        user: result?.user ?? null,
      });
    } catch (error) {
      showError('Invalid credentials', getApiErrorMessage(error));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.background}>
        <Animated.View style={[styles.blob, styles.blobTop, { transform: topBlobTransform }]} />
        <Animated.View
          style={[styles.blob, styles.blobBottom, { transform: bottomBlobTransform }]}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <Animated.View
            style={[
              styles.hero,
              {
                opacity: headerOpacity,
                transform: [{ translateY: headerTranslate }],
              },
            ]}
          >
            <Text style={styles.overline}>SCHOOL MANAGEMENT</Text>
            <Text style={styles.heroTitle}>Welcome Back</Text>
            <Text style={styles.heroSubtitle}>
              Login and continue to your dashboard.
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardOpacity,
                transform: [{ translateY: cardTranslate }],
              },
            ]}
          >
            <Text style={styles.label}>{identifierLabel}</Text>
            <TextInput
              value={identifier}
              onChangeText={setIdentifier}
              style={styles.input}
              autoCapitalize="none"
              keyboardType="default"
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              placeholder={identifierPlaceholder}
              placeholderTextColor={colors.text.muted}
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                ref={passwordInputRef}
                value={password}
                onChangeText={setPassword}
                style={[styles.input, styles.passwordInput]}
                secureTextEntry={hidePassword}
                returnKeyType="go"
                onSubmitEditing={submit}
                placeholder="Enter your password"
                placeholderTextColor={colors.text.muted}
              />
              <Pressable style={styles.toggleBtn} onPress={() => setHidePassword(prev => !prev)}>
                <Text style={styles.toggleBtnText}>{hidePassword ? 'Show' : 'Hide'}</Text>
              </Pressable>
            </View>

            <Pressable
              style={[styles.loginButton, isLoading ? styles.loginButtonDisabled : null]}
              onPress={submit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.auth.modalButtonText} />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={errorModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{errorModal.title}</Text>
            <Text style={styles.modalText}>{errorModal.message}</Text>
            <Pressable
              style={styles.modalButton}
              onPress={() => setErrorModal({ visible: false, title: '', message: '' })}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = colors =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.auth.background,
  },
  flex: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.auth.background,
  },
  blob: {
    position: 'absolute',
    borderRadius: 180,
    opacity: 0.34,
  },
  blobTop: {
    width: 260,
    height: 260,
    backgroundColor: colors.auth.blobPrimary,
    top: -80,
    left: -70,
  },
  blobBottom: {
    width: 290,
    height: 290,
    backgroundColor: colors.auth.blobAccent,
    bottom: -120,
    right: -90,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 34,
    paddingBottom: 28,
    justifyContent: 'center',
  },
  hero: {
    marginBottom: 22,
  },
  overline: {
    color: colors.auth.overline,
    letterSpacing: 2,
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    marginTop: 8,
    color: colors.auth.title,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  heroSubtitle: {
    marginTop: 8,
    color: colors.auth.subtitle,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    borderRadius: 24,
    backgroundColor: colors.auth.card,
    borderWidth: 1,
    borderColor: colors.auth.cardBorder,
    padding: 18,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  label: {
    color: colors.auth.label,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.auth.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.auth.text,
    fontSize: 15,
    backgroundColor: colors.auth.inputBg,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
  },
  toggleBtn: {
    marginLeft: 8,
    backgroundColor: colors.background.overlay,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  toggleBtnText: {
    color: colors.text.secondary,
    fontWeight: '700',
    fontSize: 12,
  },
  loginButton: {
    marginTop: 18,
    borderRadius: 14,
    backgroundColor: colors.brand.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    backgroundColor: colors.state.disabled,
  },
  loginButtonText: {
    color: colors.auth.modalButtonText,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.auth.modalBackdrop,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.auth.modalBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.auth.cardBorder,
    padding: 16,
  },
  modalTitle: {
    color: colors.auth.modalTitle,
    fontSize: 18,
    fontWeight: '800',
  },
  modalText: {
    marginTop: 8,
    color: colors.auth.modalText,
    fontSize: 14,
    lineHeight: 21,
  },
  modalButton: {
    marginTop: 14,
    alignSelf: 'flex-end',
    backgroundColor: colors.auth.modalButton,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalButtonText: {
    color: colors.auth.modalButtonText,
    fontSize: 13,
    fontWeight: '700',
  },
});
