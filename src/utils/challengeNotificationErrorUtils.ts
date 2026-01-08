/**
 * Challenge Notification Error Utilities
 * 
 * Utility functions for error handling, logging, and recovery in the challenge notification system.
 */

import { NotificationError } from '../services/challengeNotificationErrorHandler';

/**
 * Create a standardized error object for the notification system
 */
export function createNotificationError(
  type: NotificationError['type'],
  code: string,
  message: string,
  context?: any,
  severity: NotificationError['severity'] = 'medium'
): NotificationError {
  return {
    type,
    code,
    message,
    timestamp: new Date(),
    context,
    recoverable: determineRecoverability(type, code),
    severity
  };
}

/**
 * Determine if an error is recoverable based on type and code
 */
function determineRecoverability(type: NotificationError['type'], code: string): boolean {
  switch (type) {
    case 'webhook':
      // Most webhook errors are not recoverable for the specific event
      // but the system can continue processing future webhooks
      return ['PROCESSING_ERROR', 'TEMPORARY_FAILURE'].includes(code);
    
    case 'sse':
      // SSE connection errors are generally recoverable
      return !['INVALID_ENDPOINT', 'AUTHENTICATION_FAILED'].includes(code);
    
    case 'network':
      // Network errors are usually recoverable
      return true;
    
    case 'rendering':
      // Rendering errors are often recoverable by clearing state
      return !['CRITICAL_DOM_ERROR', 'MEMORY_EXHAUSTED'].includes(code);
    
    case 'validation':
      // Validation errors for specific data are not recoverable
      // but the system can continue processing other data
      return false;
    
    case 'system':
      // System errors vary in recoverability
      return ['TEMPORARY_RESOURCE_SHORTAGE', 'RECOVERABLE_STATE_ERROR'].includes(code);
    
    default:
      return false;
  }
}

/**
 * Wrap async functions with error handling for the notification system
 */
export function withNotificationErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  errorType: NotificationError['type'],
  errorCode: string,
  onError?: (error: NotificationError) => void
) {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      const notificationError = createNotificationError(
        errorType,
        errorCode,
        error instanceof Error ? error.message : String(error),
        { originalError: error, args },
        'medium'
      );
      
      if (onError) {
        onError(notificationError);
      }
      
      console.error(`Notification system error [${errorType}:${errorCode}]:`, error);
      return null;
    }
  };
}

/**
 * Wrap synchronous functions with error handling
 */
export function withSyncNotificationErrorHandling<T extends any[], R>(
  fn: (...args: T) => R,
  errorType: NotificationError['type'],
  errorCode: string,
  onError?: (error: NotificationError) => void
) {
  return (...args: T): R | null => {
    try {
      return fn(...args);
    } catch (error) {
      const notificationError = createNotificationError(
        errorType,
        errorCode,
        error instanceof Error ? error.message : String(error),
        { originalError: error, args },
        'medium'
      );
      
      if (onError) {
        onError(notificationError);
      }
      
      console.error(`Notification system error [${errorType}:${errorCode}]:`, error);
      return null;
    }
  };
}

/**
 * Validate webhook payload and create validation errors if needed
 */
