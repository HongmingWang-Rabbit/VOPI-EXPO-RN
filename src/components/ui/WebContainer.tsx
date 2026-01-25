import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

interface WebContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
}

/**
 * Container that centers content on web/desktop with a max width.
 * On mobile, it renders children directly without wrapper.
 */
export function WebContainer({ children, maxWidth = 480 }: WebContainerProps) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={styles.webWrapper}>
      <View style={[styles.webContent, { maxWidth }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webWrapper: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  webContent: {
    flex: 1,
    width: '100%',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    // @ts-ignore - web only
    boxShadow: '0 0 20px rgba(0,0,0,0.1)',
  },
});
