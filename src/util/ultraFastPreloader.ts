// Temporarily disabled for Next.js build
export const ultraFastPreloader = {
  preloadCriticalResources: () => {
    console.log('Ultra fast preloader temporarily disabled');
  },
  preloadRoute: (route: string) => {
    console.log('Route preloading temporarily disabled');
  }
};