/**
 * CORS (Cross-Origin Resource Sharing) Configuration
 * 
 * This module configures CORS settings for the PackMoveGo API server.
 * CORS is a security feature that controls which domains can access
 * your API endpoints and what types of requests they can make.
 * 
 * Security Features:
 * - Origin validation (whitelist approach)
 * - Credential support for authenticated requests
 * - Method and header restrictions
 * - Cache control for preflight requests
 */

import cors from 'cors';

// =============================================================================
// ALLOWED ORIGINS CONFIGURATION
// =============================================================================
// NOTE: List of domains that are allowed to make requests to the API
// - Production domains: Official website URLs
// - Development domains: Local development servers
// - Security: Only these origins can access the API
// EDIT GUIDE: Add new domains when deploying to new environments
const allowedOrigins = [
  // Production domains (configure via env in deployment)
  'https://www.packmovego.com',
  'https://packmovego.com',
  // Add deployment preview URLs via CORS_ORIGIN env; do not commit specific deployment URLs
  
  // Development domains
  'https://localhost:5001', // HTTPS Vite dev server
  'http://localhost:5001'   // HTTP Vite dev server
];

// =============================================================================
// CORS OPTIONS CONFIGURATION
// =============================================================================
// NOTE: Complete CORS settings for the Express server
// - origin: Function that validates request origins
// - credentials: Allows cookies and authentication headers
// - methods: HTTP methods allowed for cross-origin requests
// - headers: Request headers that can be sent
// - exposedHeaders: Response headers that can be read by client
// - maxAge: How long to cache preflight requests
// EDIT GUIDE: Modify settings based on your security requirements
const corsOptions: cors.CorsOptions = {
  // =========================================================================
  // ORIGIN VALIDATION FUNCTION
  // =========================================================================
  // NOTE: Custom function to validate request origins
  // - Checks if origin is in allowedOrigins list
  // - Allows requests with no origin (mobile apps, curl, etc.)
  // - Returns error for unauthorized origins
  // EDIT GUIDE: Modify validation logic for different security needs
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    // NOTE: This is common for server-to-server requests and some mobile apps
    if (!origin) return callback(null, true);
    
    // Check if the origin is in our allowed list
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    
    // Origin is allowed
    return callback(null, true);
  },
  
  // =========================================================================
  // CREDENTIALS SUPPORT
  // =========================================================================
  // NOTE: Allows cookies and authentication headers
  // - Required for session-based authentication
  // - Enables secure cross-origin requests with credentials
  // - Important for user authentication and session management
  credentials: true,
  
  // =========================================================================
  // ALLOWED HTTP METHODS
  // =========================================================================
  // NOTE: HTTP methods that can be used in cross-origin requests
  // - GET: Retrieve data
  // - POST: Create new resources
  // - PUT: Update existing resources
  // - DELETE: Remove resources
  // - OPTIONS: Preflight requests (handled automatically)
  // EDIT GUIDE: Add/remove methods based on your API requirements
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  
  // =========================================================================
  // ALLOWED REQUEST HEADERS
  // =========================================================================
  // NOTE: Headers that clients can send in requests
  // - Content-Type: Specifies request body format
  // - Authorization: Bearer tokens, API keys, etc.
  // - X-Requested-With: Identifies AJAX requests
  // - Accept: Specifies expected response format
  // - Origin: Browser-sent origin header
  // - x-api-key: Custom API key header for authentication
  // EDIT GUIDE: Add custom headers your API needs to accept
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-api-key'],
  
  // =========================================================================
  // EXPOSED RESPONSE HEADERS
  // =========================================================================
  // NOTE: Headers that clients can read from responses
  // - Content-Range: Pagination information
  // - X-Content-Range: Custom pagination header
  // EDIT GUIDE: Add headers that should be accessible to clients
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  
  // =========================================================================
  // PREFLIGHT CACHE DURATION
  // =========================================================================
  // NOTE: How long browsers can cache preflight requests
  // - 86400 seconds = 24 hours
  // - Reduces number of OPTIONS requests
  // - Balance between performance and security
  // EDIT GUIDE: Adjust based on how often your CORS settings change
  maxAge: 86400 // 24 hours
};

// =============================================================================
// CONFIGURATION EXPORT
// =============================================================================
// NOTE: Export the CORS options for use in Express app
// - Import this in your main server file
// - Use with: app.use(cors(corsOptions))
export default corsOptions; 