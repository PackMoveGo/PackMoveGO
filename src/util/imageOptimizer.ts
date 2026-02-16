// Image Optimization Utility
// Handles progressive image loading, fallbacks, and optimization

interface ImageConfig {
  src: string;
  fallbackSrc?: string;
  placeholderSrc?: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  fetchpriority?: 'high' | 'low' | 'auto';
}

class ImageOptimizer {
  private static instance: ImageOptimizer;
  private loadedImages = new Set<string>();
  private failedImages = new Set<string>();

  static getInstance(): ImageOptimizer {
    if (!ImageOptimizer.instance) {
      ImageOptimizer.instance = new ImageOptimizer();
    }
    return ImageOptimizer.instance;
  }

  // Preload critical images
  preloadImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.loadedImages.add(src);
        resolve();
      };
      
      img.onerror = () => {
        this.failedImages.add(src);
        reject(new Error(`Failed to load image: ${src}`));
      };
      
      img.src = src;
    });
  }

  // Load image with fallback
  async loadImageWithFallback(config: ImageConfig): Promise<string> {
    try {
      // Try to load the main image
      await this.preloadImage(config.src);
      return config.src;
    } catch (error) {
      console.warn(`Failed to load image ${config.src}, trying fallback`);
      
      if (config.fallbackSrc) {
        try {
          await this.preloadImage(config.fallbackSrc);
          return config.fallbackSrc;
        } catch (fallbackError) {
          console.error(`Fallback image also failed: ${config.fallbackSrc}`);
        }
      }
      
      // Return placeholder or throw error
      if (config.placeholderSrc) {
        return config.placeholderSrc;
      }
      
      throw error;
    }
  }

  // Get optimized image src based on connection speed
  getOptimizedImageSrc(baseSrc: string, connectionSpeed?: 'slow' | 'medium' | 'fast'): string {
    const isSlow = connectionSpeed === 'slow';
    const isMedium = connectionSpeed === 'medium';
    
    // For slow connections, use minified versions
    if (isSlow && baseSrc.includes('.webp')) {
      return baseSrc.replace('.webp', '-min.webp');
    }
    
    if (isSlow && baseSrc.includes('.png')) {
      return baseSrc.replace('.png', '-min.png');
    }
    
    // For medium connections, prefer webp over png
    if (isMedium && baseSrc.includes('.png')) {
      return baseSrc.replace('.png', '.webp');
    }
    
    return baseSrc;
  }

  // Check if image is already loaded
  isImageLoaded(src: string): boolean {
    return this.loadedImages.has(src);
  }

  // Check if image failed to load
  isImageFailed(src: string): boolean {
    return this.failedImages.has(src);
  }

  // Clear cache
  clearCache(): void {
    this.loadedImages.clear();
    this.failedImages.clear();
  }

  // Get loading strategy based on connection
  getLoadingStrategy(connectionSpeed?: 'slow' | 'medium' | 'fast'): 'lazy' | 'eager' {
    if (connectionSpeed === 'slow') {
      return 'lazy';
    }
    return 'eager';
  }

  // Get fetch priority based on importance
  getFetchPriority(isCritical: boolean = false): 'high' | 'low' | 'auto' {
    return isCritical ? 'high' : 'auto';
  }
}

// Export singleton instance
export const imageOptimizer = ImageOptimizer.getInstance();

// Export the class for testing
export { ImageOptimizer };

import { useState, useEffect } from 'react';

// React hook for optimized image loading
export function useOptimizedImage(
  src: string,
  fallbackSrc?: string,
  connectionSpeed?: 'slow' | 'medium' | 'fast'
) {
  const [currentSrc, setCurrentSrc] = useState<string>(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        
        const optimizedSrc = imageOptimizer.getOptimizedImageSrc(src, connectionSpeed);
        const finalSrc = await imageOptimizer.loadImageWithFallback({
          src: optimizedSrc,
          fallbackSrc: fallbackSrc || src,
          alt: 'Image'
        });
        
        setCurrentSrc(finalSrc);
      } catch (error) {
        setHasError(true);
        console.error('Failed to load image:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [src, fallbackSrc, connectionSpeed]);

  return {
    src: currentSrc,
    isLoading,
    hasError
  };
} 