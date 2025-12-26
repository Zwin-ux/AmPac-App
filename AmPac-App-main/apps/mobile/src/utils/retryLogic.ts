export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitter: boolean;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffFactor: 2,
  jitter: true,
};

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const startTime = Date.now();
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const data = await fn();
      return {
        success: true,
        data,
        attempts: attempt,
        totalTime: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on the last attempt
      if (attempt === opts.maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff
      let delay = opts.baseDelay * Math.pow(opts.backoffFactor, attempt - 1);
      
      // Apply maximum delay limit
      delay = Math.min(delay, opts.maxDelay);
      
      // Add jitter to prevent thundering herd
      if (opts.jitter) {
        delay = delay * (0.5 + Math.random() * 0.5);
      }

      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms:`, (error as Error).message);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: lastError!,
    attempts: opts.maxAttempts,
    totalTime: Date.now() - startTime,
  };
}

/**
 * Retry a function with linear backoff
 */
export async function retryWithLinearBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const data = await fn();
      return {
        success: true,
        data,
        attempts: attempt,
        totalTime: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxAttempts) {
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms:`, (error as Error).message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  return {
    success: false,
    error: lastError!,
    attempts: maxAttempts,
    totalTime: Date.now() - startTime,
  };
}

/**
 * Retry with custom condition
 */
export async function retryWithCondition<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: Error, attempt: number) => boolean,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const data = await fn();
      return {
        success: true,
        data,
        attempts: attempt,
        totalTime: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxAttempts && shouldRetry(lastError, attempt)) {
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms:`, (error as Error).message);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        break;
      }
    }
  }

  return {
    success: false,
    error: lastError!,
    attempts: maxAttempts,
    totalTime: Date.now() - startTime,
  };
}

/**
 * Common retry conditions
 */
export const RetryConditions = {
  /**
   * Retry on network errors
   */
  networkErrors: (error: Error): boolean => {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('fetch') ||
      message.includes('unavailable')
    );
  },

  /**
   * Retry on 5xx HTTP errors
   */
  serverErrors: (error: Error): boolean => {
    const message = error.message;
    return /5\d{2}/.test(message); // Match 500-599 status codes
  },

  /**
   * Retry on specific Firebase errors
   */
  firebaseErrors: (error: Error): boolean => {
    const message = error.message.toLowerCase();
    return (
      message.includes('unavailable') ||
      message.includes('deadline-exceeded') ||
      message.includes('internal') ||
      message.includes('resource-exhausted')
    );
  },

  /**
   * Never retry (for testing)
   */
  never: (): boolean => false,

  /**
   * Always retry (be careful with this)
   */
  always: (): boolean => true,
};

/**
 * Utility to create a retryable version of a function
 */
export function makeRetryable<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: Partial<RetryOptions> = {}
) {
  return async (...args: T): Promise<R> => {
    const result = await retryWithBackoff(() => fn(...args), options);
    
    if (result.success) {
      return result.data!;
    } else {
      throw result.error;
    }
  };
}

/**
 * Circuit breaker pattern for preventing cascading failures
 */
export class CircuitBreaker<T extends any[], R> {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private fn: (...args: T) => Promise<R>,
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000, // 1 minute
    private successThreshold: number = 2
  ) {}

  async execute(...args: T): Promise<R> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await this.fn(...args);
      
      if (this.state === 'half-open') {
        this.failures = 0;
        this.state = 'closed';
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= this.failureThreshold) {
        this.state = 'open';
      }
      
      throw error;
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = 'closed';
  }
}