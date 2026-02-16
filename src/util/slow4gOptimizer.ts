// Temporarily disabled for Next.js build
export const slow4gOptimizer = {
  optimizeForSlowConnection: () => {
    console.log('Slow 4G optimizer temporarily disabled');
  },
  getOptimizationHints: () => {
    return [];
  }
};