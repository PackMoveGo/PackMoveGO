/**
 * Footer API Service
 * 
 * This service handles all API calls needed for the footer component including:
 * - Services data for footer display
 * - Contact information
 * - Social media links
 * - Quick links
 * 
 * Features:
 * - Centralized API calls for footer
 * - Data caching for performance
 * - Error handling and fallbacks
 * - Public endpoints (no authentication required)
 */

import { api } from '../service.apiSW';
import { handleApiError, getFailedEndpoints, has503Errors } from '../../util/apiErrorHandler';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface FooterServiceData {
  id: string;
  name: string;
  description: string;
  icon: string;
  isAvailable: boolean;
}

export interface FooterContactInfo {
  phone: string;
  email: string;
  address: string;
  website: string;
}

export interface FooterSocialLink {
  platform: string;
  url: string;
  icon: string;
}

export interface FooterQuickLink {
  title: string;
  url: string;
}

export interface FooterData {
  services: FooterServiceData[];
  contactInfo: FooterContactInfo;
  socialLinks: FooterSocialLink[];
  quickLinks: FooterQuickLink[];
  copyright: {
    year: number;
    companyName: string;
    rightsText: string;
  };
}

const PUBLIC_CONTACT_INFO: FooterContactInfo = {
  phone: 'Contact via website',
  email: 'support@packmovego.com',
  address: 'Address available on request',
  website: 'https://packmovego.com'
};

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Get services data for footer display
 * Calls the v0/services endpoint to get a simplified list of services
 */
export const getFooterServices = async (): Promise<FooterServiceData[]> => {
  try {
    // This will trigger the middleware error tracking in service.apiSW.ts
    const response = await api.getServices();
    
    if (response && response.services && Array.isArray(response.services)) {
      return response.services.map((service: any) => ({
        id: service.id || '',
        name: service.name || service.title || 'Service',
        description: service.description || service.shortDescription || '',
        icon: service.icon || '📦',
        isAvailable: service.isAvailable !== false
      }));
    }
    
    return [];
  } catch (error) {
    // Check if it's a consent error - don't log as error
    if (error instanceof Error && error.message.includes('cookie consent')) {
      // This is expected when user hasn't opted in - don't log as error
      return [];
    }
    
    // Only log actual API errors
    console.error('Footer services error:', error);
    // The middleware in service.apiSW.ts will handle 503 error tracking
    // We just need to re-throw to ensure the error is properly tracked
    throw error;
  }
};

/**
 * Get footer contact information
 * Returns static contact info for the footer
 */
export const getFooterContactInfo = async (): Promise<FooterContactInfo> => {
  return PUBLIC_CONTACT_INFO;
};

/**
 * Get social media links for footer
 * Returns static social media links
 */
export const getFooterSocialLinks = async (): Promise<FooterSocialLink[]> => {
  return [
    {
      platform: 'X (Twitter)',
      url: '#',
      icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'
    },
    {
      platform: 'Facebook',
      url: '#',
      icon: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z'
    },
    {
      platform: 'LinkedIn',
      url: '#',
      icon: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z'
    },
    {
      platform: 'Reddit',
      url: '#',
      icon: 'M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z'
    },
    {
      platform: 'Instagram',
      url: '#',
      icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z'
    }
  ];
};

/**
 * Get quick links for footer
 * Returns static quick links
 */
export const getFooterQuickLinks = async (): Promise<FooterQuickLink[]> => {
  return [
    { title: 'About Us', url: '/about' },
    { title: 'Privacy Policy', url: '/privacy' },
    { title: 'Terms of Service', url: '/terms' }
  ];
};

/**
 * Get complete footer data
 * Combines all footer data sources
 */
export const getFooterData = async (): Promise<FooterData> => {
  try {
    // Use Promise.all so errors are properly propagated to middleware
    const [services, contactInfo, socialLinks, quickLinks] = await Promise.all([
      getFooterServices(),
      getFooterContactInfo(),
      getFooterSocialLinks(),
      getFooterQuickLinks()
    ]);

    return {
      services,
      contactInfo,
      socialLinks,
      quickLinks,
      copyright: {
        year: new Date().getFullYear(),
        companyName: 'Pack Move Go',
        rightsText: 'All rights reserved'
      }
    };
  } catch (error) {
    // Check if it's a consent error - don't log as error
    if (error instanceof Error && error.message.includes('cookie consent')) {
      // This is expected when user hasn't opted in - return fallback data silently
      return {
      services: [],
      contactInfo: PUBLIC_CONTACT_INFO,
      socialLinks: [],
      quickLinks: [
        { title: 'About Us', url: '/about' },
        { title: 'Privacy Policy', url: '/privacy' },
        { title: 'Terms of Service', url: '/terms' }
      ],
      copyright: {
        year: new Date().getFullYear(),
        companyName: 'Pack Move Go',
        rightsText: 'All rights reserved'
      }
    };
    }
    
    // Only log actual API errors (not consent errors)
    console.error('Footer data error:', error);
    // The middleware in service.apiSW.ts will handle 503 error tracking
    // Return fallback data but don't suppress the error
    return {
      services: [],
      contactInfo: PUBLIC_CONTACT_INFO,
      socialLinks: [],
      quickLinks: [
        { title: 'About Us', url: '/about' },
        { title: 'Privacy Policy', url: '/privacy' },
        { title: 'Terms of Service', url: '/terms' }
      ],
      copyright: {
        year: new Date().getFullYear(),
        companyName: 'Pack Move Go',
        rightsText: 'All rights reserved'
      }
    };
  }
};

// Track the status code from health check
let footerStatusCode = 200;

/**
 * Get the status code for footer data errors
 * This calls the health check API to get the actual status code
 */
export const getFooterStatusCode = async (): Promise<number> => {
  try {
    // Call the health check API to get the actual status
    await api.checkHealth();
    footerStatusCode = 200; // Success
    return footerStatusCode;
  } catch (error) {
    console.error('Health check failed:', error);
    
    // Extract status code from error message - prioritize 503 detection
    let statusCode = 503; // Default to 503 for health check failures
    
    if (error instanceof Error) {
      if (error.message.includes('503') || error.message.includes('Service Unavailable')) {
        statusCode = 503;
      } else if (error.message.includes('500')) {
        statusCode = 500;
      } else if (error.message.includes('502')) {
        statusCode = 502;
      } else if (error.message.includes('504')) {
        statusCode = 504;
      }
    }
    
    footerStatusCode = statusCode;
    
    // Note: Modal is handled by the main page service, not footer
    if (statusCode >= 500) {
      console.log(`🚨 Health check failed with status ${statusCode}, modal will be handled by main page`);
    }
    
    return footerStatusCode;
  }
};

/**
 * Check if there are any 503 errors in the footer data
 * This uses the global error tracking from the middleware
 */
export const hasFooter503Errors = (): boolean => {
  return has503Errors();
};

/**
 * Get failed endpoints for footer
 */
export const getFooterFailedEndpoints = (): string[] => {
  return getFailedEndpoints();
};
