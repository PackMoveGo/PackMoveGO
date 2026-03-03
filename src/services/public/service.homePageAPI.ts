/**
 * Home Page Router
 * 
 * Express.js style router for home page endpoints.
 * Routes use middleware (apiErrorHandler) and delegate to individual route controllers.
 * 
 * Route Structure:
 * homePageRouter.get('/v0/services', apiErrorHandler, getServicesController)
 * homePageRouter.get('/v0/testimonials', apiErrorHandler, getTestimonialsController) 
 * homePageRouter.get('/v0/recentMoves', apiErrorHandler, getRecentMovesController)
 * homePageRouter.get('/v0/recentMoves/total', apiErrorHandler, getTotalMovesController)
 */

import { handleApiError, getFailedEndpoints, has503Errors } from '../../util/apiErrorHandler';
import { api, healthCheckMiddleware, preTrackRoutesMiddleware, consentAwareMiddleware } from '../service.apiSW';

// Import individual route controllers
import { getAllServices } from '../routes/route.servicesAPI';
import { getAllRecentMoves, getTotalRecentMovesCount } from '../routes/route.recentMovesAPI';
import { getAllTestimonials } from '../routes/route.testimonalsAPI';
import { getMainNavigation } from '../routes/route.navAPI';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface RecentMove {
  id: string;
  customerName: string;
  customerInitials: string;
  moveDate: string;
  fromLocation: string;
  toLocation: string;
  moveType: string;
  status: 'completed' | 'in-progress' | 'scheduled';
  rating?: number;
  testimonial?: string;
  isVerified: boolean;
}

export interface ServiceData {
  id: string;
  title: string;
  description: string;
  price: string | null;
  duration?: string;
  icon?: string;
  link?: string;
}

export interface TestimonialData {
  id: number;
  name: string;
  comment?: string;
  content?: string;
  service?: string;
  role?: string;
  location?: string;
  image?: string;
  rating?: number;
  date?: string;
}

export interface ClientData {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  moveCount: number;
  lastMoveDate: string;
}

export interface MoverData {
  id: string;
  name: string;
  experience: number;
  rating: number;
  specialties: string[];
  location: string;
  availability: boolean;
}

export interface HomePageData {
  recentMoves: RecentMove[];
  services: ServiceData[];
  testimonials: TestimonialData[];
  clients: ClientData[];
  movers: MoverData[];
  lastUpdated: string;
}

export interface HomePageServiceData {
  nav: any;
  services: any;
  authStatus: any;
  testimonials: any;
  recentMoves: any;
  totalMoves: number;
  lastUpdated: string;
}

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

class HomePageCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

  clearExpired(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }
}

const homePageCache = new HomePageCache();

// =============================================================================
// API CALL FUNCTIONS
// =============================================================================


// =============================================================================
// EXPRESS.JS-STYLE MIDDLEWARE INTEGRATION
// =============================================================================

// =============================================================================
// EXPRESS.JS-STYLE MIDDLEWARE TYPES
// =============================================================================

interface Request {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  query?: Record<string, string>;
  failedEndpoints?: string[];
  error?: Error;
}

interface Response {
  status: (code: number) => Response;
  json: (data: any) => Response;
  send: (data: any) => Response;
  end: () => Response;
  statusCode: number;
  headers: Record<string, string>;
  data?: any;
}

type NextFunction = (error?: Error) => void;

// =============================================================================
// MODAL MIDDLEWARE INTEGRATION
// =============================================================================

/**
 * Express.js-style middleware for API failure modal
 * Uses service.apiSW.ts as the middleware layer
 */

/**
 * API Error Middleware (Express.js style)
 * Handles API errors and triggers modal via service.apiSW.ts
 */
