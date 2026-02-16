// Temporarily disabled for Next.js build
export class BundleOptimizer {
  private preloadedChunks = new Set<string>();

  preloadChunk(chunkName: string): void {
    // Temporarily disabled
  }

  private getExistingChunks(): string[] {
    return [];
  }
}

export const bundleOptimizer = new BundleOptimizer();