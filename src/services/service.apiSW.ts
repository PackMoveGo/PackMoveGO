/**
 * Unified API Service for PackMoveGo Application
 * 
 * This module provides centralized API functionality with:
 * - Environment-aware configuration from vite.config.js
 * - JWT authentication for cross-domain access
 * - Proper error handling and status codes
 * - CORS bearer token handling
 * 
 * Features:
 * - Unified API client for all endpoints
 * - JWT token management for authenticated requests
 * - Environment-based configuration
 * - Proper status codes for API-dependent services
 */

import { handleApiError } from '../util/apiErrorHandler';
import { apiCache } from '../util/apiCache';
import { isConnectionError, is503Error, normalizeTo503Error, log503Error, createConnectionError } from '../util/errorUtils';

// =============================================================================
// API FAILURE MODAL MANAGEMENT
// =============================================================================

// =============================================================================
// API CONFIGURATION FUNCTIONS
// =============================================================================

// API configuration functions (moved from config/api)
const getApiKey = (): string => {
  // Get API key from environment variables
  const getEnvVar = (key: string, fallback?: string): string => {
    // Priority 1: process.env (for SSR and Node.js)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
    
    // Priority 2: import.meta.env (Vite's standard way)
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
      return (import.meta as any).env[key];
    }
    
    // Priority 3: Vite global variables (from vite.config.js define)
    const globalKey = `__${key.replace('VITE_', '')}__`;
    if (typeof window !== 'undefined' && (window as any)[globalKey]) {
      return (window as any)[globalKey];
    }
    
    // Priority 4: Check for Vite environment variables in window object
    if (typeof window !== 'undefined' && (window as any).__VITE_ENV__ && (window as any).__VITE_ENV__[key]) {
      return (window as any).__VITE_ENV__[key];
    }
    
    // Return fallback or empty string
    return fallback || '';
  };

  // Never hardcode API keys in source code.
  return getEnvVar('VITE_API_KEY_FRONTEND') || getEnvVar('API_KEY_FRONTEND');
};

const getSigninHost = (): string => {
  // Will be updated after ENV_CONFIG is available
  return 'https://localhost:3000/signin';
};

// =============================================================================
// GLOBAL 503 STATUS MANAGEMENT
// =============================================================================

// Global 503 status - once API is down, prevent all requests
let global503Status = false;
let global503CheckPromise: Promise<boolean> | null = null;

// Set global 503 status
export const setGlobal503Status = (status: boolean) => {
  global503Status = status;
};

// Get global 503 status
export const getGlobal503Status = (): boolean => {
  return global503Status;
};

// Check if API is globally unavailable (503)
export const isApiGlobally503 = (): boolean => {
  return global503Status;
};

// Perform global health check and set 503 status
export const performGlobalHealthCheck = async (): Promise<boolean> => {
  if (global503CheckPromise) {
    return global503CheckPromise;
  }

  global503CheckPromise = (async () => {
    try {
      const { api } = await import('./service.apiSW');
      const healthResult = await api.checkHealth();
      
      if (healthResult && healthResult.error) {
        setGlobal503Status(true);
        return false;
      }
      
      setGlobal503Status(false);
      return true;
    } catch (error) {
      setGlobal503Status(true);
      return false;
    }
  })();

  return global503CheckPromise;
};

// Reset global 503 status (for testing or manual reset)
export const resetGlobal503Status = () => {
  setGlobal503Status(false);
  global503CheckPromise = null;
};

// =============================================================================
// GLOBAL ERROR HANDLING
// =============================================================================

// Add global error handler for unhandled promise rejections
if (typeof window !== 'undefined') {
  
  // Simplified error handling - no fetch override

  // Simplified error handling - no global error suppression
  
  window.addEventListener('unhandledrejection', (event) => {
    // Only prevent crashes for 503 errors, not all network errors
    if (event.reason && typeof event.reason === 'object') {
      const error = event.reason;
      if (error.statusCode === 503 || error.is503Error) {
        console.warn('🛡️ Preventing crash for 503 error:', error.message);
        event.preventDefault(); // Prevent the default crash behavior
        return;
      }
    }
    
    // Log other unhandled rejections but don't suppress them
    console.error('🚨 Unhandled Promise Rejection:', event.reason);
  });
}

// =============================================================================
// API CALL DEDUPLICATION & RETRY MECHANISM
// =============================================================================

// Global request deduplication cache
const pendingRequests = new Map<string, Promise<any>>();

// Rate limiting cache
const requestTimestamps = new Map<string, number>();
const MIN_REQUEST_INTERVAL = 1000; // 1 second between identical requests

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second base delay
  maxDelay: 10000, // 10 seconds max delay
  retryableStatusCodes: [503, 502, 504, 0], // 0 for connection errors
  retryableErrors: ['Failed to fetch', 'ERR_CONNECTION_REFUSED', 'ERR_NETWORK', 'timeout']
};

// Retry utility with exponential backoff
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  context: string,
  maxRetries: number = RETRY_CONFIG.maxRetries
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable
      const isRetryable = isRetryableError(error);
      
      if (!isRetryable || attempt === maxRetries) {
        if (attempt === maxRetries && isRetryable) {
          console.warn(`🔄 [${context}] Max retries (${maxRetries}) exceeded for retryable error`);
        }
        throw lastError;
      }
      
      // Calculate delay with exponential backoff and jitter
      const baseDelay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 1000; // Add up to 1 second of jitter
      const delay = Math.min(baseDelay + jitter, RETRY_CONFIG.maxDelay);
      
      console.warn(`🔄 [${context}] Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${Math.round(delay)}ms:`, lastError.message);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

// Check if an error is retryable
const isRetryableError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  
  const errorMessage = error.message.toLowerCase();
  
  // Check for retryable error messages
  const hasRetryableMessage = RETRY_CONFIG.retryableErrors.some(msg => 
    errorMessage.includes(msg.toLowerCase())
  );
  
  // Check for retryable status codes
  const hasRetryableStatus = (error as any)?.statusCode && 
    RETRY_CONFIG.retryableStatusCodes.includes((error as any).statusCode);
  
  return hasRetryableMessage || hasRetryableStatus || isConnectionError(error);
};

const getRequestKey = (endpoint: string, options?: RequestInit): string => {
  const method = options?.method || 'GET';
  const body = options?.body ? JSON.stringify(options.body) : '';
  return `${method}:${endpoint}:${body}`;
};

// Check if request should be throttled
const shouldThrottleRequest = (endpoint: string): boolean => {
  const now = Date.now();
  const lastRequestTime = requestTimestamps.get(endpoint) || 0;
  
  if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
    return true;
  }
  
  requestTimestamps.set(endpoint, now);
  return false;
};

// =============================================================================
// ENVIRONMENT CONFIGURATION
// =============================================================================
// Load configuration from Vite environment variables following ENVIRONMENT_SETUP.md