export function validateWebhookPayload(payload: any): NotificationError[] {
  const errors: NotificationError[] = [];
  
  if (!payload) {
    errors.push(createNotificationError(
      'validation',
      'MISSING_PAYLOAD',
      'Webhook payload is null or undefined',
      { payload },
      'high'
    ));
    return errors;
  }
  
  if (typeof payload !== 'object') {
    errors.push(createNotificationError(
      'validation',
      'INVALID_PAYLOAD_TYPE',
      'Webhook payload must be an object',
      { payload, type: typeof payload },
      'high'
    ));
    return errors;
  }
  
  // Check required fields
  const requiredFields = ['eventType', 'data', 'timestamp'];
  for (const field of requiredFields) {
    if (!(field in payload)) {
      errors.push(createNotificationError(
        'validation',
        'MISSING_REQUIRED_FIELD',
        `Missing required field: ${field}`,
        { payload, missingField: field },
        'medium'
      ));
    }
  }
  
  // Validate event type
  if (payload.eventType && payload.eventType !== 'challenge_completed') {
    errors.push(createNotificationError(
      'validation',
      'INVALID_EVENT_TYPE',
      `Unsupported event type: ${payload.eventType}`,
      { payload, eventType: payload.eventType },
      'low'
    ));
  }
  
  // Validate data structure
  if (payload.data) {
    const dataRequiredFields = ['playerId', 'playerName', 'challengeId', 'challengeName', 'completedAt'];
    for (const field of dataRequiredFields) {
      if (!(field in payload.data)) {
        errors.push(createNotificationError(
          'validation',
          'MISSING_DATA_FIELD',
          `Missing required data field: ${field}`,
          { payload, missingDataField: field },
          'medium'
        ));
      }
    }
  }
  
  // Validate timestamp
  if (payload.timestamp) {
    const timestamp = new Date(payload.timestamp);
    if (isNaN(timestamp.getTime())) {
      errors.push(createNotificationError(
        'validation',
        'INVALID_TIMESTAMP',
        'Invalid timestamp format',
        { payload, timestamp: payload.timestamp },
        'low'
      ));
    }
  }
  
  return errors;
}

/**
 * Validate challenge completion event data
 */
export function validateChallengeCompletionEvent(event: any): NotificationError[] {
  const errors: NotificationError[] = [];
  
  if (!event) {
    errors.push(createNotificationError(
      'validation',
      'MISSING_EVENT',
      'Challenge completion event is null or undefined',
      { event },
      'high'
    ));
    return errors;
  }
  
  // Check required fields
  const requiredFields = ['id', 'playerId', 'playerName', 'challengeId', 'challengeName', 'completedAt', 'timestamp'];
  for (const field of requiredFields) {
    if (!(field in event) || event[field] === null || event[field] === undefined) {
      errors.push(createNotificationError(
        'validation',
        'MISSING_EVENT_FIELD',
        `Missing or null required field: ${field}`,
        { event, missingField: field },
        'medium'
      ));
    }
  }
  
  // Validate field types and formats
  if (event.id && typeof event.id !== 'string') {
    errors.push(createNotificationError(
      'validation',
      'INVALID_FIELD_TYPE',
      'Event ID must be a string',
      { event, field: 'id', value: event.id },
      'medium'
    ));
  }
  
  if (event.playerId && typeof event.playerId !== 'string') {
    errors.push(createNotificationError(
      'validation',
      'INVALID_FIELD_TYPE',
      'Player ID must be a string',
      { event, field: 'playerId', value: event.playerId },
      'medium'
    ));
  }
  
  if (event.playerName && typeof event.playerName !== 'string') {
    errors.push(createNotificationError(
      'validation',
      'INVALID_FIELD_TYPE',
      'Player name must be a string',
      { event, field: 'playerName', value: event.playerName },
      'medium'
    ));
  }
  
  if (event.challengeId && typeof event.challengeId !== 'string') {
    errors.push(createNotificationError(
      'validation',
      'INVALID_FIELD_TYPE',
      'Challenge ID must be a string',
      { event, field: 'challengeId', value: event.challengeId },
      'medium'
    ));
  }
  
  if (event.challengeName && typeof event.challengeName !== 'string') {
    errors.push(createNotificationError(
      'validation',
      'INVALID_FIELD_TYPE',
      'Challenge name must be a string',
      { event, field: 'challengeName', value: event.challengeName },
      'medium'
    ));
  }
  
  // Validate timestamps
  if (event.completedAt) {
    const completedAt = new Date(event.completedAt);
    if (isNaN(completedAt.getTime())) {
      errors.push(createNotificationError(
        'validation',
        'INVALID_TIMESTAMP',
        'Invalid completedAt timestamp format',
        { event, timestamp: event.completedAt },
        'low'
      ));
    }
  }
  
  if (event.timestamp) {
    const timestamp = new Date(event.timestamp);
    if (isNaN(timestamp.getTime())) {
      errors.push(createNotificationError(
        'validation',
        'INVALID_TIMESTAMP',
        'Invalid event timestamp format',
        { event, timestamp: event.timestamp },
        'low'
      ));
    }
  }
  
  // Validate optional numeric fields
  if (event.points !== undefined && (typeof event.points !== 'number' || event.points < 0)) {
    errors.push(createNotificationError(
      'validation',
      'INVALID_FIELD_VALUE',
      'Points must be a non-negative number',
      { event, field: 'points', value: event.points },
      'low'
    ));
  }
  
  return errors;
}

