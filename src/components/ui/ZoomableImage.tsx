import React, { memo } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { toCacheKey } from '../../utils/strings';

interface ZoomableImageProps {
  uri: string;
}

function ZoomableImageComponent({ uri }: ZoomableImageProps) {
  const { width: screenWidth } = useWindowDimensions();

  return (
    <ScrollView
      contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      maximumZoomScale={4}
      minimumZoomScale={1}
      bouncesZoom
      centerContent
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    >
      <Image
        source={{ uri, cacheKey: toCacheKey(uri) }}
        style={{ width: screenWidth, height: screenWidth }}
        contentFit="contain"
        cachePolicy="disk"
        accessibilityLabel="Full size product image"
      />
    </ScrollView>
  );
}

export const ZoomableImage = memo(ZoomableImageComponent);
