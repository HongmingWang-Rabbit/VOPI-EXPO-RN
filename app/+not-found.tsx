import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Link, Stack } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import { spacing, borderRadius, fontSize, fontWeight } from '../src/theme';

export default function NotFoundScreen() {
  const { colors } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Page Not Found</Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>This screen doesn't exist.</Text>
        <Link href="/" asChild>
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]}>
            <Text style={styles.buttonText}>Go to Home</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  text: {
    fontSize: fontSize.md,
    marginBottom: spacing.xl,
  },
  button: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
