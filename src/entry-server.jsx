import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import AppSSR from './AppSSR';
import { UserTrackingProvider } from './component/business/UserTrackingProvider';
import { CookiePreferencesProvider } from './context/CookiePreferencesContext';
import { SectionDataProvider } from './context/SectionDataContext';
import { SectionVerificationProvider } from './context/SectionVerificationContext';

export function render(url, context = {}) {
  const helmetContext = {};
  
  try {
    // Set NODE_ENV to production for SSR to ensure consistent rendering
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    const html = renderToString(
      <HelmetProvider context={helmetContext}>
        <StaticRouter location={url} context={context}>
          <UserTrackingProvider serverUrl={process.env.API_URL || 'https://localhost:3000'}>
            <CookiePreferencesProvider>
              <SectionDataProvider>
                <SectionVerificationProvider>
                  <AppSSR url={url} />
                </SectionVerificationProvider>
              </SectionDataProvider>
            </CookiePreferencesProvider>
          </UserTrackingProvider>
        </StaticRouter>
      </HelmetProvider>
    );

    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;

    console.log(`📄 SSR rendered ${url}: ${html.length} characters`);
    return { html, helmetContext };
  } catch (error) {
    console.error(`❌ SSR render error for ${url}:`, error);
    // Return empty HTML on error to prevent crashes
    return { html: '', helmetContext };
  }
}
