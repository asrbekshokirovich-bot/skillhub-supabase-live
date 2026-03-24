export class ApiError extends Error {
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Standardized error handler that ensures UI components 
 * receive consistent, operational error objects.
 */
export function handleApiError(error, context = 'Database Operation Failed') {
  console.error(`[API Error - ${context}]:`, error);
  
  if (error instanceof ApiError) {
    throw error;
  }
  
  throw new ApiError(500, error?.message || 'Internal server error');
}
