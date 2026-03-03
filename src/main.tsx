import './styles/index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import * as ReactDOMClient from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';

// SSR-safe environment detection
const isSSR = typeof window === 'undefined';
const isProduction = process.env.NODE_ENV === 'production';

// Only access DOM elements in browser environment
const rootElement = !isSSR ? document.getElementById('root') : null;

if (!isSSR && !rootElement) {
  throw new Error('Root element not found');
}

// Create the app component
const AppComponent = (
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);

// Check if we're in SSR mode (server-rendered content exists)
const hasSSRContent = !isSSR && rootElement ? rootElement.innerHTML.trim().length > 0 : false;

console.log('🚀 Main.tsx Environment:', { isSSR, isProduction, hasSSRContent, NODE_ENV: process.env.NODE_ENV });

// Function to hide loading screen after React is ready (browser only)
const hideLoadingScreen = () => {
  if (isSSR) return;
  
  const loadingScreen = document.getElementById('loading-screen');
  const ghostStructure = document.getElementById('ghost-structure');
  const root = document.getElementById('root');
  
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
  }
  if (ghostStructure) {
    ghostStructure.classList.add('hidden');
  }
  if (root) {
    root.classList.add('loaded');
  }
  console.log('✅ Loading screen hidden, React app is ready');
};

// Only run client-side rendering logic in browser environment
if (!isSSR && rootElement) {
  // Always use hydration in production mode for SSR
  if (isProduction && 'hydrateRoot' in ReactDOMClient) {
    // Production mode with SSR - always hydrate
    try {
      console.log('🔄 Hydrating SSR content in production...');
      (ReactDOMClient as any).hydrateRoot(rootElement, AppComponent);
      console.log('✅ SSR hydration successful');
      // Hide loading screen after successful hydration
      setTimeout(hideLoadingScreen, 100);
    } catch (error) {
      console.error('❌ Hydration failed, falling back to CSR:', error);
      // Clear the server-rendered content and fall back to client-side rendering
      rootElement.innerHTML = '';
      const root = createRoot(rootElement);
      root.render(AppComponent);
      // Hide loading screen after CSR render
      setTimeout(hideLoadingScreen, 100);
    }
  } else if (hasSSRContent && 'hydrateRoot' in ReactDOMClient) {
    // Development mode with SSR content - hydrate
    try {
      console.log('🔄 Hydrating SSR content in development...');
      (ReactDOMClient as any).hydrateRoot(rootElement, AppComponent);
      console.log('✅ SSR hydration successful');
      // Hide loading screen after successful hydration
      setTimeout(hideLoadingScreen, 100);
    } catch (error) {
      console.error('❌ Hydration failed, falling back to CSR:', error);
      // Clear the server-rendered content and fall back to client-side rendering
      rootElement.innerHTML = '';
      const root = createRoot(rootElement);
      root.render(AppComponent);
      // Hide loading screen after CSR render
      setTimeout(hideLoadingScreen, 100);
    }
  } else {
    // Development mode or no SSR content - use createRoot
    console.log('🔄 Client-side rendering...');
    const root = createRoot(rootElement);
    root.render(AppComponent);
    // Hide loading screen after CSR render
    setTimeout(hideLoadingScreen, 100);
  }
}