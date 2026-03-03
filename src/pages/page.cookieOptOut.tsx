import React, { useState, useEffect } from 'react';
import { useCookiePreferences } from '../context/CookiePreferencesContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../component/layout/Layout';
import SEO from '../component/business/SEO';
import { usePageSEO } from '../hook/useSEO';

/**
 * Cookie Opt-Out Page Component
 * 
 * This component renders a comprehensive cookie settings page.
 * It's used for the /cookie-opt-out route in both CSR and SSR.
 */
const CookieOptOutPage: React.FC = () => {
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Get cookie preferences with error handling
  let preferences, hasOptedOut, hasMadeChoice, optIn, optOut, updatePreferences, isLoading;
  let checkBannerTimer, clearBannerCache;
  
  try {
    const cookiePrefs = useCookiePreferences();
    preferences = cookiePrefs.preferences;
    hasOptedOut = cookiePrefs.hasOptedOut;
    hasMadeChoice = cookiePrefs.hasMadeChoice;
    optIn = cookiePrefs.optIn;
    optOut = cookiePrefs.optOut;
    updatePreferences = cookiePrefs.updatePreferences;
    isLoading = cookiePrefs.isLoading;
    checkBannerTimer = cookiePrefs.checkBannerTimer;
    clearBannerCache = cookiePrefs.clearBannerCache;
  } catch (error) {
    console.error('🍪 CookieOptOutPage: Error accessing cookie preferences:', error);
    // Provide fallback values
    preferences = { thirdPartyAds: true, analytics: true, functional: true, hasMadeChoice: false };
    hasOptedOut = false;
    hasMadeChoice = false;
    isLoading = false;
    optIn = () => console.warn('Cookie preferences not available');
    optOut = () => console.warn('Cookie preferences not available');
    updatePreferences = () => console.warn('Cookie preferences not available');
    checkBannerTimer = () => true;
    clearBannerCache = () => {};
  }

  // Use the usePageSEO hook for SEO data
  const seoData = usePageSEO(
    "Cookie Preferences | Pack Move Go - Manage Your Privacy",
    "Manage your cookie preferences and privacy settings with Pack Move Go. Control how we use cookies to improve your experience and protect your privacy.",
    "cookie preferences, privacy settings, data protection, cookie management, privacy control, GDPR compliance",
    "/images/moving-truck.webp",
    "https://packmovego.com/cookie-opt-out"
  );

  const handleToggleCategory = (category: 'thirdPartyAds' | 'analytics' | 'functional') => {
    if (updatePreferences) {
      updatePreferences({
        [category]: !preferences[category],
        hasMadeChoice: true
      });
    }
  };

  const handleAcceptAll = () => {
    setIsTransitioning(true);
    if (updatePreferences) {
      updatePreferences({
        thirdPartyAds: true,
        analytics: true,
        functional: true,
        hasMadeChoice: true
      });
    }
    setTimeout(() => {
      navigate('/');
    }, 500);
  };

  const handleRejectAll = () => {
    setIsTransitioning(true);
    if (updatePreferences) {
      updatePreferences({
        thirdPartyAds: false,
        analytics: false,
        functional: false,
        hasMadeChoice: true
      });
    }
    setTimeout(() => {
      navigate('/');
    }, 500);
  };


  if (isLoading) {
    return (
      <Layout forceHideNavbar={true} forceHideFooter={true}>
        <SEO {...seoData} />
        <div className="h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading cookie preferences...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout forceHideNavbar={true} forceHideFooter={true}>
      <SEO {...seoData} />
      
      <div className="h-screen bg-white flex flex-col">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white flex-shrink-0">
          <div className="container mx-auto px-4 py-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                Cookie Preferences
              </h1>
              <p className="text-sm md:text-base text-blue-100">
                Manage your privacy and cookie settings
              </p>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="flex-1 flex flex-col">
          <div className="container mx-auto px-4 py-3 flex-1 flex flex-col">
            <div className="max-w-4xl mx-auto flex-1 flex flex-col">
              {/* Current Status */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex-shrink-0">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-red-800 font-medium">
                    {hasOptedOut 
                      ? 'You are currently opted out of all cookies'
                      : 'Please make a choice about cookie preferences'
                    }
                  </span>
                </div>
              </div>

              {/* Cookie Categories */}
              <div className="space-y-3 mb-4 flex-1">
                {/* Third-Party Advertising Cookies */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-yellow-800">Third-Party Advertising Cookies</h3>
                      </div>
                      <p className="text-xs text-yellow-700 leading-tight">
                        These cookies are used to serve you relevant ads and track your browsing activity across different websites.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        checked={preferences.thirdPartyAds}
                        onChange={() => handleToggleCategory('thirdPartyAds')}
                        className="sr-only peer"
                      />
                      <div className={`
                        w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer
                        peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all
                        ${preferences.thirdPartyAds ? 'bg-yellow-500' : 'bg-gray-200'}
                      `}></div>
                    </label>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-blue-800">Analytics Cookies</h3>
                      </div>
                      <p className="text-xs text-blue-700 leading-tight">
                        These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        checked={preferences.analytics}
                        onChange={() => handleToggleCategory('analytics')}
                        className="sr-only peer"
                      />
                      <div className={`
                        w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer
                        peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all
                        ${preferences.analytics ? 'bg-blue-500' : 'bg-gray-200'}
                      `}></div>
                    </label>
                  </div>
                </div>

                {/* Functional Cookies */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-green-800">Functional Cookies</h3>
                      </div>
                      <p className="text-xs text-green-700 leading-tight">
                        These cookies enable enhanced functionality and personalization, such as remembering your preferences and settings.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        checked={preferences.functional}
                        onChange={() => handleToggleCategory('functional')}
                        className="sr-only peer"
                      />
                      <div className={`
                        w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer
                        peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all
                        ${preferences.functional ? 'bg-green-500' : 'bg-gray-200'}
                      `}></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-shrink-0">
                <button
                  onClick={handleAcceptAll}
                  disabled={isTransitioning}
                  className={`
                    flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold 
                    py-2 px-4 rounded-lg transition-all duration-300 flex items-center justify-center
                    min-h-[40px] touch-manipulation transform text-sm
                    ${isTransitioning ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-lg'}
                  `}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Accept All Cookies
                </button>
                
                <button
                  onClick={handleRejectAll}
                  disabled={isTransitioning}
                  className={`
                    flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold 
                    py-2 px-4 rounded-lg transition-all duration-300 flex items-center justify-center
                    min-h-[40px] touch-manipulation transform text-sm
                    ${isTransitioning ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-lg'}
                  `}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reject All Cookies
                </button>
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-gray-200 pb-2 flex-shrink-0">
                <p className="text-sm text-gray-600 text-center leading-relaxed">
                  By using our website, you agree to our{' '}
                  <a href="/privacy" className="text-blue-600 hover:text-blue-800 active:text-blue-900 underline touch-manipulation">
                    Privacy Policy
                  </a>{' '}
                  and{' '}
                  <a href="/terms" className="text-blue-600 hover:text-blue-800 active:text-blue-900 underline touch-manipulation">
                    Terms of Service
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default CookieOptOutPage;
