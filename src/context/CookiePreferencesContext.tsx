import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentTimestamp } from '../util/ssrUtils';
import { checkPendingApiErrors } from '../util/apiErrorHandler';
import { resetHealthGate } from '../services/service.apiSW';

interface CookiePreferences {
  thirdPartyAds: boolean;
  analytics: boolean;
  functional: boolean;
  hasMadeChoice: boolean;
  lastUpdated?: number;
}

interface CookiePreferencesContextType {
  preferences: CookiePreferences;
  updatePreferences: (newPreferences: Partial<CookiePreferences>) => void;
  optOut: () => void;
  optIn: () => void;
  hasOptedOut: boolean;
  hasOptedIn: boolean;
  hasMadeChoice: boolean;
  isLoading: boolean;
  // Banner timer functions
  checkBannerTimer: () => boolean;
  clearBannerCache: () => void;
  // API blocking functions
  isApiBlocked: boolean;
  hasConsent: boolean;
  isWaitingForConsent: boolean;
}

const defaultPreferences: CookiePreferences = {
  thirdPartyAds: true,
  analytics: true,
  functional: true,
  hasMadeChoice: false, // This should be false to show banner for new users
};

const CookiePreferencesContext = createContext<CookiePreferencesContextType | undefined>(undefined);

export const useCookiePreferences = () => {
  const context = useContext(CookiePreferencesContext);
  if (!context) {
    throw new Error('useCookiePreferences must be used within a CookiePreferencesProvider');
  }
  return context;
};

interface CookiePreferencesProviderProps {
  children: ReactNode;
}

export const CookiePreferencesProvider: React.FC<CookiePreferencesProviderProps> = ({ children }) => {
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);

  // Banner timer functions
  const checkBannerTimer = (): boolean => {
    const lastBannerTime = localStorage.getItem('packmovego-last-banner-time');
    if (lastBannerTime) {
      const lastTime = parseInt(lastBannerTime);
      const thirtyMinutes = 30 * 60 * 1000;
      const timeDiff = Date.now() - lastTime;
      return timeDiff > thirtyMinutes;
    }
    return true; // No last banner time, show banner
  };

  const clearBannerCache = () => {
    localStorage.removeItem('packmovego-last-banner-time');
  };

  // Compute hasOptedOut based on preferences (if all cookies are disabled)
  const hasOptedOut = preferences.hasMadeChoice && 
    !preferences.thirdPartyAds && 
    !preferences.analytics && 
    !preferences.functional;
  
  // Compute hasOptedIn (only true when user has made choice AND all cookies are enabled)
  const hasOptedIn = preferences.hasMadeChoice && 
    preferences.thirdPartyAds && 
    preferences.analytics && 
    preferences.functional;
  
  // API blocking logic - simplified to use hasOptedIn
  const isApiBlocked = !hasOptedIn;
  const hasConsent = hasOptedIn;
  const isWaitingForConsent = !hasOptedIn;

  useEffect(() => {
    const loadPreferences = () => {
      // Load from localStorage - no auto-acceptance
      const savedPreferences = localStorage.getItem('packmovego-cookie-preferences');
      if (savedPreferences) {
        try {
          const parsed = JSON.parse(savedPreferences);
          if (parsed.hasMadeChoice === undefined) { parsed.hasMadeChoice = true; }
          if (!parsed.lastUpdated) { parsed.lastUpdated = Date.now(); }
          setPreferences(parsed);
        } catch (error) {
          console.error('Error parsing saved cookie preferences:', error);
          setPreferences(defaultPreferences);
        }
      } else {
        setPreferences(defaultPreferences);
      }
      
      setIsLoading(false);
    };
    
    loadPreferences();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const preferencesWithTimestamp = { ...preferences, lastUpdated: getCurrentTimestamp() };
      localStorage.setItem('packmovego-cookie-preferences', JSON.stringify(preferencesWithTimestamp));
      
      // Include hasOptedIn in console report (computed value, not stored)
      const reportWithOptIn = {
        thirdPartyAds: preferences.thirdPartyAds,
        analytics: preferences.analytics,
        functional: preferences.functional,
        hasOptedIn: hasOptedIn,
        hasMadeChoice: preferences.hasMadeChoice,
        lastUpdated: preferencesWithTimestamp.lastUpdated
      };
      console.log('🍪 Cookie preferences updated:', reportWithOptIn);
    }
  }, [preferences, isLoading, hasOptedOut, hasOptedIn]);

  // Reset health gate when user opts in to allow fresh API calls
  useEffect(() => {
    if (!isLoading && hasOptedIn) {
      resetHealthGate();
    }
  }, [isLoading, hasOptedIn]);

  const updatePreferences = (newPreferences: Partial<CookiePreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));
  };

  const optOut = () => {
    const newPreferences = {
      thirdPartyAds: false,
      analytics: false,
      functional: false,
      hasMadeChoice: true,
      lastUpdated: getCurrentTimestamp(),
    };
    setPreferences(newPreferences);
    
    // Dispatch opt-out event for other components to handle
    window.dispatchEvent(new CustomEvent('cookie-opt-out'));
    
    // Refresh the page to apply opt-out restrictions
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const optIn = () => {
    console.log('🍪 optIn called - starting cookie consent process');
    const newPreferences = {
      thirdPartyAds: true,
      analytics: true,
      functional: true,
      hasMadeChoice: true,
      lastUpdated: getCurrentTimestamp(),
    };
    
    console.log('🍪 Setting new preferences:', newPreferences);
    setPreferences(newPreferences);
    
    // Update last banner time
    localStorage.setItem('packmovego-last-banner-time', getCurrentTimestamp().toString());
    
    // Notify consent change
    window.dispatchEvent(new CustomEvent('cookie-consent-change'));
    
    // Check for pending API errors now that consent is given
    console.log('🍪 Checking for pending API errors after consent');
    setTimeout(() => {
      checkPendingApiErrors();
    }, 100);
  };

  const value: CookiePreferencesContextType = {
    preferences,
    updatePreferences,
    optOut,
    optIn,
    hasOptedOut: hasOptedOut,
    hasOptedIn: hasOptedIn,
    hasMadeChoice: preferences.hasMadeChoice,
    isLoading,
    checkBannerTimer,
    clearBannerCache,
    isApiBlocked,
    hasConsent,
    isWaitingForConsent,
  };

  return (
    <CookiePreferencesContext.Provider value={value}>
      {children}
    </CookiePreferencesContext.Provider>
  );
};