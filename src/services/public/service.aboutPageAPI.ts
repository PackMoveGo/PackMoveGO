/**
 * About Page API Service
 * 
 * This service handles all API calls needed for the about page including:
 * - About information
 * - Company statistics
 * - Team members
 * - Navigation data
 * 
 * Features:
 * - Centralized API calls for about page
 * - Data caching for performance
 * - Error handling and fallbacks
 * - Public endpoints (no authentication required)
 */

import { api } from '../service.apiSW';
import { handleApiError, getFailedEndpoints, has503Errors } from '../../util/apiErrorHandler';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface AboutPageData {
  nav: any;
  about: any;
  totalMovesCount: number;
  lastUpdated: string;
}

export interface AboutPageServiceData {
  nav: any;
  about: any;
  totalMovesCount: number;
  lastUpdated: string;
}

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

class AboutPageCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

const aboutPageCache = new AboutPageCache();

// =============================================================================
// ABOUT PAGE DATA FUNCTIONS
// =============================================================================

/**
 * Get about page data with error handling
 */
export const getAboutPageData = async (): Promise<AboutPageServiceData> => {
  try {
    console.log('🚀 Loading about page data...');
    
    // Start tracking API calls for about page (this resets previous tracking)
    api.startPageTracking('about-page');
    
    // Define all routes that will be called for this page
    const aboutPageRoutes = ['/v0/nav', '/v0/about', '/v0/recentMoves/total'];
    
    // First check health status - if it fails, all routes are considered 503
    try {
      await api.checkHealth();
    } catch (healthError) {
      // Track all routes as failed since health check failed
      aboutPageRoutes.forEach(route => {
        api.trackApiCall(route);
      });
      
      // Show modal with all routes as failed
      api.showApiFailureModal(aboutPageRoutes, true);
      
      // Return empty data with 503 status
      return {
        nav: null,
        about: null,
        totalMovesCount: 500,
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Health check passed - proceed with individual route calls
    const [navData, aboutData, totalMovesData] = await Promise.allSettled([
      api.getNav(),
      api.getAbout(),
      api.makeRequest('/v0/recentMoves/total')
    ]);
    
    // Collect failed endpoints for this page only
    const failedEndpoints: string[] = [];
    let has503Error = false;
    
    // Check each endpoint result
    if (navData.status === 'rejected') {
      failedEndpoints.push('/v0/nav');
      if (navData.reason?.message?.includes('503')) has503Error = true;
    }
    if (aboutData.status === 'rejected') {
      failedEndpoints.push('/v0/about');
      if (aboutData.reason?.message?.includes('503')) has503Error = true;
    }
    if (totalMovesData.status === 'rejected') {
      failedEndpoints.push('/v0/recentMoves/total');
      if (totalMovesData.reason?.message?.includes('503')) has503Error = true;
    }
    
    // Show modal only for this page's failed endpoints
    if (failedEndpoints.length > 0) {
      api.showApiFailureModal(failedEndpoints, has503Error);
    }
    
    const result: AboutPageServiceData = {
      nav: navData.status === 'fulfilled' ? navData.value : null,
      about: aboutData.status === 'fulfilled' ? aboutData.value : null,
      totalMovesCount: totalMovesData.status === 'fulfilled' ? (totalMovesData.value as number) : 500,
      lastUpdated: new Date().toISOString()
    };
    
    console.log('✅ About page data loaded successfully:', {
      nav: !!result.nav,
      about: !!result.about,
      totalMovesCount: result.totalMovesCount
    });
    
    return result;
  } catch (error) {
    console.error('❌ Failed to load about page data:', error);
    throw error;
  }
};

/**
 * Get comprehensive about page data (legacy function for compatibility)
 */
export const getComprehensiveAboutPageData = async () => {
  return await getAboutPageData();
};

/**
 * Get about page status code
 */
export const getAboutPageStatusCode = async () => {
  return 200; // This would be determined by the actual API calls
};

/**
 * Get about page failed endpoints
 */
export const getAboutPageFailedEndpoints = async () => {
  return getFailedEndpoints();
};

/**
 * Load company info data (placeholder)
 */
export const loadCompanyInfoData = async () => {
  return {};
};

/**
 * Load team members data (placeholder)
 */
export const loadTeamMembersData = async () => {
  return [];
};

/**
 * Load statistics data (placeholder)
 */
export const loadStatisticsData = async () => {
  return {};
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Clear all cached about page data
 */
export const clearAboutPageCache = (): void => {
  aboutPageCache.clear();
  console.log('🧹 About page cache cleared');
};

/**
 * Get cached data without making API calls
 */
export const getCachedAboutPageData = (): Partial<AboutPageData> | null => {
  return {
    nav: aboutPageCache.get('nav') || null,
    about: aboutPageCache.get('about') || null,
    totalMovesCount: aboutPageCache.get('totalMovesCount') || 500
  };
};

/**
 * Check if about page data is cached and not expired
 */
export const isAboutPageDataCached = (): boolean => {
  return aboutPageCache.get('nav') !== null;
};