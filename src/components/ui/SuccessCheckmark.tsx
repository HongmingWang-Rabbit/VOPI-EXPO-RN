import React, { useEffect, useRef, memo } from 'react';
import { Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { haptics } from '../../utils/haptics';

function SuccessCheckmarkComponent() {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    haptics.success();
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 50,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, opacity]);

  return (
    <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center', marginBottom: 12 }}>
      <Ionicons name="checkmark-circle" size={64} color={colors.success} />
    </Animated.View>
  );
}

export const SuccessCheckmark = memo(SuccessCheckmarkComponent);
