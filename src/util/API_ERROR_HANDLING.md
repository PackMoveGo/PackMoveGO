# API Error Handling System

A comprehensive, reusable error handling system for API failures that automatically triggers the 503 fallback modal.

## 🎯 Features

- **Centralized Error Handling** - One place to manage all API errors
- **Automatic Modal Triggering** - Shows 503 modal when API fails
- **Flexible Configuration** - Customize error handling behavior
- **React Hook Support** - Easy integration with React components
- **Error Classification** - Network, server, and custom error detection
- **User-Friendly Messages** - Convert technical errors to user-friendly text

## 🚀 Quick Start

### Basic Usage

```typescript
import { handleApiError } from '../util/apiErrorHandler';

try {
  const response = await api.getData();
  // Handle success
} catch (error) {
  handleApiError(error, '/api/data', {
    context: 'MyComponent',
    showModal: true,
    logError: true
  });
}
```

### Using the React Hook

```typescript
import { useApiErrorHandler } from '../util/apiErrorHandler';

function MyComponent() {
  const { handleError, wrapApiCall } = useApiErrorHandler('/api/data');
  
  const fetchData = async () => {
    try {
      const response = await wrapApiCall(() => api.getData());
      // Handle success
    } catch (error) {
      handleError(error);
    }
  };
}
```

## 📚 API Reference

### `handleApiError(error, endpoint, options)`

The core function for handling API errors.

**Parameters:**
- `error: unknown` - The error that occurred
- `endpoint: string` - The API endpoint that failed
- `options: ApiErrorHandlerOptions` - Configuration options

**Options:**
```typescript
interface ApiErrorHandlerOptions {
  showModal?: boolean;    // Show 503 modal (default: true)
  logError?: boolean;     // Log error to console (default: true)
  context?: string;       // Context for logging (default: 'API Call')
}
```

### `withApiErrorHandling(apiCall, endpoint, options)`

Wraps an API call with automatic error handling.

```typescript
const result = await withApiErrorHandling(
  () => api.getData(),
  '/api/data',
  { context: 'MyComponent' }
);
```

### `useApiErrorHandler(endpoint, options)`

React hook for error handling in components.

**Returns:**
- `handleError(error)` - Function to handle errors
- `wrapApiCall(apiCall)` - Function to wrap API calls

### `getFriendlyErrorMessage(error)`

Converts technical errors to user-friendly messages.

```typescript
const message = getFriendlyErrorMessage(error);
// "Network connection failed. Please check your internet connection."
```

## 🔧 Error Classification

The system automatically classifies errors:

### Network Errors
- Connection refused
- Timeout errors
- Network unavailable

### Server Errors
- 5xx HTTP status codes
- Server unavailable

### Custom Errors
- Any other error types

## 📝 Usage Examples

### Example 1: Simple Error Handling

```typescript
import { handleApiError } from '../util/apiErrorHandler';

async function fetchUserData() {
  try {
    const response = await api.getUser();
    return response;
  } catch (error) {
    handleApiError(error, '/api/user', {
      context: 'UserService',
      showModal: true
    });
    throw error; // Re-throw if needed
  }
}
```

### Example 2: Using the Hook

```typescript
import { useApiErrorHandler } from '../util/apiErrorHandler';

function UserProfile() {
  const { handleError, wrapApiCall } = useApiErrorHandler('/api/user');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadUser = async () => {
    setLoading(true);
    try {
      const userData = await wrapApiCall(() => api.getUser());
      setUser(userData);
    } catch (error) {
      // Error is automatically handled by the hook
      console.log('User loading failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {loading ? 'Loading...' : user ? user.name : 'No user'}
      <button onClick={loadUser}>Load User</button>
    </div>
  );
}
```

### Example 3: Multiple API Calls

```typescript
import { withMultipleApiErrorHandling } from '../util/apiErrorHandler';

async function loadDashboardData() {
  const apiCalls = [
    { call: () => api.getUser(), endpoint: '/api/user' },
    { call: () => api.getSettings(), endpoint: '/api/settings' },
    { call: () => api.getNotifications(), endpoint: '/api/notifications' }
  ];

  try {
    const [user, settings, notifications] = await withMultipleApiErrorHandling(
      apiCalls,
      { context: 'Dashboard' }
    );
    return { user, settings, notifications };
  } catch (error) {
    // First error triggers the modal
    throw error;
  }
}
```

### Example 4: Custom Error Handling

```typescript
import { handleApiError, getFriendlyErrorMessage } from '../util/apiErrorHandler';

async function uploadFile(file: File) {
  try {
    const response = await api.uploadFile(file);
    return response;
  } catch (error) {
    // Handle error but don't show modal for file uploads
    handleApiError(error, '/api/upload', {
      showModal: false,  // Don't show modal
      logError: true,    // Still log the error
      context: 'FileUpload'
    });
    
    // Show custom error message instead
    const friendlyMessage = getFriendlyErrorMessage(error);
    alert(`Upload failed: ${friendlyMessage}`);
    
    throw error;
  }
}
```

## 🎨 Integration with Existing Code

### Updating Existing Hooks

Replace manual error handling with the centralized system:

**Before:**
```typescript
} catch (error) {
  console.error('API Error:', error);
  setError(error.message);
  // Manual modal triggering code...
}
```

**After:**
```typescript
} catch (error) {
  setError(error.message);
  handleApiError(error, endpoint, {
    context: 'useMyHook',
    showModal: true,
    logError: true
  });
}
```

### Updating Service Functions

**Before:**
```typescript
export async function fetchData() {
  try {
    return await api.getData();
  } catch (error) {
    console.error('Failed to fetch data:', error);
    throw error;
  }
}
```

**After:**
```typescript
import { withApiErrorHandling } from '../util/apiErrorHandler';

export async function fetchData() {
  return await withApiErrorHandling(
    () => api.getData(),
    '/api/data',
    { context: 'fetchData' }
  );
}
```

## 🧪 Testing

Use the error-handling example page (if available in your build) to test the system.

## 🔍 Debugging

The system provides comprehensive logging:

```
🔧 useApiData Error for /api/example: [Error details]
🔧 Error details: { endpoint: "/api/example", error: "...", timestamp: ..., context: "useApiData" }
🔧 Triggering API failure modal for: /api/example
🔧 API failure event dispatched: { endpoint: "/api/example", error: "..." }
```

## 🎯 Best Practices

1. **Always provide context** - Helps with debugging
2. **Use appropriate error handling** - Don't show modals for non-critical errors
3. **Log errors in development** - Helps with debugging
4. **Provide fallback data** - When possible, show cached or default data
5. **Test error scenarios** - Use example pages to test different error types

## 🔄 Migration Guide

1. **Import the error handler** in your files
2. **Replace manual error handling** with `handleApiError()`
3. **Update existing hooks** to use the centralized system
4. **Test error scenarios** to ensure modals trigger correctly
5. **Remove old error handling code** once migration is complete

This system ensures consistent error handling across your entire application while providing flexibility for different use cases.
