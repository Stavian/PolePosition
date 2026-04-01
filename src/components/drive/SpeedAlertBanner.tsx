import { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { colors } from '../../utils/colors';

interface SpeedAlertBannerProps {
  overByKmh: number;
}

export function SpeedAlertBanner({ overByKmh }: SpeedAlertBannerProps) {
  const slideAnim = useRef(new Animated.Value(-80)).current;
  const visible = overByKmh > 3;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : -80,
      useNativeDriver: true,
      tension: 120,
      friction: 10,
    }).start();
  }, [visible]);

  if (overByKmh <= 0) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
      <Text style={styles.text}>
        ⚠ +{Math.round(overByKmh)} km/h über Limit
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.danger,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'center',
  },
  text: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