export const apiErrorMiddleware = (req: Request, res: Response, next: NextFunction) => {
  
  // Store original methods
  const originalJson = res.json;
  const originalSend = res.send;
  const originalEnd = res.end;
  
  // Override response methods to catch errors
  res.json = function(data: any) {
    
    // Check for error responses
    if (res.statusCode >= 400) {
      handleApiErrorInResponse(req, res, data);
    }
    
    return originalJson.call(this, data);
  };
  
  res.send = function(data: any) {
    
    // Check for error responses
    if (res.statusCode >= 400) {
      handleApiErrorInResponse(req, res, data);
    }
    
    return originalSend.call(this, data);
  };
  
  res.end = function() {
    
    // Check for error responses
    if (res.statusCode >= 400) {
      handleApiErrorInResponse(req, res, null);
    }
    
    return originalEnd.call(this);
  };
  
  next();
};

/**
 * Handle API errors in response (Express.js style)
 */
const handleApiErrorInResponse = (req: Request, res: Response, data: any) => {
  const endpoint = req.url;
  const is503Error = res.statusCode === 503;
  
  
  if (is503Error) {
    // Show modal using the API service
    api.showApiFailureModal([endpoint], true);
    
    // Track failed endpoints
    if (!req.failedEndpoints) {
      req.failedEndpoints = [];
    }
    req.failedEndpoints.push(endpoint);
  }
  
  // Handle other error codes
  if (res.statusCode >= 500) {
    api.showApiFailureModal([endpoint], false);
    
    if (!req.failedEndpoints) {
      req.failedEndpoints = [];
    }
    req.failedEndpoints.push(endpoint);
  }
};

/**
 * Modal-aware error handler middleware (Express.js style)
 * Integrates ApiFailureModal from service.apiSW.ts
 */