/**
 * Create error for rendering failures
 */
export function createRenderingError(
  component: string,
  operation: string,
  error: Error,
  context?: any
): NotificationError {
  return createNotificationError(
    'rendering',
    'COMPONENT_RENDER_FAILED',
    `Failed to ${operation} ${component}: ${error.message}`,
    { component, operation, originalError: error, ...context },
    'medium'
  );
}

/**
 * Create error for SSE connection issues
 */
export function createSSEError(
  code: string,
  message: string,
  context?: any
): NotificationError {
  const severity: NotificationError['severity'] = 
    ['CONNECTION_FAILED', 'AUTHENTICATION_FAILED'].includes(code) ? 'high' : 'medium';
  
  return createNotificationError(
    'sse',
    code,
    message,
    context,
    severity
  );
}

/**
 * Create error for webhook processing issues
 */
export function createWebhookError(
  code: string,
  message: string,
  context?: any
): NotificationError {
  const severity: NotificationError['severity'] = 
    ['AUTHENTICATION_FAILED', 'INVALID_SIGNATURE'].includes(code) ? 'high' : 'medium';
  
  return createNotificationError(
    'webhook',
    code,
    message,
    context,
    severity
  );
}

/**
 * Create error for network issues
 */
export function createNetworkError(
  code: string,
  message: string,
  context?: any
): NotificationError {
  return createNotificationError(
    'network',
    code,
    message,
    context,
    'medium'
  );
}

/**
 * Safely execute DOM operations with error handling
 */
export function safeDOMOperation<T>(
  operation: () => T,
  operationName: string,
  onError?: (error: NotificationError) => void
): T | null {
  try {
    return operation();
  } catch (error) {
    const notificationError = createRenderingError(
      'DOM',
      operationName,
      error instanceof Error ? error : new Error(String(error))
    );
    
    if (onError) {
      onError(notificationError);
    }
    
    return null;
  }
}

/**
 * Safely parse JSON with error handling
 */
export function safeJSONParse(
  jsonString: string,
  onError?: (error: NotificationError) => void
): any | null {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    const notificationError = createNotificationError(
      'validation',
      'JSON_PARSE_ERROR',
      `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
      { jsonString },
      'medium'
    );
    
    if (onError) {
      onError(notificationError);
    }
    
    return null;
  }
}

/**
 * Check if an error is critical and requires immediate attention
 */
export function isCriticalError(error: NotificationError): boolean {
  return error.severity === 'critical' || 
         (error.severity === 'high' && ['AUTHENTICATION_FAILED', 'INVALID_ENDPOINT'].includes(error.code));
}

/**
 * Get user-friendly error message for display
 */
export function getUserFriendlyErrorMessage(error: NotificationError): string {
  switch (error.type) {
    case 'network':
      return 'Network connection issue. Notifications may be delayed.';
    case 'sse':
      return 'Real-time connection issue. Trying to reconnect...';
    case 'webhook':
      return 'Challenge data processing issue. Some notifications may be missed.';
    case 'rendering':
      return 'Display issue. Notifications may appear differently.';
    case 'validation':
      return 'Data format issue. Some notifications may be skipped.';
    case 'system':
      return 'System issue. Operating in reduced functionality mode.';
    default:
      return 'An unexpected issue occurred. System is attempting to recover.';
  }
}

/**
 * Log error with appropriate level based on severity
 */
export function logNotificationError(error: NotificationError): void {
  const logMessage = `[${error.type.toUpperCase()}:${error.code}] ${error.message}`;
  const logContext = {
    timestamp: error.timestamp,
    recoverable: error.recoverable,
    context: error.context
  };
  
  switch (error.severity) {
    case 'critical':
      console.error(logMessage, logContext);
      break;
    case 'high':
      console.error(logMessage, logContext);
      break;
    case 'medium':
      console.warn(logMessage, logContext);
      break;
    case 'low':
      console.info(logMessage, logContext);
      break;
  }
}