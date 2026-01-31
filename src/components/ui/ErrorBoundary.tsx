import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme';
// Static colors import: class components cannot use useTheme() hook.
// Error boundary always renders in light theme as a safe fallback.
import { colors } from '../../theme/colors';
import { captureError } from '../../services/sentry';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component to catch and handle React errors gracefully
 * Prevents the entire app from crashing due to component errors
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (__DEV__) {
      console.error('[ErrorBoundary] Caught error:', error.message);
      console.error('[ErrorBoundary] Stack:', error.stack);
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }

    captureError(error, { componentStack: errorInfo.componentStack ?? undefined });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Allow custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI - always show error message to help debugging
      const errorMessage = this.state.error?.message || 'An unexpected error occurred';

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{errorMessage}</Text>
          {__DEV__ && this.state.error?.stack && (
            <Text style={styles.stack}>{this.state.error.stack.slice(0, 500)}</Text>
          )}
          <TouchableOpacity
            style={styles.button}
            onPress={this.handleRetry}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  message: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  stack: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'left',
    marginBottom: spacing.xl,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  buttonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
