import React, { useState, useRef, useEffect } from 'react';
import { View, Image, StyleSheet, Animated, ViewStyle, ImageStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface OptimizedImageProps {
  source: { uri: string } | number;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  placeholder?: React.ReactNode;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  lazy?: boolean;
  threshold?: number;
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  style,
  containerStyle,
  placeholder,
  fallbackIcon = 'image-outline',
  resizeMode = 'cover',
  lazy = true,
  threshold = 100,
  onLoad,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(!lazy);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const viewRef = useRef<View>(null);

  useEffect(() => {
    if (!lazy) return;

    // Simple intersection observer simulation
    // In a real app, you might want to use a more sophisticated solution
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [lazy]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  const renderPlaceholder = () => {
    if (placeholder) {
      return placeholder;
    }

    return (
      <View style={[styles.placeholder, style]}>
        <Ionicons 
          name={hasError ? 'image-outline' : 'image'} 
          size={24} 
          color="#9CA3AF" 
        />
      </View>
    );
  };

  const renderImage = () => {
    if (!shouldLoad) {
      return renderPlaceholder();
    }

    return (
      <>
        {(isLoading || hasError) && renderPlaceholder()}
        {!hasError && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Image
              source={source}
              style={[styles.image, style]}
              resizeMode={resizeMode}
              onLoad={handleLoad}
              onError={handleError}
            />
          </Animated.View>
        )}
      </>
    );
  };

  return (
    <View ref={viewRef} style={[styles.container, containerStyle]}>
      {renderImage()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
});

export default OptimizedImage;