export const createModalAwareErrorHandler = (endpoint: string, context: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Process the request
      await next();
    } catch (error) {
      
      // Check if it's a 503 error
      const is503Error = error instanceof Error && (
        error.message.includes('503') || 
        error.message.includes('Service Unavailable') ||
        error.message.includes('temporarily unavailable')
      );
      
      if (is503Error) {
        
        // Show modal using the API service
        api.showApiFailureModal([endpoint], true);
        
        // Create enhanced error with endpoint information
        const enhancedError = new Error(`503 Service Unavailable: ${endpoint}`);
        (enhancedError as any).failedEndpoints = [endpoint];
        (enhancedError as any).attemptedEndpoints = [endpoint];
        (enhancedError as any).primaryError = error;
        
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
};

/**
 * Get the current modal props from the API service
 */
export const getApiFailureModalProps = () => {
  return api.getApiFailureModalProps();
};


/**
 * Get current modal state
 */
export const getModalState = () => {
  return api.getModalState();
};

/**
 * Hide the API failure modal
 */
export const hideApiFailureModal = () => {
  api.hideApiFailureModal();
};

/**
 * Add a listener for modal state changes
 */
export const addModalStateListener = (listener: () => void) => {
  api.addModalStateListener(listener);
};

/**
 * Remove a listener for modal state changes
 */
export const removeModalStateListener = (listener: () => void) => {
  api.removeModalStateListener(listener);
};

// =============================================================================
// MIDDLEWARE
// =============================================================================


/**
 * API Error Handler Middleware
 * Works like Express.js middleware: (req, res, next)
 */
const apiErrorHandlerMiddleware = (endpoint: string, context: string) => {
  return async (req: any, res: any, next: any) => {
    try {
      // Call the next function (the actual route handler)
      const result = await next();
      return result;
    } catch (error) {
      
      // Check if it's a 503 error
      const is503Error = error instanceof Error && (
        error.message.includes('503') || 
        error.message.includes('Service Unavailable') ||
        error.message.includes('temporarily unavailable')
      );
      
      if (is503Error) {
        
        // Create enhanced error with endpoint information
        const enhancedError = new Error(`503 Service Unavailable: ${endpoint}`);
        (enhancedError as any).failedEndpoints = [endpoint];
        (enhancedError as any).attemptedEndpoints = [endpoint];
        (enhancedError as any).primaryError = error;
        
        handleApiError(enhancedError, endpoint, {
          context: context,
          showModal: false, // Let page controllers handle modal display
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
};

// =============================================================================
// EXPRESS.JS-STYLE ROUTER CLASS
// =============================================================================

/**
 * Express.js-style router for home page
 * Pattern: homeService.get('/v0/<route>', healthCheckMiddleware, <route>)
 */
class HomePageRouter {
  private routes: Map<string, (req: any, res: any, next: any) => Promise<any>> = new Map();
  
  /**
   * Register a GET route with middleware
   */
  get(path: string, middleware: (req: any, res: any, next: any) => Promise<void>, handler: (req: any, res: any, next: any) => Promise<any>) {
    const routeHandler = async (req: any, res: any, next: any) => {
      try {
        // Apply middleware first
        await middleware(req, res, next);
        
        // If middleware didn't call next with error, proceed with handler
        return await handler(req, res, next);
      } catch (error) {
        throw error;
      }
    };
    
    this.routes.set(path, routeHandler);
  }
  
  /**
   * Execute a route
   */
  async execute(path: string, req: any, res: any, next: any): Promise<any> {
    const handler = this.routes.get(path);
    if (!handler) {
      throw new Error(`Route not found: ${path}`);
    }
    
    return await handler(req, res, next);
  }
  
  /**
   * Get all registered routes
   */
  getRoutes(): string[] {
    return Array.from(this.routes.keys());
  }
}

// Create router instance
const homePageRouter = new HomePageRouter();

// =============================================================================
// EXPRESS.JS-STYLE ROUTE HANDLERS
// =============================================================================

/**
 * Express.js-style route handler for services
 * Pattern: homeService.get('/v0/services', healthCheckMiddleware, getAllServices)
 */
export const getServicesRoute = async (req: any, res: any, next: any) => {
  
  try {
    // Apply health check middleware first
    await healthCheckMiddleware(req, res, next);
    
    // If we get here, health check passed, proceed with service call
    const data = await getAllServices();
    
    res.statusCode = 200;
    res.data = data;
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Express.js-style route handler for testimonials
 * Pattern: homeService.get('/v0/testimonials', healthCheckMiddleware, getAllTestimonials)
 */
export const getTestimonialsRoute = async (req: any, res: any, next: any) => {
  
  try {
    // Apply health check middleware first
    await healthCheckMiddleware(req, res, next);
    
    // If we get here, health check passed, proceed with service call
    const data = await getAllTestimonials();
    
    res.statusCode = 200;
    res.data = data;
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Express.js-style route handler for recent moves
 * Pattern: homeService.get('/v0/recentMoves', healthCheckMiddleware, getAllRecentMoves)
 */
export const getRecentMovesRoute = async (req: any, res: any, next: any) => {
  
  try {
    // Apply health check middleware first
    await healthCheckMiddleware(req, res, next);
    
    // If we get here, health check passed, proceed with service call
    const data = await getAllRecentMoves();
    
    res.statusCode = 200;
    res.data = data;
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Express.js-style route handler for total moves count
 * Pattern: homeService.get('/v0/recentMoves/total', healthCheckMiddleware, getTotalRecentMovesCount)
 */
export const getTotalMovesRoute = async (req: any, res: any, next: any) => {
  
  try {
    // Apply health check middleware first
    await healthCheckMiddleware(req, res, next);
    
    // If we get here, health check passed, proceed with service call
    const data = await getTotalRecentMovesCount();
    
    res.statusCode = 200;
    res.data = data;
    return data;
  } catch (error) {
    throw error;
  }
};

// Register all routes with Express.js-style pattern using consent-aware middleware
homePageRouter.get('/v0/services', consentAwareMiddleware('/v0/services', 'Services Route'), getServicesRoute);
homePageRouter.get('/v0/testimonials', consentAwareMiddleware('/v0/testimonials', 'Testimonials Route'), getTestimonialsRoute);
homePageRouter.get('/v0/recentMoves', consentAwareMiddleware('/v0/recentMoves', 'Recent Moves Route'), getRecentMovesRoute);
homePageRouter.get('/v0/recentMoves/total', consentAwareMiddleware('/v0/recentMoves/total', 'Total Moves Route'), getTotalMovesRoute);

// =============================================================================
// LEGACY ROUTE CONTROLLERS (for backward compatibility)
// =============================================================================

/**
 * Route: GET /v0/services
 * Middleware: apiErrorHandlerMiddleware
 * Controller: getAllServices from route.servicesAPI.ts
 */
export const getServicesController = async () => {
  
  try {
    // Delegate to individual route controller
    const data = await getAllServices();
    
    return data;
  } catch (error) {
    // Handle error and show modal via API service
    
    // Check if it's a 503 error
    const is503Error = error instanceof Error && (
      error.message.includes('503') || 
      error.message.includes('Service Unavailable') ||
      error.message.includes('temporarily unavailable')
    );
    
    if (is503Error) {
      // Modal will be handled by main page function
    }
    
    throw error;
  }
};

/**
 * Route: GET /v0/testimonials
 * Middleware: apiErrorHandlerMiddleware
 * Controller: getAllTestimonials from route.testimonalsAPI.ts
 */
export const getTestimonialsController = async () => {
  
  try {
    // Delegate to individual route controller
    const data = await getAllTestimonials();
    
    return data;
  } catch (error) {
    // Handle error and show modal via API service
    
    // Check if it's a 503 error
    const is503Error = error instanceof Error && (
      error.message.includes('503') || 
      error.message.includes('Service Unavailable') ||
      error.message.includes('temporarily unavailable')
    );
    
    if (is503Error) {
      // Modal will be handled by main page function
    }
    
    throw error;
  }
};

/**
 * Route: GET /v0/recentMoves
 * Middleware: apiErrorHandlerMiddleware
 * Controller: getAllRecentMoves from route.recentMovesAPI.ts
 */
export const getRecentMovesController = async () => {
  
  try {
    // Delegate to individual route controller
    const data = await getAllRecentMoves();
    
    return data;
  } catch (error) {
    // Handle error and show modal via API service
    
    // Check if it's a 503 error
    const is503Error = error instanceof Error && (
      error.message.includes('503') || 
      error.message.includes('Service Unavailable') ||
      error.message.includes('temporarily unavailable')
    );
    
    if (is503Error) {
      // Modal will be handled by main page function
    }
    
    throw error;
  }
};

/**
 * Route: GET /v0/recentMoves/total
 * Middleware: apiErrorHandlerMiddleware
 * Controller: getTotalRecentMovesCount from route.recentMovesAPI.ts
 */
export const getTotalMovesController = async (req: any, res: any, next: any) => {
  
  try {
    // Delegate to individual route controller
    const data = await getTotalRecentMovesCount();
    
    return data;
  } catch (error) {
    // Handle error and show modal via API service
    
    // Check if it's a 503 error
    const is503Error = error instanceof Error && (
      error.message.includes('503') || 
      error.message.includes('Service Unavailable') ||
      error.message.includes('temporarily unavailable')
    );
    
    if (is503Error) {
      // Modal will be handled by main page function
    }
    
    throw error;
  }
};


// =============================================================================
// HOME PAGE DATA FUNCTIONS
// =============================================================================

/**
 * Get home page data with Express.js-style middleware pattern
 * Uses health check middleware to prevent API calls if health fails
 */
// Track how many times getHomePageData is called
let getHomePageDataCallCount = 0;

export const getHomePageData = async (): Promise<HomePageServiceData> => {
  getHomePageDataCallCount++;
  try {
    // Start tracking API calls for home page (this resets previous tracking)
    api.startPageTracking('home-page');
    
    // Define all routes that will be called for this page
    const homePageRoutes = ['/v0/nav', '/v0/services', '/v0/auth/status', '/v0/testimonials', '/v0/recentMoves', '/v0/recentMoves/total'];
    
    // First check health status - if it fails, all routes are considered 503
    try {
      await api.checkHealth();
      homePageStatusCode = 200;
    } catch (healthError) {
      homePageStatusCode = 503;
      
      // Track all routes as failed since health check failed
      homePageRoutes.forEach(route => {
        api.trackApiCall(route);
      });
      
      // Show modal with all routes as failed
      api.showApiFailureModal(homePageRoutes, true);
      
      // Return empty data with 503 status
      return {
        nav: null,
        services: null,
        authStatus: null,
        testimonials: null,
        recentMoves: null,
        totalMoves: 500,
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Health check passed - proceed with individual route calls
    const [navData, servicesData, authStatus, testimonialsData, recentMovesData, totalMovesData] = await Promise.allSettled([
      api.getNav(),
      api.getServices(),
      api.checkAuthStatus(),
      api.makeRequest('/v0/testimonials'),
      api.makeRequest('/v0/recentMoves'),
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
    if (servicesData.status === 'rejected') {
      failedEndpoints.push('/v0/services');
      if (servicesData.reason?.message?.includes('503')) has503Error = true;
    }
    if (authStatus.status === 'rejected') {
      failedEndpoints.push('/v0/auth/status');
      if (authStatus.reason?.message?.includes('503')) has503Error = true;
    }
    if (testimonialsData.status === 'rejected') {
      failedEndpoints.push('/v0/testimonials');
      if (testimonialsData.reason?.message?.includes('503')) has503Error = true;
    }
    if (recentMovesData.status === 'rejected') {
      failedEndpoints.push('/v0/recentMoves');
      if (recentMovesData.reason?.message?.includes('503')) has503Error = true;
    }
    if (totalMovesData.status === 'rejected') {
      failedEndpoints.push('/v0/recentMoves/total');
      if (totalMovesData.reason?.message?.includes('503')) has503Error = true;
    }
    
    // Update status code
    if (has503Error) {
      homePageStatusCode = 503;
    }
    
    // Show modal only for this page's failed endpoints
    if (failedEndpoints.length > 0) {
      api.showApiFailureModal(failedEndpoints, has503Error);
    }
    
    const result: HomePageServiceData = {
      nav: navData.status === 'fulfilled' ? navData.value : null,
      services: servicesData.status === 'fulfilled' ? servicesData.value : null,
      authStatus: authStatus.status === 'fulfilled' ? authStatus.value : null,
      testimonials: testimonialsData.status === 'fulfilled' ? testimonialsData.value : null,
      recentMoves: recentMovesData.status === 'fulfilled' ? recentMovesData.value : null,
      totalMoves: totalMovesData.status === 'fulfilled' ? (totalMovesData.value as number) : 500,
      lastUpdated: new Date().toISOString()
    };
    
    return result;
  } catch (error) {
    throw error;
  }
};

// Track status code for home page
let homePageStatusCode = 200;

/**
 * Get the status code for home page data
 * This checks the health status and returns the appropriate status code
 */
export const getHomePageStatusCode = (): number => {
  return homePageStatusCode;
};

/**
 * Check if there are any 503 errors in home page data
 */
export const hasHomePage503Errors = (): boolean => {
  return has503Errors();
};

/**
 * Get home page failed endpoints
 */
export const getHomePageFailedEndpoints = (): string[] => {
  return getFailedEndpoints();
};

// =============================================================================
// INDIVIDUAL DATA LOADING FUNCTIONS
// =============================================================================

/**
 * Load services data with error handling
 */
export const loadServicesData = async () => {
  try {
    const data = await getAllServices();
    return { data, error: null, loading: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load services';
    
    // Handle 503 errors specifically
    if (errorMessage.includes('503') || errorMessage.includes('Service Unavailable')) {
      handleApiError(error, '/v0/services', {
        context: 'Services Loader',
        showModal: false, // Let page controllers handle modal display
        logError: true
      });
    }
    
    return { data: null, error: errorMessage, loading: false };
  }
};

/**
 * Load testimonials data with error handling
 */
export const loadTestimonialsData = async () => {
  try {
    const data = await getAllTestimonials();
    return { data, error: null, loading: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load testimonials';
    
    // Handle 503 errors specifically
    if (errorMessage.includes('503') || errorMessage.includes('Service Unavailable')) {
      handleApiError(error, '/v0/testimonials', {
        context: 'Testimonials Loader',
        showModal: false, // Let page controllers handle modal display
        logError: true
      });
    }
    
    return { data: null, error: errorMessage, loading: false };
  }
};

/**
 * Load recent moves data with error handling
 */
export const loadRecentMovesData = async () => {
  try {
    const data = await getAllRecentMoves();
    return { data, error: null, loading: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load recent moves';
    
    // Handle 503 errors specifically
    if (errorMessage.includes('503') || errorMessage.includes('Service Unavailable')) {
      handleApiError(error, '/v0/recentMoves', {
        context: 'Recent Moves Loader',
        showModal: false, // Let page controllers handle modal display
        logError: true
      });
    }
    
    return { data: null, error: errorMessage, loading: false };
  }
};

// =============================================================================
// SIMPLIFIED API CALLS
// =============================================================================





// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Clear all cached home page data
 */
export const clearHomePageCache = (): void => {
  homePageCache.clear();
};

/**
 * Get cached data without making API calls
 */
export const getCachedHomePageData = (): Partial<HomePageData> | null => {
  return {
    recentMoves: homePageCache.get('recent_moves') || [],
    services: homePageCache.get('services_data') || [],
    testimonials: homePageCache.get('testimonials_data') || [],
    clients: homePageCache.get('client_data') || [],
    movers: homePageCache.get('mover_data') || []
  };
};

/**
 * Check if home page data is cached and not expired
 */
export const isHomePageDataCached = (): boolean => {
  return homePageCache.get('recent_moves') !== null;
};

/**
 * Get all failed endpoints from the error tracking system
 * This provides a comprehensive view of all API failures
 */
export const getAllFailedEndpoints = (): string[] => {
  return getFailedEndpoints();
};

/**
 * Check if any 503 errors have occurred
 */
export const hasAny503Errors = (): boolean => {
  return has503Errors();
};

/**
 * Get comprehensive error status for the home page
 * Returns both failed endpoints and 503 error status
 */
export const getHomePageErrorStatus = () => {
  return {
    failedEndpoints: getAllFailedEndpoints(),
    has503Error: hasAny503Errors(),
    totalFailedEndpoints: getAllFailedEndpoints().length
  };
};

// =============================================================================
// EXPORTS
// =============================================================================

// =============================================================================
// ROUTE EXPORTS (Express.js style)
// =============================================================================

export default {
  // Main Controller
  getHomePageData,
  
  // Express.js-style Route Handlers
  getServicesRoute,
  getTestimonialsRoute,
  getRecentMovesRoute,
  getTotalMovesRoute,
  
  // Legacy Route Controllers (with middleware)
  getServicesController,
  getTestimonialsController,
  getRecentMovesController,
  getTotalMovesController,
  
  // Individual Data Loaders
  loadServicesData,
  loadTestimonialsData,
  loadRecentMovesData,
  
  // Utility Functions
  clearHomePageCache,
  getCachedHomePageData,
  isHomePageDataCached,
  
  // Error Status Functions
  getAllFailedEndpoints,
  hasAny503Errors,
  getHomePageErrorStatus,
  
  // Modal Integration Functions
  createModalAwareErrorHandler,
  getApiFailureModalProps,
  getModalState,
  hideApiFailureModal,
  addModalStateListener,
  removeModalStateListener,
  
  // Express.js-style Middleware
  apiErrorMiddleware
};

