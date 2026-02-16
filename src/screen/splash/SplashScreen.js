import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';

const SPLASH_DURATION_MS = 2400;

export default function SplashScreen({ onFinish }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const logoScale = useRef(new Animated.Value(0.75)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(24)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const haloPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 440,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        speed: 10,
        bounciness: 7,
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 620,
        delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(titleTranslate, {
        toValue: 0,
        duration: 620,
        delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(haloPulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(haloPulse, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    const timer = setTimeout(() => onFinish?.(), SPLASH_DURATION_MS);

    return () => {
      pulse.stop();
      clearTimeout(timer);
    };
  }, [haloPulse, logoOpacity, logoScale, onFinish, titleOpacity, titleTranslate]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.halo,
          {
            opacity: haloPulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.6] }),
            transform: [
              {
                scale: haloPulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.05] }),
              },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.logoBox,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Text style={styles.logoText}>SA</Text>
      </Animated.View>

      <Animated.View
        style={{
          opacity: titleOpacity,
          transform: [{ translateY: titleTranslate }],
        }}
      >
        <Text style={styles.title}>SchoolApp</Text>
        <Text style={styles.subtitle}>Learn. Grow. Lead.</Text>
      </Animated.View>
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.auth.background,
    },
    halo: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: colors.auth.blobPrimary,
    },
    logoBox: {
      width: 96,
      height: 96,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.brand.primary,
      marginBottom: 20,
    },
    logoText: {
      color: colors.text.inverse,
      fontSize: 34,
      fontWeight: '900',
      letterSpacing: 1,
    },
    title: {
      color: colors.auth.title,
      fontSize: 38,
      fontWeight: '900',
      textAlign: 'center',
      letterSpacing: 0.5,
    },
    subtitle: {
      marginTop: 8,
      color: colors.auth.subtitle,
      fontSize: 14,
      textAlign: 'center',
    },
  });
