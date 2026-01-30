import React, { useEffect, useRef, memo } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { borderRadius } from '../../theme';

interface SkeletonProps {
  width: number | `${number}%`;
  height: number;
  borderRadiusValue?: number;
  style?: ViewStyle;
}

function SkeletonComponent({ width, height, borderRadiusValue = borderRadius.md, style }: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: borderRadiusValue,
          backgroundColor: colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

export const Skeleton = memo(SkeletonComponent);
