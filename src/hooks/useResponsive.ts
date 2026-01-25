import { useWindowDimensions, Platform } from 'react-native';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isWeb = Platform.OS === 'web';
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  // Max content width for desktop (centered container)
  const contentMaxWidth = isDesktop ? 480 : '100%';

  // Padding adjustments
  const horizontalPadding = isDesktop ? 48 : isTablet ? 32 : 16;

  return {
    width,
    height,
    isWeb,
    isMobile,
    isTablet,
    isDesktop,
    contentMaxWidth,
    horizontalPadding,
  };
}
