import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import ErrorBoundary from './component/ui/feedback/ErrorBoundary';
import Layout from './component/layout/Layout';

// Optimized lazy loading with error boundaries and SSR compatibility
const createLazyComponent = (importFunc: () => Promise<any>, fallback?: React.ReactNode) => {
  const LazyComponent = lazy(() => 
    importFunc().catch((error) => {
      console.error('Failed to load component:', error);
      // Return a fallback component instead of throwing
      return { 
        default: () => (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-yellow-800 font-semibold">Component Loading Error</h3>
            <p className="text-yellow-600 text-sm">
              Failed to load this component. Please refresh the page.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-2 text-xs text-yellow-600">
                <summary>Error Details</summary>
                <pre className="mt-1 p-2 bg-yellow-100 rounded overflow-auto">
                  {error.message}
                </pre>
              </details>
            )}
          </div>
        )
      };
    })
  );
  
  return (props: any) => (
    <ErrorBoundary>
      <LazyComponent {...props} />
    </ErrorBoundary>
  );
};

// Lazy load pages with error boundaries and SSR compatibility
const HomePage = createLazyComponent(() => import('./pages/page.home'));

// Import ServicesTest component directly for testing
// import ServicesTest from './component/devtools/ServicesTest';

const AppContent: React.FC = () => {
  console.log('🚀 AppCSR rendering...');
  
  return (
    <Layout isSSR={false}>
      <div className="App">
        {/* Analytics Root */}
        <div id="analytics-root"></div>
        
        {/* Main Content with optimized routing */}
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600 text-sm">Loading...</p>
            </div>
          </div>
        }>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
    </Layout>
  );
};

export default AppContent; 