const getEnvironmentConfig = () => {
  // Get environment variables from Vite's import.meta.env (primary source)
  const getEnvVar = (key: string, fallback?: string): string => {
    // Priority 1: Vite's import.meta.env (for client-side)
    if (typeof window !== 'undefined' && import.meta && (import.meta as any).env && (import.meta as any).env[key]) {
      return (import.meta as any).env[key];
    }
    
    // Priority 2: process.env (for SSR and Node.js)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
    
    // Priority 3: Vite global variables (from vite.config.js define)
    const globalKey = `__${key.replace('VITE_', '')}__`;
    if (typeof window !== 'undefined' && (window as any)[globalKey]) {
      return (window as any)[globalKey];
    }
    
    // Priority 4: Check for Vite environment variables in window object
    if (typeof window !== 'undefined' && (window as any).__VITE_ENV__ && (window as any).__VITE_ENV__[key]) {
      return (window as any).__VITE_ENV__[key];
    }
    
    // Return fallback or empty string
    return fallback || '';
  };

  // Get boolean environment variable
  const getBoolEnvVar = (key: string): boolean => {
    const value = getEnvVar(key);
    if (value === '') return false;
    return value === 'true' || value === '1';
  };

  // Get number environment variable
  const getNumberEnvVar = (key: string): number => {
    const value = getEnvVar(key);
    if (value === '') return 0;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Build configuration object using environment variables
  const config = {
    API_URL: getEnvVar('VITE_API_URL') || getEnvVar('VITE_API_BASE_URL') || 'https://localhost:3000',
    SKIP_BACKEND_CHECK: getBoolEnvVar('VITE_SKIP_BACKEND_CHECK'),
    DEV_MODE: getEnvVar('VITE_DEV_MODE'),
    APP_NAME: getEnvVar('VITE_APP_NAME'),
    APP_VERSION: getEnvVar('VITE_APP_VERSION'),
    PORT: getEnvVar('VITE_PORT'),
    DEV_HTTPS: getBoolEnvVar('VITE_DEV_HTTPS'),
    IS_SSR: getBoolEnvVar('VITE_IS_SSR'),
    MODE: getEnvVar('VITE_MODE'),
    ENABLE_DEV_TOOLS: getBoolEnvVar('ENABLE_DEV_TOOLS'),
    REDUCE_LOGGING: getBoolEnvVar('VITE_REDUCE_LOGGING'),
    API_TIMEOUT: getNumberEnvVar('VITE_API_TIMEOUT'),
    API_RETRY_ATTEMPTS: getNumberEnvVar('VITE_API_RETRY_ATTEMPTS'),
    CACHE_ENABLED: getBoolEnvVar('VITE_CACHE_ENABLED'),
    CACHE_TTL: getNumberEnvVar('VITE_CACHE_TTL'),
    CACHE_MAX_SIZE: getNumberEnvVar('VITE_CACHE_MAX_SIZE'),
    API_KEY_FRONTEND: getApiKey()
  };

  // Ensure API URL has protocol
  if (config.API_URL && !/^https?:\/\//i.test(config.API_URL)) {
    config.API_URL = `http://${config.API_URL}`;
  }

  // Keep development diagnostics minimal and never print secret-related values.
  if (typeof window !== 'undefined' && config.DEV_MODE === 'development') {
    console.log('🔧 [API-CONFIG] Environment Configuration Loaded');
    console.log('   • API_URL:', config.API_URL);
    console.log('   • DEV_MODE:', config.DEV_MODE);
  }

  return config;
};

const ENV_CONFIG = getEnvironmentConfig();

// Update getSigninHost now that ENV_CONFIG is available
const updateSigninHost = (): string => {
  return ENV_CONFIG.API_URL.replace('/api', '/signin') || 'https://localhost:3000/signin';
};

// Development guard: force use real API in development mode
if (typeof window !== 'undefined') {
  const isDev = ENV_CONFIG.DEV_MODE === 'development' || (process.env && process.env.NODE_ENV === 'development');
}


// =============================================================================
// JWT AUTHENTICATION MANAGEMENT
// =============================================================================

interface JWTToken {
  token: string;
  expiresAt: number;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

class JWTAuthManager {
  private static instance: JWTAuthManager;
  private token: JWTToken | null = null;

  private constructor() {
    this.loadStoredToken();
  }

  static getInstance(): JWTAuthManager {
    if (!JWTAuthManager.instance) {
      JWTAuthManager.instance = new JWTAuthManager();
    }
    return JWTAuthManager.instance;
  }

  private loadStoredToken(): void {
    try {
      // Check if we're in a browser environment
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('packmovego_jwt_token');
        if (stored) {
          this.token = JSON.parse(stored);
          // Check if token is expired
          if (this.token && this.token.expiresAt < Date.now()) {
            this.clearToken();
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load stored JWT token:', error);
      this.clearToken();
    }
  }

  setToken(tokenData: JWTToken): void {
    this.token = tokenData;
    try {
      // Check if we're in a browser environment
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('packmovego_jwt_token', JSON.stringify(tokenData));
      }
    } catch (error) {
      console.warn('Failed to store JWT token:', error);
    }
  }

  getToken(): string | null {
    if (!this.token || this.token.expiresAt < Date.now()) {
      this.clearToken();
      return null;
    }
    return this.token.token;
  }

  getUser(): any {
    return this.token?.user || null;
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  clearToken(): void {
    this.token = null;
    try {
      // Check if we're in a browser environment
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('packmovego_jwt_token');
      }
    } catch (error) {
      console.warn('Failed to clear JWT token:', error);
    }
  }

  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  needsRefresh(): boolean {
    if (!this.token) return false;
    // Refresh if token expires in less than 5 minutes
    return this.token.expiresAt - Date.now() < 5 * 60 * 1000;
  }
}

// =============================================================================
// API ENDPOINTS CONFIGURATION
// =============================================================================

export const API_ENDPOINTS = {
  // Authentication endpoints
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    STATUS: '/auth/status',
    REFRESH: '/auth/refresh'
  },
  
  // Public content endpoints (no authentication required)
  // NOTE: Backend actually serves these at /v0/ not /public/
  PUBLIC: {
    NAV: '/v0/nav',
    SERVICES: '/v0/services',
    HEALTH: '/v0/health',
    ABOUT: '/v0/about',
    CONTACT: '/v0/contact',
    REFERRAL: '/v0/referral',
    BLOG: '/v0/blog',
    REVIEWS: '/v0/reviews',
    LOCATIONS: '/v0/locations',
    SUPPLIES: '/v0/supplies',
    TESTIMONIALS: '/v0/testimonials',
    SERVICE_AREAS: '/v0/serviceAreas'
  },
  
  // Private content endpoints (require authentication)
  PRIVATE: {
    NAV: '/v0/nav',
    SERVICES: '/v0/services',
    HEALTH: '/health',
    ABOUT: '/v0/about',
    CONTACT: '/v0/contact',
    REFERRAL: '/v0/referral',
    BLOG: '/v0/blog',
    REVIEWS: '/v0/reviews',
    LOCATIONS: '/v0/locations',
    SUPPLIES: '/v0/supplies',
    TESTIMONIALS: '/v0/testimonials'
  }
};

// =============================================================================
// API CLIENT CLASS
// =============================================================================

export class APIsw {
  private static instance: APIsw;
  private jwtAuth: JWTAuthManager;
  private isDevMode: boolean;
  private modalState: {
    isVisible: boolean;
    failedEndpoints: string[];
    is503Error: boolean;
    onClose: (() => void) | null;
  } = {
    isVisible: false,
    failedEndpoints: [],
    is503Error: false,
    onClose: null
  };
  private modalStateListeners: Set<() => void> = new Set();
  
  // Track API calls for each page
  private pageApiCalls: string[] = [];
  private currentPageName: string = '';
  
  // Error tracking for 503 status testing
  private errorLog: Array<{
    timestamp: number;
    endpoint: string;
    error: string;
    statusCode?: number;
    is503Error: boolean;
    isConnectionError: boolean;
    pageName: string;
  }> = [];
  
  // Cookie consent state
  private isApiBlocked: boolean = false;
  
  // Global API state management
  private apiIsDown: boolean = false;
  private healthCheckInProgress: boolean = false;
  private lastHealthCheckTime: number = 0;
  private healthCheckCooldown: number = 30000; // 30 seconds cooldown between health checks
  
  // Circuit breaker for failed endpoints
  private failedEndpoints: Set<string> = new Set();
  private endpointFailureTimes: Map<string, number> = new Map();
  private endpointCooldown: number = 60000; // 1 minute cooldown for failed endpoints
  
  // Global request blocking when API is down
  private globalRequestBlocked: boolean = false;
  private globalBlockTime: number = 0;
  private globalBlockCooldown: number = 30000; // 30 seconds global block
  
  // Modal cooldown to prevent infinite loops
  private lastModalShowTime: number = 0;
  private modalCooldown: number = 5000; // 5 seconds cooldown between modal shows
  
  // Request deduplication to prevent multiple identical requests
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private requestTimeouts: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.jwtAuth = JWTAuthManager.getInstance();
    this.isDevMode = ENV_CONFIG.DEV_MODE === 'development';
    
    if (this.isDevMode && !ENV_CONFIG.REDUCE_LOGGING) {
      console.log('🔧 APIsw initialized with config:', {
        API_URL: ENV_CONFIG.API_URL,
        SKIP_BACKEND_CHECK: ENV_CONFIG.SKIP_BACKEND_CHECK,
        DEV_MODE: ENV_CONFIG.DEV_MODE,
        PORT: ENV_CONFIG.PORT,
        IS_SSR: ENV_CONFIG.IS_SSR,
        MODE: ENV_CONFIG.MODE,
        ENABLE_DEV_TOOLS: ENV_CONFIG.ENABLE_DEV_TOOLS,
        API_TIMEOUT: ENV_CONFIG.API_TIMEOUT,
        CACHE_ENABLED: ENV_CONFIG.CACHE_ENABLED
      });
    }
  }

  static getInstance(): APIsw {
    if (!APIsw.instance) {
      APIsw.instance = new APIsw();
    }
    return APIsw.instance;
  }

  // =================================================================
  // API BLOCKING METHODS
  // =================================================================

  /**
   * Set API blocking state based on cookie consent
   */
  setApiBlocked(isBlocked: boolean): void {
    this.isApiBlocked = isBlocked;
    if (this.isDevMode && !ENV_CONFIG.REDUCE_LOGGING) {
      console.log(`🚫 API blocking state changed: ${isBlocked ? 'BLOCKED' : 'ALLOWED'}`);
    }
  }

  /**
   * Get current API blocking state
   */
  getApiBlocked(): boolean {
    return this.isApiBlocked;
  }

  /**
   * Middleware to check cookie consent before making API calls
   * Throws error if API calls are blocked due to lack of consent
   */
  checkConsentMiddleware(): void {
    if (this.isApiBlocked) {
      // Create a proper 503 error for cookie consent blocking
      const error = new Error('503 Service Unavailable: API calls blocked due to cookie consent - user must opt in first');
      (error as any).statusCode = 503;
      (error as any).is503Error = true;
      (error as any).isConsentBlocked = true;
      
      console.log('🍪 [CONSENT-BLOCK] API call blocked due to lack of cookie consent');
      throw error;
    }
  }

  /**
   * Consent-aware middleware that checks cookie consent before API calls
   * Only shows API failure modal for actual API errors, not consent issues
   */
  consentAwareMiddleware(endpoint: string, context: string) {
    return async (req: any, res: any, next: any) => {
      try {
        // Check consent first - if blocked, don't proceed with API call
        this.checkConsentMiddleware();
        
        // If consent is given, proceed with the API call
        const result = await next();
        return result;
      } catch (error) {
        console.error(`❌ [CONSENT-MIDDLEWARE] ${context} Error for ${endpoint}:`, error);
        
        // Check if it's a consent error (don't show API failure modal)
        const isConsentError = error instanceof Error && 
          error.message.includes('cookie consent') && 
          error.message.includes('user must opt in first');
        
        if (isConsentError) {
          console.log(`🍪 [CONSENT-MIDDLEWARE] Consent required for ${endpoint} - not showing API failure modal`);
          // Don't show API failure modal for consent issues
          throw error;
        }
        
        // Check if it's a 503 error (show API failure modal)
        const is503Error = error instanceof Error && (
          error.message.includes('503') || 
          error.message.includes('Service Unavailable') ||
          error.message.includes('temporarily unavailable')
        );
        
        if (is503Error) {
          console.log(`🚨 [CONSENT-MIDDLEWARE] 503 Error detected for ${endpoint}, showing API failure modal`);
          
          // Show API failure modal for actual API errors
          this.showApiFailureModal([endpoint], true);
          
          // Create enhanced error with endpoint information
          const enhancedError = new Error(`503 Service Unavailable: ${endpoint}`);
          (enhancedError as any).failedEndpoints = [endpoint];
          (enhancedError as any).attemptedEndpoints = [endpoint];
          (enhancedError as any).primaryError = error;
          
          // Handle the error
          handleApiError(enhancedError, endpoint, {
            context: context,
            showModal: false, // Modal is handled by API service
            logError: true
          });
        } else {
          // Handle other errors
          handleApiError(error, endpoint, {
            context: context,
            showModal: false, // Let page controllers handle modal display
            logError: true
          });
        }
        
        // Re-throw error for further handling
        throw error;
      }
    };
  }

  // =================================================================
  // SIMPLIFIED HEALTH GATE METHODS
  // =================================================================

  /**
   * Check if API is down - simple health check that blocks all calls if API fails
   */
  private async checkApiHealth(): Promise<boolean> {
    const now = Date.now();
    
    // If we already know API is down, check if cooldown period has passed
    if (this.apiIsDown) {
      if (now - this.lastHealthCheckTime < this.healthCheckCooldown) {
        console.log('🔄 [API-HEALTH] API is down, cooldown active - skipping health check');
      return false;
      }
      // Cooldown has passed, reset the down state and try again
      this.apiIsDown = false;
    }

    // If health check is already in progress, wait for it
    if (this.healthCheckInProgress) {
      return false;
    }

    try {
      this.healthCheckInProgress = true;
      this.lastHealthCheckTime = now;
      const healthResult = await this.checkHealth();
      
      // Check if health check returned an error response
      if (healthResult && healthResult.error) {
        this.apiIsDown = true;
        setGlobal503Status(true);
        return false;
      }
      
      this.apiIsDown = false;
      return true;
    } catch (error) {
      this.apiIsDown = true;
      setGlobal503Status(true);
      
      // Don't show modal here - let the calling function handle it
      // The modal should only be shown when we have actual failed endpoints
      return false;
    } finally {
      this.healthCheckInProgress = false;
    }
  }

  /**
   * Reset API health status (call when user retries or navigates to new page)
   */
  resetHealthGate(): void {
    this.apiIsDown = false;
    this.healthCheckInProgress = false;
    this.lastHealthCheckTime = 0;
    this.failedEndpoints.clear();
    this.endpointFailureTimes.clear();
    this.globalRequestBlocked = false;
    this.globalBlockTime = 0;
    
    // Clear all pending requests
    this.pendingRequests.clear();
    this.requestTimeouts.forEach(timeout => clearTimeout(timeout));
    this.requestTimeouts.clear();
    
  }

  /**
   * Check if an endpoint is in circuit breaker state
   */
  private isEndpointInCircuitBreaker(endpoint: string): boolean {
    if (!this.failedEndpoints.has(endpoint)) {
      return false;
    }
    
    const failureTime = this.endpointFailureTimes.get(endpoint) || 0;
    const now = Date.now();
    
    if (now - failureTime > this.endpointCooldown) {
      // Cooldown has passed, remove from circuit breaker
      this.failedEndpoints.delete(endpoint);
      this.endpointFailureTimes.delete(endpoint);
      return false;
    }
    
    return true;
  }

  /**
   * Add an endpoint to the circuit breaker
   */
  private addEndpointToCircuitBreaker(endpoint: string): void {
    this.failedEndpoints.add(endpoint);
    this.endpointFailureTimes.set(endpoint, Date.now());
  }

  /**
   * Check if global request blocking is active
   */
  private isGlobalRequestBlocked(): boolean {
    if (!this.globalRequestBlocked) {
      return false;
    }
    
    const now = Date.now();
    if (now - this.globalBlockTime > this.globalBlockCooldown) {
      // Cooldown has passed, reset global block
      this.globalRequestBlocked = false;
      this.globalBlockTime = 0;
      return false;
    }
    
    return true;
  }

  /**
   * Activate global request blocking
   */
  private activateGlobalRequestBlock(): void {
    this.globalRequestBlocked = true;
    this.globalBlockTime = Date.now();
  }

  /**
   * Get a unique request key for deduplication
   */
  private getRequestKey(endpoint: string, options: RequestInit = {}): string {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    return `${method}:${endpoint}:${body}`;
  }

  /**
   * Check if a request is already pending
   */
  private isRequestPending(requestKey: string): boolean {
    return this.pendingRequests.has(requestKey);
  }

  /**
   * Add a pending request
   */
  private addPendingRequest<T>(requestKey: string, promise: Promise<T>): Promise<T> {
    this.pendingRequests.set(requestKey, promise);
    
    // Set a timeout to clean up the request after 30 seconds
    const timeout = setTimeout(() => {
      this.pendingRequests.delete(requestKey);
      this.requestTimeouts.delete(requestKey);
    }, 30000);
    
    this.requestTimeouts.set(requestKey, timeout);
    
    return promise;
  }

  /**
   * Remove a pending request
   */
  private removePendingRequest(requestKey: string): void {
    this.pendingRequests.delete(requestKey);
    
    const timeout = this.requestTimeouts.get(requestKey);
    if (timeout) {
      clearTimeout(timeout);
      this.requestTimeouts.delete(requestKey);
    }
  }

  // =================================================================
  // CORE API METHODS
  // =================================================================

  async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth: boolean = false
  ): Promise<T> {
    return await this.makeRequestInternal<T>(endpoint, options, requireAuth);
  }

  async makeRequestInternal<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth: boolean = false
  ): Promise<T> {
    // Track this API call
    this.trackApiCall(endpoint);
    
    // Check global 503 status first - if API is globally down, return 503 immediately
    if (isApiGlobally503()) {
      const error = new Error(`503 Service Unavailable: API is globally unavailable`);
      (error as any).statusCode = 503;
      (error as any).is503Error = true;
      
      // Show API failure modal for global 503 status
      this.showApiFailureModal([endpoint], true);
      
      throw error;
    }

    // Check for request deduplication
    const requestKey = this.getRequestKey(endpoint, options);
    if (this.isRequestPending(requestKey)) {
      return this.pendingRequests.get(requestKey) as Promise<T>;
    }

    // Check global request blocking first (except for health endpoint itself)
    if (endpoint !== '/v0/health' && this.isGlobalRequestBlocked()) {
      const error = new Error(`503 Service Unavailable: API is temporarily unavailable (global block)`);
      (error as any).statusCode = 503;
      (error as any).is503Error = true;
      (error as any).isGlobalBlock = true;
      
      console.log(`🚫 [GLOBAL-BLOCK] Blocking request to ${endpoint} - global block active`);
      
      // Show API failure modal for global request blocking
      this.showApiFailureModal([endpoint], true);
      
      throw error;
    }

    // Check circuit breaker first (except for health endpoint itself)
    if (endpoint !== '/v0/health' && this.isEndpointInCircuitBreaker(endpoint)) {
      const error = new Error(`503 Service Unavailable: ${endpoint} is temporarily unavailable (circuit breaker)`);
      (error as any).statusCode = 503;
      (error as any).is503Error = true;
      (error as any).isCircuitBreaker = true;
      
      console.log(`🔒 [CIRCUIT-BREAKER] Blocking request to ${endpoint} - in cooldown period`);
      
      // Show API failure modal for circuit breaker
      this.showApiFailureModal([endpoint], true);
      
      throw error;
    }

    // Check cookie consent middleware FIRST (except for health endpoint itself)
    if (endpoint !== '/v0/health') {
      this.checkConsentMiddleware();
    }

    // Check API health second (except for health endpoint itself)
    if (endpoint !== '/v0/health' && !await this.checkApiHealth()) {
      // Activate global request blocking
      this.activateGlobalRequestBlock();
      
      // Add endpoint to circuit breaker
      this.addEndpointToCircuitBreaker(endpoint);
      
      // Create a proper 503 error that can be handled by the calling function
      const error = new Error('503 Service Unavailable: API health check failed');
      (error as any).statusCode = 503;
      (error as any).is503Error = true;
      
      // Show API failure modal for health check failures
      this.showApiFailureModal([endpoint], true);
      
      throw error;
    }

    const buildUrl = (base: string, ep: string) => {
      const baseTrimmed = base.replace(/\/+$/, '');
      const epTrimmed = ep.startsWith('/') ? ep : `/${ep}`;
      return `${baseTrimmed}${epTrimmed}`;
    };

    // Use only the correct endpoint - no fallbacks since backend is working
    const url = buildUrl(ENV_CONFIG.API_URL, endpoint);

    // Create the actual request promise with retry for critical endpoints
    const requestPromise = this.executeRequestWithRetry<T>(url, endpoint, options, requireAuth);
    
    // Add to pending requests for deduplication
    const deduplicatedPromise = this.addPendingRequest(requestKey, requestPromise);
    
    // Clean up when the request completes
    deduplicatedPromise.finally(() => {
      this.removePendingRequest(requestKey);
    });
    
    return deduplicatedPromise;
  }

  private async executeRequestWithRetry<T>(
    url: string,
    endpoint: string,
    options: RequestInit,
    requireAuth: boolean
  ): Promise<T> {
    // Determine if this endpoint should use retry
    const shouldRetry = this.shouldRetryEndpoint(endpoint);
    
    if (shouldRetry) {
      return await retryWithBackoff(async () => {
        return await this.executeRequestWithDeduplication<T>(url, endpoint, options, requireAuth);
      }, `API Request: ${endpoint}`);
    } else {
    return await this.executeRequestWithDeduplication<T>(url, endpoint, options, requireAuth);
    }
  }

  private shouldRetryEndpoint(endpoint: string): boolean {
    // Retry critical endpoints that are essential for app functionality
    const criticalEndpoints = [
      '/v0/health',
      '/v0/locations',
      '/v0/service-areas',
      '/v0/services',
      '/v0/supplies'
    ];
    
    return criticalEndpoints.some(critical => endpoint.includes(critical));
  }

  private async executeRequestWithDeduplication<T>(
    url: string,
    endpoint: string,
    options: RequestInit,
    requireAuth: boolean
  ): Promise<T> {
    // Track this API call (only once per actual request)
    this.trackApiCall(endpoint);

    // Request deduplication
    const requestKey = getRequestKey(endpoint, options);
    
    // Check if there's already a pending request for this endpoint
    if (pendingRequests.has(requestKey)) {
      if (this.isDevMode && !ENV_CONFIG.REDUCE_LOGGING) {
        console.log(`🔄 Reusing pending request: ${endpoint}`);
      }
      return pendingRequests.get(requestKey) as Promise<T>;
    }

    // Check rate limiting
    if (shouldThrottleRequest(endpoint)) {
      if (this.isDevMode && !ENV_CONFIG.REDUCE_LOGGING) {
        console.log(`⏳ Throttling request to ${endpoint} (rate limited)`);
      }
      // Wait for the minimum interval before making the request
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL));
    }

    // Create the actual request
    const requestPromise = this.executeRequest<T>(url, options, requireAuth);
    
    // Store the pending request
    pendingRequests.set(requestKey, requestPromise);

    // Clean up after request completes
    requestPromise.finally(() => {
      pendingRequests.delete(requestKey);
    });

    return requestPromise;
  }

  // Public API request method that doesn't redirect on 503 errors
  async makePublicRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return await this.makePublicRequestInternal<T>(endpoint, options);
  }

  async makePublicRequestInternal<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Track this API call
    this.trackApiCall(endpoint);
    
    // Check global 503 status first - if API is globally down, return 503 immediately
    if (isApiGlobally503()) {
      const error = new Error(`503 Service Unavailable: API is globally unavailable`);
      (error as any).statusCode = 503;
      (error as any).is503Error = true;
      
      // Show API failure modal for global 503 status
      this.showApiFailureModal([endpoint], true);
      
      throw error;
    }

    // Check for request deduplication first
    const requestKey = this.getRequestKey(endpoint, options);
    if (this.isRequestPending(requestKey)) {
      return this.pendingRequests.get(requestKey) as Promise<T>;
    }

    // Check global request blocking first (except for health endpoint itself)
    if (endpoint !== '/v0/health' && this.isGlobalRequestBlocked()) {
      const error = new Error(`503 Service Unavailable: API is temporarily unavailable (global block)`);
      (error as any).statusCode = 503;
      (error as any).is503Error = true;
      (error as any).isGlobalBlock = true;
      
      console.log(`🚫 [GLOBAL-BLOCK] Blocking public request to ${endpoint} - global block active`);
      throw error;
    }

    // Check circuit breaker first (except for health endpoint itself)
    if (endpoint !== '/v0/health' && this.isEndpointInCircuitBreaker(endpoint)) {
      const error = new Error(`503 Service Unavailable: ${endpoint} is temporarily unavailable (circuit breaker)`);
      (error as any).statusCode = 503;
      (error as any).is503Error = true;
      (error as any).isCircuitBreaker = true;
      
      console.log(`🔒 [CIRCUIT-BREAKER] Blocking public request to ${endpoint} - in cooldown period`);
      throw error;
    }

    // Check cookie consent middleware FIRST (except for health endpoint itself)
    if (endpoint !== '/v0/health') {
      this.checkConsentMiddleware();
    }

    // Check API health second (except for health endpoint itself)
    if (endpoint !== '/v0/health' && !await this.checkApiHealth()) {
      // Activate global request blocking
      this.activateGlobalRequestBlock();
      
      // Add endpoint to circuit breaker
      this.addEndpointToCircuitBreaker(endpoint);
      
      // Create a proper 503 error that can be handled by the calling function
      const error = new Error('503 Service Unavailable: API health check failed');
      (error as any).statusCode = 503;
      (error as any).is503Error = true;
      
      // Show API failure modal for health check failures
      this.showApiFailureModal([endpoint], true);
      
      throw error;
    }

    const buildUrl = (base: string, ep: string) => {
      const baseTrimmed = base.replace(/\/+$/, '');
      const epTrimmed = ep.startsWith('/') ? ep : `/${ep}`;
      return `${baseTrimmed}${epTrimmed}`;
    };

    const url = buildUrl(ENV_CONFIG.API_URL, endpoint);

    // Create the actual request promise and add it to pending requests
    const requestPromise = this.executePublicRequest<T>(url, options);
    
    // Add to pending requests for deduplication
    const deduplicatedPromise = this.addPendingRequest(requestKey, requestPromise);
    
    // Clean up when the request completes
    deduplicatedPromise.finally(() => {
      this.removePendingRequest(requestKey);
    });
    
    return deduplicatedPromise;
  }

  private async executeRequest<T>(
    url: string,
    options: RequestInit,
    requireAuth: boolean
  ): Promise<T> {
    const apiKey = getApiKey();
    
    if (this.isDevMode && !ENV_CONFIG.REDUCE_LOGGING) {
      console.log('🔑 API Request:', { url, hasApiKey: !!apiKey });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    
    // Only set restricted headers in SSR (Node). Browsers block these.
    if (typeof window === 'undefined') {
      headers['User-Agent'] = `${ENV_CONFIG.APP_NAME}-Client/${ENV_CONFIG.APP_VERSION}`;
      headers['Origin'] = `${ENV_CONFIG.DEV_HTTPS ? 'https' : 'http'}://localhost:${ENV_CONFIG.PORT}`;
    }

    // Add JWT token if required and available
    if (requireAuth) {
      const authHeaders = this.jwtAuth.getAuthHeaders();
      Object.assign(headers, authHeaders);
    }

    const config: RequestInit = {
      method: 'GET',
      headers,
      credentials: 'include',
      ...options
    };

    const tryFetch = async (url: string): Promise<Response> => {
      if (this.isDevMode && !ENV_CONFIG.REDUCE_LOGGING) {
        console.log(`🌐 API Request: ${url}`);
      }
      
      try {
        const response = await fetch(url, config);
        
        // Check for redirect responses (301, 302, 307, 308)
        if (response.redirected || [301, 302, 307, 308].includes(response.status)) {
          console.error('🚨 [REDIRECT-ERROR] API returned redirect:', {
            url,
            redirected: response.redirected,
            status: response.status,
            redirectedTo: response.url
          });
          
          // Create a mock 503 response for redirect errors
          const mockResponse = new Response(
            JSON.stringify({
              error: true,
              statusCode: 503,
              message: 'Service Unavailable: API endpoint redirected (backend misconfiguration)',
              is503Error: true,
              isRedirectError: true,
              redirectedTo: response.url
            }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );
          
          return mockResponse;
        }
        
        return response;
      } catch (fetchError) {
        // Check for CORS redirect errors
        if (fetchError instanceof TypeError && 
            (fetchError.message.includes('Redirect is not allowed') || 
             fetchError.message.includes('CORS policy'))) {
          console.error('🚨 [CORS-REDIRECT-ERROR] CORS redirect error detected:', fetchError.message);
          
          // Create a mock 503 response for CORS redirect errors
          const mockResponse = new Response(
            JSON.stringify({
              error: true,
              statusCode: 503,
              message: 'Service Unavailable: CORS redirect error (backend misconfiguration)',
              is503Error: true,
              isRedirectError: true,
              isCorsError: true
            }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );
          
          return mockResponse;
        }
        
        // Instead of throwing, return a mock 503 response
        if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
          // Create a mock Response object with 503 status
          const mockResponse = new Response(
            JSON.stringify({
              error: true,
              statusCode: 503,
              message: 'Service Unavailable: Connection failed',
              is503Error: true,
              isConnectionError: true
            }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );
          
          return mockResponse;
        }
        throw fetchError;
      }
    };

    try {
      const response = await tryFetch(url);
      if (response.ok) {
        const data = await response.json();
        if (this.isDevMode && !ENV_CONFIG.REDUCE_LOGGING) {
          console.log(`✅ API Success (${url}):`, data);
        }
        // Special debugging for locations
        if (url.includes('/v0/locations')) {
          console.log('🔧 Locations API response details:', {
            url,
            status: response.status,
            dataType: typeof data,
            hasLocations: !!(data && data.locations),
            hasServiceTypes: !!(data && data.serviceTypes),
            dataKeys: data ? Object.keys(data) : []
          });
        }
        return data;
      } else {
        // Handle 503 responses gracefully
        if (response.status === 503) {
          // Set global 503 status when we get a 503 response
          setGlobal503Status(true);
          
          const data = await response.json();
          return data; // Return the 503 error data instead of throwing
        }
        
        const errorMessage = await this.handleErrorResponse(response);
        throw new Error(errorMessage);
      }
    } catch (error) {
      // Check if this is a connection error that should be treated as 503
      if (isConnectionError(error)) {
        // Set global 503 status for connection errors
        setGlobal503Status(true);
        
        // Create a 503 error response
        const error503 = createConnectionError(endpoint, error);
        return {
          error: true,
          statusCode: 503,
          message: error503.message,
          is503Error: true,
          isConnectionError: true
        };
      }
      
      // Check if this is already a 503 error
      if (is503Error(error)) {
        // Set global 503 status for 503 errors
        setGlobal503Status(true);
        
        return {
          error: true,
          statusCode: 503,
          message: (error as Error).message,
          is503Error: true,
          isConnectionError: (error as any)?.isConnectionError || false
        };
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  private async executePublicRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-api-key': getApiKey()
    };
    
    if (this.isDevMode && !ENV_CONFIG.REDUCE_LOGGING) {
      const apiKey = getApiKey();
      console.log('🔑 Public API Key Configuration:', { hasApiKey: !!apiKey });
    }
    
    // Only set restricted headers in SSR (Node). Browsers block these.
    if (typeof window === 'undefined') {
      headers['User-Agent'] = `${ENV_CONFIG.APP_NAME}-Client/${ENV_CONFIG.APP_VERSION}`;
      headers['Origin'] = `${ENV_CONFIG.DEV_HTTPS ? 'https' : 'http'}://localhost:${ENV_CONFIG.PORT}`;
    }

    const config: RequestInit = {
      method: 'GET',
      headers,
      credentials: 'include',
      ...options
    };

    const tryFetch = async (url: string): Promise<Response> => {
      if (this.isDevMode && !ENV_CONFIG.REDUCE_LOGGING) {
        console.log(`🌐 Public API Request: ${url}`);
      }
      
      try {
        const response = await fetch(url, config);
        
        // Check for redirect responses (301, 302, 307, 308)
        if (response.redirected || [301, 302, 307, 308].includes(response.status)) {
          console.error('🚨 [REDIRECT-ERROR] Public API returned redirect:', {
            url,
            redirected: response.redirected,
            status: response.status,
            redirectedTo: response.url
          });
          
          // Create a mock 503 response for redirect errors
          const mockResponse = new Response(
            JSON.stringify({
              error: true,
              statusCode: 503,
              message: 'Service Unavailable: API endpoint redirected (backend misconfiguration)',
              is503Error: true,
              isRedirectError: true,
              redirectedTo: response.url
            }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );
          
          return mockResponse;
        }
        
        return response;
      } catch (fetchError) {
        // Check for CORS redirect errors
        if (fetchError instanceof TypeError && 
            (fetchError.message.includes('Redirect is not allowed') || 
             fetchError.message.includes('CORS policy'))) {
          console.error('🚨 [CORS-REDIRECT-ERROR] CORS redirect error detected:', fetchError.message);
          
          // Create a mock 503 response for CORS redirect errors
          const mockResponse = new Response(
            JSON.stringify({
              error: true,
              statusCode: 503,
              message: 'Service Unavailable: CORS redirect error (backend misconfiguration)',
              is503Error: true,
              isRedirectError: true,
              isCorsError: true
            }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );
          
          return mockResponse;
        }
        
        // Instead of throwing, return a mock 503 response
        if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
          // Create a mock Response object with 503 status
          const mockResponse = new Response(
            JSON.stringify({
              error: true,
              statusCode: 503,
              message: 'Service Unavailable: Connection failed',
              is503Error: true,
              isConnectionError: true
            }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );
          
          return mockResponse;
        }
        throw fetchError;
      }
    };

    try {
      const response = await tryFetch(url);
      if (response.ok) {
        const data = await response.json();
        if (this.isDevMode && !ENV_CONFIG.REDUCE_LOGGING) {
          console.log(`✅ Public API Success (${url}):`, data);
        }
        return data;
      } else {
        // Handle 503 responses gracefully
        if (response.status === 503) {
          // Set global 503 status when we get a 503 response
          setGlobal503Status(true);
          
          const data = await response.json();
          return data; // Return the 503 error data instead of throwing
        }
        
        const errorMessage = await this.handlePublicErrorResponse(response);
        throw new Error(errorMessage);
      }
    } catch (error) {
      // Check if this is a connection error that should be treated as 503
      if (isConnectionError(error)) {
        // Set global 503 status for connection errors
        setGlobal503Status(true);
        
        // Create a 503 error response
        const error503 = createConnectionError(endpoint, error);
        return {
          error: true,
          statusCode: 503,
          message: error503.message,
          is503Error: true,
          isConnectionError: true
        };
      }
      
      // Check if this is already a 503 error
      if (is503Error(error)) {
        // Set global 503 status for 503 errors
        setGlobal503Status(true);
        
        return {
          error: true,
          statusCode: 503,
          message: (error as Error).message,
          is503Error: true,
          isConnectionError: (error as any)?.isConnectionError || false
        };
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  async handlePublicErrorResponse(response: Response): Promise<string> {
    try {
      const errorData = await response.json();
      const errorMessage = errorData.message || response.statusText;
      
      // Handle 503 errors for public APIs - don't redirect, just return error
      if (response.status === 503) {
        if (this.isDevMode && !ENV_CONFIG.REDUCE_LOGGING) {
          console.warn('⚠️ Public API returned 503 - Service Unavailable');
        }
        return `HTTP 503: ${errorMessage}`;
      }
      
      // Handle other errors normally
      return `HTTP ${response.status}: ${errorMessage}`;
    } catch {
      return `HTTP ${response.status}: ${response.statusText}`;
    }
  }

  async handleErrorResponse(response: Response): Promise<string> {
    try {
      const errorData = await response.json();
      const errorMessage = errorData.message || response.statusText;
      
      // Handle 503 Service Unavailable specifically
      if (response.status === 503) {
        console.warn('⚠️ API returned 503 - Service Unavailable');
        const endpoint = response.url.replace(ENV_CONFIG.API_URL, '');
        const error = new Error(`HTTP 503: ${errorMessage}`);
        handleApiError(error, endpoint, {
          context: 'APIsw Service',
          showModal: false, // Let page controllers handle modal display
          logError: true
        });
        return `Service temporarily unavailable (503): ${errorMessage}`;
      }
      
      // Handle authentication errors (403) - redirect to signin
      if (response.status === 403) {
        if (this.isDevMode && !ENV_CONFIG.REDUCE_LOGGING) {
          console.warn('🔐 Authentication failed, redirecting to signin');
        }
        this.redirectToSignin();
        return `Authentication required: ${errorMessage}`;
      }
      
      // Handle rate limiting specifically
      if (response.status === 429 || errorMessage.includes('Too many requests')) {
        if (this.isDevMode && !ENV_CONFIG.REDUCE_LOGGING) {
          console.warn('⚠️ Rate limited by backend. Consider enabling development API override.');
        }
        return `Rate limited: ${errorMessage}`;
      }
      
      return `HTTP ${response.status}: ${errorMessage}`;
    } catch {
      // Handle 503 even when JSON parsing fails
      if (response.status === 503) {
        console.warn('⚠️ API returned 503 - Service Unavailable (no JSON response)');
        const endpoint = response.url.replace(ENV_CONFIG.API_URL, '');
        const error = new Error(`HTTP 503: ${response.statusText}`);
        handleApiError(error, endpoint, {
          context: 'APIsw Service',
          showModal: false, // Let page controllers handle modal display
          logError: true
        });
        return `Service temporarily unavailable (503): ${response.statusText}`;
      }
      
      return `HTTP ${response.status}: ${response.statusText}`;
    }
  }

  private redirectToSignin(): void {
    try {
      const signinHost = updateSigninHost();
      if (typeof window !== 'undefined' && signinHost) {
        console.log('🔐 Redirecting to signin:', signinHost);
        window.location.href = signinHost;
      }
    } catch (error) {
      console.error('❌ Failed to redirect to signin:', error);
    }
  }

  // =================================================================
  // AUTHENTICATION METHODS
  // =================================================================

  async login(email: string, password: string): Promise<any> {
    try {
      const response = await this.makeRequest<any>(API_ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (response && response.success && response.token) {
        // Store JWT token with expiration
        const expiresAt = Date.now() + (response.expiresIn || 3600000); // Default 1 hour
        this.jwtAuth.setToken({
          token: response.token,
          expiresAt,
          user: response.user
        });

        if (this.isDevMode && !ENV_CONFIG.REDUCE_LOGGING) {
          console.log('🔐 Login successful, JWT token stored');
        }
      }

      return response;
    } catch (error) {
      if (this.isDevMode && !ENV_CONFIG.REDUCE_LOGGING) {
        console.error('🔐 Login failed:', error);
      }
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      // Call logout endpoint to invalidate token on server
      await this.makeRequest(API_ENDPOINTS.AUTH.LOGOUT, {
        method: 'POST'
      }, true);
    } catch (error) {
      if (this.isDevMode && !ENV_CONFIG.REDUCE_LOGGING) {
        console.warn('⚠️ Server logout failed, but clearing local data:', error);
      }
    } finally {
      // Always clear local token
      this.jwtAuth.clearToken();
    }
  }

  async checkAuthStatus(): Promise<any> {
    // Check cache first
    const cached = apiCache.getCachedApiResponse<any>(API_ENDPOINTS.AUTH.STATUS);
    if (cached) {
      console.log('✅ Using cached auth status data');
      return cached;
    }

    try {
      const result = await this.makeRequest(API_ENDPOINTS.AUTH.STATUS, {}, true);
      
      // Cache the successful response for 2 minutes (auth status changes frequently)
      if (result) {
        apiCache.cacheApiResponse(API_ENDPOINTS.AUTH.STATUS, result, 2 * 60 * 1000);
        console.log('📦 Cached auth status data');
      }
      
      return result;
    } catch (error) {
      return { success: false, message: 'Not authenticated' };
    }
  }

  // =================================================================
  // BATCH API METHODS (Load multiple endpoints at once)
  // =================================================================

  async loadInitialData(): Promise<{
    nav: any;
    services: any;
    authStatus: any;
  }> {
    try {
      if (this.isDevMode && !ENV_CONFIG.REDUCE_LOGGING) {
        console.log('🚀 Loading initial data (batch request)...');
      }

      // Load all initial data concurrently
      const [navData, servicesData, authStatus] = await Promise.allSettled([
        this.getNav(),
        this.getServices(),
        this.checkAuthStatus()
      ]);

      const result = {
        nav: navData.status === 'fulfilled' ? navData.value : null,
        services: servicesData.status === 'fulfilled' ? servicesData.value : null,
        authStatus: authStatus.status === 'fulfilled' ? authStatus.value : null
      };

      if (this.isDevMode && !ENV_CONFIG.REDUCE_LOGGING) {
        console.log('✅ Initial data loaded:', {
          nav: !!result.nav,
          services: !!result.services,
          authStatus: !!result.authStatus
        });
      }

      return result;
    } catch (error) {
      if (this.isDevMode && !ENV_CONFIG.REDUCE_LOGGING) {
        console.error('❌ Failed to load initial data:', error);
      }
      throw error;
    }
  }

  // =================================================================
  // PUBLIC CONTENT ENDPOINTS (No auth required)
  // =================================================================

  async getNav(): Promise<any> {
    // Check cache first
    const cached = apiCache.getCachedApiResponse<any>(API_ENDPOINTS.PRIVATE.NAV);
    if (cached) {
      console.log('✅ Using cached navigation data');
      return cached;
    }

    // If not cached, make API call
    const result = await this.makeRequest(API_ENDPOINTS.PRIVATE.NAV);
    
    // Cache the successful response for 10 minutes
    if (result) {
      apiCache.cacheApiResponse(API_ENDPOINTS.PRIVATE.NAV, result, 10 * 60 * 1000);
      console.log('📦 Cached navigation data');
    }
    
    return result;
  }

  async getServices(): Promise<any> {
    // Check cache first
    const cached = apiCache.getCachedApiResponse<any>(API_ENDPOINTS.PUBLIC.SERVICES);
    if (cached) {
      return cached;
    }

    // If not cached, make API call
    const result = await this.makeRequest(API_ENDPOINTS.PUBLIC.SERVICES);
    
    // Cache the successful response for 10 minutes
    if (result) {
      apiCache.cacheApiResponse(API_ENDPOINTS.PUBLIC.SERVICES, result, 10 * 60 * 1000);
    }
    
    return result;
  }

  async checkHealth(): Promise<any> {
    // Check cache first
    const cached = apiCache.getCachedApiResponse<any>('/v0/health');
    if (cached) {
      return cached;
    }

    try {
      // Use retry mechanism for health checks
      const result = await retryWithBackoff(async () => {
        return await this.makeRequest('/v0/health');
      }, 'Health Check');
    
      // Cache the successful response for 30 seconds (health checks frequently)
      if (result) {
        apiCache.cacheApiResponse('/v0/health', result, 30 * 1000);
      }
      
      return result;
    } catch (error) {
      // Normalize connection errors to 503
      const normalizedError = normalizeTo503Error(error, '/v0/health');
      
      // Always set global 503 status when health check fails
      setGlobal503Status(true);
      
      // Log the health check error
      this.logError('/v0/health', normalizedError, 503, true, (normalizedError as any)?.isConnectionError || false);
      
      if (is503Error(normalizedError)) {
        // Instead of throwing, return a 503 error response
        return {
          error: true,
          statusCode: 503,
          message: normalizedError.message,
          is503Error: true,
          isConnectionError: (normalizedError as any)?.isConnectionError || false
        };
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  // =================================================================
  // PUBLIC DATA SERVICES (No authentication required)
  // =================================================================

  async getReferral(): Promise<any> {
    return await this.makeRequest(API_ENDPOINTS.PUBLIC.REFERRAL);
  }

  async getBlog(): Promise<any> {
    return await this.makeRequest(API_ENDPOINTS.PUBLIC.BLOG);
  }

  async getReviews(): Promise<any> {
    return await this.makeRequest(API_ENDPOINTS.PUBLIC.REVIEWS);
  }

  async getLocations(): Promise<any> {
    // Check cache first
    const cached = apiCache.getCachedApiResponse<any>(API_ENDPOINTS.PUBLIC.LOCATIONS);
    if (cached) {
      console.log('✅ Using cached locations data');
      return cached;
    }

    // If not cached, make API call
    console.log('🔧 APIsw.getLocations() called - fetching from:', API_ENDPOINTS.PUBLIC.LOCATIONS);
    const result = await this.makeRequest(API_ENDPOINTS.PUBLIC.LOCATIONS);
    
    // Cache the successful response for 15 minutes (locations change infrequently)
    if (result) {
      apiCache.cacheApiResponse(API_ENDPOINTS.PUBLIC.LOCATIONS, result, 15 * 60 * 1000);
      console.log('📦 Cached locations data');
    }
    
    console.log('🔧 APIsw.getLocations() response:', {
      hasData: !!result,
      hasLocations: !!(result && (result as any).locations),
      hasServiceTypes: !!(result && (result as any).serviceTypes),
      locationsCount: (result as any)?.locations?.length || 0,
      serviceTypesCount: (result as any)?.serviceTypes?.length || 0
    });
    return result;
  }

  async getSupplies(): Promise<any> {
    // Check cache first
    const cached = apiCache.getCachedApiResponse<any>(API_ENDPOINTS.PUBLIC.SUPPLIES);
    if (cached) {
      console.log('✅ Using cached supplies data');
      return cached;
    }

    // If not cached, make API call
    console.log('🔧 APIsw.getSupplies() called - fetching from:', API_ENDPOINTS.PUBLIC.SUPPLIES);
    const result = await this.makeRequest(API_ENDPOINTS.PUBLIC.SUPPLIES);
    
    // Cache the successful response for 10 minutes
    if (result) {
      apiCache.cacheApiResponse(API_ENDPOINTS.PUBLIC.SUPPLIES, result, 10 * 60 * 1000);
      console.log('📦 Cached supplies data');
    }
    
    console.log('🔧 APIsw.getSupplies() response:', {
      hasData: !!result,
      hasSupplies: !!(result && (result as any).supplies),
      suppliesCount: (result as any)?.supplies?.length || 0,
      firstSupplyStructure: (result as any)?.supplies?.[0]
    });
    return result;
  }


  async getServiceAreas(): Promise<any> {
    return await this.makePublicRequest(API_ENDPOINTS.PUBLIC.SERVICE_AREAS);
  }



  async getAbout(): Promise<any> {
    return await this.makeRequest(API_ENDPOINTS.PUBLIC.ABOUT);
  }

  async getContact(): Promise<any> {
    return await this.makeRequest(API_ENDPOINTS.PUBLIC.CONTACT);
  }

  // =================================================================
  // PRIVATE DATA SERVICES (Require authentication)
  // =================================================================

  async getPrivateNav(): Promise<any> {
    return await this.makeRequest(API_ENDPOINTS.PRIVATE.NAV, {}, true);
  }

  async getPrivateServices(): Promise<any> {
    return await this.makeRequest(API_ENDPOINTS.PRIVATE.SERVICES, {}, true);
  }

  async getPrivateLocations(): Promise<any> {
    return await this.makeRequest(API_ENDPOINTS.PRIVATE.LOCATIONS, {}, true);
  }

  async getPrivateSupplies(): Promise<any> {
    return await this.makeRequest(API_ENDPOINTS.PRIVATE.SUPPLIES, {}, true);
  }

  async getPrivateReviews(): Promise<any> {
    return await this.makeRequest(API_ENDPOINTS.PRIVATE.REVIEWS, {}, true);
  }

  async getPrivateTestimonials(): Promise<any> {
    return await this.makeRequest(API_ENDPOINTS.PRIVATE.TESTIMONIALS, {}, true);
  }

  async getPrivateAbout(): Promise<any> {
    return await this.makeRequest(API_ENDPOINTS.PRIVATE.ABOUT, {}, true);
  }

  async getPrivateContact(): Promise<any> {
    return await this.makeRequest(API_ENDPOINTS.PRIVATE.CONTACT, {}, true);
  }

  async getPrivateReferral(): Promise<any> {
    return await this.makeRequest(API_ENDPOINTS.PRIVATE.REFERRAL, {}, true);
  }

  async getPrivateBlog(): Promise<any> {
    return await this.makeRequest(API_ENDPOINTS.PRIVATE.BLOG, {}, true);
  }

  // =================================================================
  // CONSOLIDATED PAGE API METHODS
  // =================================================================

  /**
   * Get all home page data in a single consolidated call
   * Returns an object with all home page data
   */
  async getHomePageData(): Promise<{
    services: any;
    recentMoves: any;
    testimonials: any;
    nav: any;
    authStatus: any;
  }> {
    console.log('🚀 Loading consolidated home page data...');
    
    // Define all endpoints that will be called for home page
    const homePageEndpoints = [
      '/v0/services',
      '/v0/recentMoves', 
      '/v0/testimonials',
      '/v0/nav',
      '/auth/status'
    ];
    
    // Load all home page data concurrently
    const [services, recentMoves, testimonials, nav, authStatus] = await Promise.allSettled([
      this.makeRequest(API_ENDPOINTS.PRIVATE.SERVICES), // /v0/services
      this.makeRequest('/v0/recentMoves'), // /v0/recentMoves  
      this.makeRequest(API_ENDPOINTS.PRIVATE.TESTIMONIALS), // /v0/testimonials
      this.makeRequest(API_ENDPOINTS.PRIVATE.NAV), // /v0/nav
      this.checkAuthStatus()
    ]);

    const result = {
      services: services.status === 'fulfilled' ? services.value : null,
      recentMoves: recentMoves.status === 'fulfilled' ? recentMoves.value : null,
      testimonials: testimonials.status === 'fulfilled' ? testimonials.value : null,
      nav: nav.status === 'fulfilled' ? nav.value : null,
      authStatus: authStatus.status === 'fulfilled' ? authStatus.value : null
    };

    // Check for failed endpoints and collect error details
    const failedEndpoints: string[] = [];
    const errors: any[] = [];

    if (services.status === 'rejected') {
      failedEndpoints.push('/v0/services');
      errors.push(services.reason);
    }
    if (recentMoves.status === 'rejected') {
      failedEndpoints.push('/v0/recentMoves');
      errors.push(recentMoves.reason);
    }
    if (testimonials.status === 'rejected') {
      failedEndpoints.push('/v0/testimonials');
      errors.push(testimonials.reason);
    }
    if (nav.status === 'rejected') {
      failedEndpoints.push('/v0/nav');
      errors.push(nav.reason);
    }
    if (authStatus.status === 'rejected') {
      failedEndpoints.push('/auth/status');
      errors.push(authStatus.reason);
    }

    // If any endpoints failed, throw a comprehensive error
    if (failedEndpoints.length > 0) {
      const primaryError = errors[0];
      const errorMessage = `Home page API failed - attempted endpoints: ${homePageEndpoints.join(', ')}, failed: ${failedEndpoints.join(', ')}`;
      
      console.error('❌ Consolidated home page data failed:', {
        attemptedEndpoints: homePageEndpoints,
        failedEndpoints,
        primaryError: primaryError?.message || 'Unknown error'
      });

      // Create a comprehensive error with all failed endpoints
      const comprehensiveError = new Error(errorMessage);
      (comprehensiveError as any).failedEndpoints = failedEndpoints;
      (comprehensiveError as any).attemptedEndpoints = homePageEndpoints;
      (comprehensiveError as any).primaryError = primaryError;
      
      throw comprehensiveError;
    }

    console.log('✅ Consolidated home page data loaded:', {
      services: !!result.services,
      recentMoves: !!result.recentMoves,
      testimonials: !!result.testimonials,
      nav: !!result.nav,
      authStatus: !!result.authStatus
    });

    return result;
  }

  /**
   * Get all about page data in a single consolidated call
   * Returns an object with all about page data
   */
  async getAboutPageData(): Promise<{
    about: any;
    totalMovesCount: number;
  }> {
    try {
      console.log('🚀 Loading consolidated about page data...');
      
      // Load about page data only (no navigation)
      const [about, totalMovesCount] = await Promise.allSettled([
        this.makeRequest(API_ENDPOINTS.PRIVATE.ABOUT), // /v0/about
        this.makeRequest('/v0/recentMoves/total') // /v0/recentMoves/total
      ]);

      const result = {
        about: about.status === 'fulfilled' ? about.value : null,
        totalMovesCount: totalMovesCount.status === 'fulfilled' ? (totalMovesCount.value as number) : 500
      };

      console.log('✅ Consolidated about page data loaded:', {
        about: !!result.about,
        totalMovesCount: result.totalMovesCount
      });

      return result;
    } catch (error) {
      console.error('❌ Failed to load consolidated about page data:', error);
      throw error;
    }
  }

  /**
   * Get all contact page data in a single consolidated call
   * Returns an object with all contact page data
   */
  async getContactPageData(): Promise<{
    contact: any;
  }> {
    try {
      console.log('🚀 Loading consolidated contact page data...');
      
      // Load contact page data only (no navigation)
      const contact = await this.makeRequest(API_ENDPOINTS.PRIVATE.CONTACT); // /v0/contact

      const result = {
        contact: contact
      };

      console.log('✅ Consolidated contact page data loaded:', {
        contact: !!result.contact
      });

      return result;
    } catch (error) {
      console.error('❌ Failed to load consolidated contact page data:', error);
      throw error;
    }
  }

  // =================================================================
  // MODAL MANAGEMENT METHODS
  // =================================================================

  /**
   * Show the API failure modal with specific error details
   */
  showApiFailureModal(failedEndpoints: string[], is503Error: boolean = false, onClose?: () => void): void {
    const now = Date.now();
    
    // Prevent showing modal if already visible to avoid infinite loops
    if (this.modalState.isVisible) {
      return;
    }
    
    // Check cooldown to prevent rapid modal triggers
    if (now - this.lastModalShowTime < this.modalCooldown) {
      return;
    }
    
    // Only show the specific failed endpoints for the current page
    // This ensures the modal is relevant to the page the user is on
    const pageSpecificEndpoints = Array.from(new Set(failedEndpoints));
    
    this.modalState = {
      isVisible: true,
      failedEndpoints: pageSpecificEndpoints, // Show only page-specific failed endpoints
      is503Error,
      onClose: onClose || null
    };
    
    // Update last modal show time
    this.lastModalShowTime = now;
    
    // Notify all listeners that modal state has changed
    this.notifyModalStateListeners();
    
    if (this.isDevMode && !ENV_CONFIG.REDUCE_LOGGING) {
      console.log('🔧 APIsw: Showing page-specific API failure modal:', {
        pageSpecificEndpoints,
        is503Error,
        hasOnClose: !!onClose,
        currentPage: this.currentPageName,
        totalEndpoints: pageSpecificEndpoints.length
      });
    }
  }

  /**
   * Hide the API failure modal
   */
  hideApiFailureModal(): void {
    this.modalState = {
      isVisible: false,
      failedEndpoints: [],
      is503Error: false,
      onClose: null
    };
    
    // Notify all listeners that modal state has changed
    this.notifyModalStateListeners();
    
    if (this.isDevMode && !ENV_CONFIG.REDUCE_LOGGING) {
      console.log('🔧 APIsw: Hiding API failure modal');
    }
  }

  /**
   * Get current modal state
   */
  getModalState() {
    return { ...this.modalState };
  }

  /**
   * Get the ApiFailureModal component with current state
   * This method returns the modal state for use by React components
   */
  getApiFailureModalProps() {
    return {
      isVisible: this.modalState.isVisible,
      onClose: () => {
        this.hideApiFailureModal();
        if (this.modalState.onClose) {
          this.modalState.onClose();
        }
      },
      failedEndpoints: this.modalState.failedEndpoints,
      is503Error: this.modalState.is503Error
    };
  }


  /**
   * Add a listener for modal state changes
   */
  addModalStateListener(listener: () => void): void {
    this.modalStateListeners.add(listener);
  }

  /**
   * Remove a listener for modal state changes
   */
  removeModalStateListener(listener: () => void): void {
    this.modalStateListeners.delete(listener);
  }

  /**
   * Notify all listeners that modal state has changed
   */
  private notifyModalStateListeners(): void {
    this.modalStateListeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error in modal state listener:', error);
      }
    });
  }

  // =================================================================
  // API CALL TRACKING METHODS
  // =================================================================

  /**
   * Start tracking API calls for a specific page
   */
  startPageTracking(pageName: string): void {
    // Always reset tracking when starting a new page
    this.currentPageName = pageName;
    this.pageApiCalls = [];
    
    if (this.isDevMode && !ENV_CONFIG.REDUCE_LOGGING) {
      console.log(`🔧 [API-TRACKING] Started tracking API calls for page: ${pageName}`);
    }
  }

  /**
   * Track an API call
   */
  trackApiCall(endpoint: string): void {
    // Only track if not already tracked to avoid duplicates
    if (!this.pageApiCalls.includes(endpoint)) {
      this.pageApiCalls.push(endpoint);
      
      // Log each tracked call in development for debugging
      if (this.isDevMode && !ENV_CONFIG.REDUCE_LOGGING) {
        console.log(`🔧 [API-TRACKING] Tracked API call: ${endpoint} (Page: ${this.currentPageName})`);
        console.log(`🔧 [API-TRACKING] Current tracked calls:`, this.pageApiCalls);
      }
    }
  }

  /**
   * Log an error for tracking and debugging
   */
  private logError(endpoint: string, error: Error, statusCode?: number, is503Error: boolean = false, isConnectionError: boolean = false): void {
    const errorEntry = {
      timestamp: Date.now(),
      endpoint,
      error: error.message,
      statusCode,
      is503Error,
      isConnectionError,
      pageName: this.currentPageName
    };
    
    this.errorLog.push(errorEntry);
    
    // Keep only last 100 errors to prevent memory issues
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }
    
    // Log 503 errors prominently for testing
    if (is503Error) {
      console.error(`🚨 [503-ERROR] ${endpoint}: ${error.message} (Page: ${this.currentPageName})`);
      console.error(`🚨 [503-ERROR] Full error details:`, errorEntry);
    } else if (this.isDevMode && !ENV_CONFIG.REDUCE_LOGGING) {
      console.error(`❌ [API-ERROR] ${endpoint}: ${error.message} (Page: ${this.currentPageName})`);
    }
  }

  /**
   * Get error log for debugging
   */
  getErrorLog(): Array<{
    timestamp: number;
    endpoint: string;
    error: string;
    statusCode?: number;
    is503Error: boolean;
    isConnectionError: boolean;
    pageName: string;
  }> {
    return [...this.errorLog];
  }

  /**
   * Get 503 errors only
   */
  get503Errors(): Array<{
    timestamp: number;
    endpoint: string;
    error: string;
    statusCode?: number;
    is503Error: boolean;
    isConnectionError: boolean;
    pageName: string;
  }> {
    return this.errorLog.filter(error => error.is503Error);
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
    console.log('🧹 [ERROR-LOG] Cleared error log');
  }

  /**
   * Get all tracked API calls for current page
   */
  getTrackedApiCalls(): string[] {
    return Array.from(this.pageApiCalls);
  }

  /**
   * Get current page name
   */
  getCurrentPageName(): string {
    return this.currentPageName;
  }

  /**
   * Reset API call tracking
   */
  resetApiCallTracking(): void {
    this.pageApiCalls = [];
    this.currentPageName = '';
    console.log('🔧 [API-TRACKING] Reset API call tracking');
  }

  // =================================================================
  // HEALTH CHECK MIDDLEWARE METHODS
  // =================================================================

  private healthStatus: 'unknown' | 'healthy' | 'unhealthy' = 'unknown';
  private healthCheckTime: number = 0;
  private readonly HEALTH_CHECK_CACHE_DURATION = 30000; // 30 seconds

  /**
   * Check health status and cache result
   */
  async checkHealthWithCache(): Promise<boolean> {
    const now = Date.now();
    
    // Use cached result if recent
    if (this.healthStatus !== 'unknown' && (now - this.healthCheckTime) < this.HEALTH_CHECK_CACHE_DURATION) {
      return this.healthStatus === 'healthy';
    }

    try {
      console.log('🏥 [HEALTH-MIDDLEWARE] Checking API health status...');
      await this.checkHealth();
      this.healthStatus = 'healthy';
      this.healthCheckTime = now;
      console.log('✅ [HEALTH-MIDDLEWARE] Health check passed');
      return true;
    } catch (error) {
      console.error('❌ [HEALTH-MIDDLEWARE] Health check failed:', error);
      this.healthStatus = 'unhealthy';
      this.healthCheckTime = now;
      this.trackApiCall('/v0/health');
      return false;
    }
  }

  /**
   * Express.js-style middleware for health check
   * If health check fails, records all attempted routes as 503
   */
  async healthCheckMiddleware(req: any, res: any, next: any): Promise<void> {
    const endpoint = req.url || req.path || '/unknown';
    
    // Check health first
    const isHealthy = await this.checkHealthWithCache();
    
    if (!isHealthy) {
      // Health check failed - record all routes as failed
      console.log('🚨 [HEALTH-MIDDLEWARE] Health check failed, recording all routes as 503');
      
      // Get all routes that would have been called for this page
      const allRoutes = this.getTrackedApiCalls();
      
      console.log('🔧 [HEALTH-MIDDLEWARE] All tracked routes:', allRoutes);
      
      // Show modal with all failed routes including health
      const allFailedRoutes = ['/v0/health', ...allRoutes];
      console.log('🔧 [HEALTH-MIDDLEWARE] All failed routes for modal:', allFailedRoutes);
      
      this.showApiFailureModal(allFailedRoutes, true);
      
      // Set 503 status and error
      res.statusCode = 503;
      res.status = 503;
      res.error = new Error(`Service Unavailable (503): Health check failed for ${endpoint}`);
      
      // Call next with error to stop the chain
      next(new Error(`Service Unavailable (503): Health check failed for ${endpoint}`));
      return;
    }
    
    // Health is good, continue to next middleware
    next();
  }

  /**
   * Express.js-style middleware that pre-tracks all routes for a page
   * This should be called before any health checks
   */
  preTrackRoutesMiddleware(routes: string[]): void {
    routes.forEach(route => {
      this.trackApiCall(route);
    });
  }

  /**
   * Middleware function that checks health before making API calls
   * If health check fails, records all attempted routes as 503
   */
  async withHealthCheck<T>(
    endpoint: string, 
    apiCall: () => Promise<T>,
    allRoutes: string[] = []
  ): Promise<T> {
    // Check health first
    const isHealthy = await this.checkHealthWithCache();
    
    if (!isHealthy) {
      // Health check failed - record all routes as failed
      console.log('🚨 [HEALTH-MIDDLEWARE] Health check failed, recording all routes as 503');
      
      // Track all routes that would have been called
      allRoutes.forEach(route => {
        if (!this.pageApiCalls.includes(route)) {
          this.trackApiCall(route);
        }
      });
      
      // Show modal with all failed routes
      const allFailedRoutes = ['/v0/health', ...allRoutes];
      this.showApiFailureModal(allFailedRoutes, true);
      
      throw new Error(`Service Unavailable (503): Health check failed for ${endpoint}`);
    }
    
    // Health is good, proceed with API call
    try {
      return await apiCall();
    } catch (error) {
      console.error(`❌ [HEALTH-MIDDLEWARE] API call failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // =================================================================
  // UTILITY METHODS
  // =================================================================

  async testConnection(): Promise<any> {
    try {
      const health = await this.checkHealth();
      return { 
        success: true, 
        data: health,
        apiUrl: ENV_CONFIG.API_URL,
        skipBackendCheck: ENV_CONFIG.SKIP_BACKEND_CHECK
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        apiUrl: ENV_CONFIG.API_URL,
        skipBackendCheck: ENV_CONFIG.SKIP_BACKEND_CHECK
      };
    }
  }

  getConfig(): any {
    return {
      apiUrl: ENV_CONFIG.API_URL,
      devMode: this.isDevMode,
      skipBackendCheck: ENV_CONFIG.SKIP_BACKEND_CHECK,
      isAuthenticated: this.jwtAuth.isAuthenticated(),
      hasToken: !!this.jwtAuth.getToken(),
      appName: ENV_CONFIG.APP_NAME,
      appVersion: ENV_CONFIG.APP_VERSION,
      enableDevTools: ENV_CONFIG.ENABLE_DEV_TOOLS,
      reduceLogging: ENV_CONFIG.REDUCE_LOGGING,
      apiTimeout: ENV_CONFIG.API_TIMEOUT,
      cacheEnabled: ENV_CONFIG.CACHE_ENABLED,
      cacheTtl: ENV_CONFIG.CACHE_TTL,
      cacheMaxSize: ENV_CONFIG.CACHE_MAX_SIZE
    };
  }

  // JWT Authentication helpers
  isAuthenticated(): boolean {
    return this.jwtAuth.isAuthenticated();
  }

  getUser(): any {
    return this.jwtAuth.getUser();
  }

  getAuthHeaders(): Record<string, string> {
    return this.jwtAuth.getAuthHeaders();
  }

}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const api = APIsw.getInstance();

// =============================================================================
// BACKWARD COMPATIBILITY EXPORTS
// =============================================================================

// Export individual functions for backward compatibility
export const login = (email: string, password: string) => api.login(email, password);
export const logout = () => api.logout();
export const checkAuthStatus = () => api.checkAuthStatus();
export const getNav = () => api.getNav();
export const getServices = () => api.getServices();
export const checkHealth = () => api.checkHealth();
export const getReferral = () => api.getReferral();
export const getBlog = () => api.getBlog();
export const getReviews = () => api.getReviews();
export const getLocations = () => api.getLocations();
export const getSupplies = () => api.getSupplies();
export const getAbout = () => api.getAbout();
export const getContact = () => api.getContact();
export const testConnection = () => api.testConnection();
export const getConfig = () => api.getConfig();
export const isAuthenticated = () => api.isAuthenticated();
export const getUser = () => api.getUser();
export const getAuthHeaders = () => api.getAuthHeaders();

// Export consolidated page data methods
export const getHomePageData = () => api.getHomePageData();
export const getAboutPageData = () => api.getAboutPageData();
export const getContactPageData = () => api.getContactPageData();

// Export API configuration functions
export { getApiKey, getSigninHost };

// Export environment configuration
export { ENV_CONFIG };

// Export modal management functions
export const getApiFailureModalProps = () => api.getApiFailureModalProps();
export const addModalStateListener = (listener: () => void) => api.addModalStateListener(listener);
export const removeModalStateListener = (listener: () => void) => api.removeModalStateListener(listener);

// Export API call tracking functions
export const startPageTracking = (pageName: string) => api.startPageTracking(pageName);
export const trackApiCall = (endpoint: string) => api.trackApiCall(endpoint);
export const getTrackedApiCalls = () => api.getTrackedApiCalls();
export const getCurrentPageName = () => api.getCurrentPageName();
export const resetApiCallTracking = () => api.resetApiCallTracking();

// Export health check middleware functions
export const checkHealthWithCache = () => api.checkHealthWithCache();
export const withHealthCheck = <T>(endpoint: string, apiCall: () => Promise<T>, allRoutes?: string[]) => api.withHealthCheck(endpoint, apiCall, allRoutes);
export const healthCheckMiddleware = (req: any, res: any, next: any) => api.healthCheckMiddleware(req, res, next);
export const preTrackRoutesMiddleware = (routes: string[]) => api.preTrackRoutesMiddleware(routes);

// Export API blocking functions
export const setApiBlocked = (isBlocked: boolean) => api.setApiBlocked(isBlocked);
export const getApiBlocked = () => api.getApiBlocked();
export const checkConsentMiddleware = () => api.checkConsentMiddleware();
export const consentAwareMiddleware = (endpoint: string, context: string) => api.consentAwareMiddleware(endpoint, context);

// Export health gate functions
export const resetHealthGate = () => api.resetHealthGate();

// Export error tracking functions
export const getErrorLog = () => api.getErrorLog();
export const get503Errors = () => api.get503Errors();
export const clearErrorLog = () => api.clearErrorLog(); 