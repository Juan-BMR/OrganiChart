import { writable } from 'svelte/store';

export interface AIError {
  id: string;
  timestamp: Date;
  type: 'network' | 'api' | 'timeout' | 'quota' | 'validation' | 'unknown';
  message: string;
  details?: any;
  retryCount: number;
  maxRetries: number;
  context?: string;
}

export const aiErrors = writable<AIError[]>([]);
export const isRetrying = writable(false);

const RETRY_DELAYS = [1000, 2000, 5000]; // Progressive backoff
const MAX_ERRORS_STORED = 50;

export function createError(
  type: AIError['type'],
  message: string,
  details?: any,
  context?: string
): AIError {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    type,
    message,
    details,
    retryCount: 0,
    maxRetries: getMaxRetries(type),
    context,
  };
}

function getMaxRetries(type: AIError['type']): number {
  switch (type) {
    case 'network':
    case 'timeout':
      return 3;
    case 'api':
      return 2;
    case 'quota':
      return 0; // Don't retry quota errors
    case 'validation':
      return 1;
    default:
      return 2;
  }
}

export function shouldRetry(error: AIError): boolean {
  return error.retryCount < error.maxRetries;
}

export function addError(error: AIError) {
  aiErrors.update(errors => {
    const newErrors = [error, ...errors];
    // Keep only the most recent errors
    return newErrors.slice(0, MAX_ERRORS_STORED);
  });
}

export function clearErrors() {
  aiErrors.set([]);
}

export function removeError(errorId: string) {
  aiErrors.update(errors => errors.filter(e => e.id !== errorId));
}

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  errorType: AIError['type'],
  context?: string
): Promise<T> {
  let lastError: AIError | null = null;

  for (let attempt = 0; attempt <= getMaxRetries(errorType); attempt++) {
    try {
      if (attempt > 0) {
        isRetrying.set(true);
        const delay = RETRY_DELAYS[Math.min(attempt - 1, RETRY_DELAYS.length - 1)];
        await sleep(delay);
      }

      const result = await operation();
      isRetrying.set(false);
      return result;
    } catch (error) {
      const aiError = lastError || createError(
        errorType,
        error instanceof Error ? error.message : 'Unknown error',
        error,
        context
      );
      
      aiError.retryCount = attempt;
      lastError = aiError;

      // If this is the last attempt, add the error and throw
      if (attempt === getMaxRetries(errorType)) {
        addError(aiError);
        isRetrying.set(false);
        throw error;
      }
    }
  }

  isRetrying.set(false);
  throw new Error('Unexpected retry loop completion');
}

export function parseErrorType(error: any): AIError['type'] {
  if (!error) return 'unknown';
  
  const message = error.message?.toLowerCase() || '';
  const status = error.status || error.code;

  // Network errors
  if (message.includes('network') || message.includes('fetch') || status === 'NETWORK_ERROR') {
    return 'network';
  }

  // Timeout errors
  if (message.includes('timeout') || status === 'TIMEOUT') {
    return 'timeout';
  }

  // API quota/rate limit errors
  if (status === 429 || message.includes('quota') || message.includes('rate limit')) {
    return 'quota';
  }

  // Validation errors
  if (status >= 400 && status < 500 && status !== 429) {
    return 'validation';
  }

  // API errors
  if (status >= 500 || message.includes('api') || message.includes('server')) {
    return 'api';
  }

  return 'unknown';
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Enhanced sendMessage wrapper with error handling
export async function sendMessageWithRetry(
  originalSendMessage: Function,
  message: string,
  options: any = {}
): Promise<string> {
  return retryWithBackoff(
    () => originalSendMessage(message, options),
    'api',
    `Sending message: "${message.substring(0, 50)}..."`
  );
}