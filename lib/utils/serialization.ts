/**
 * Creates a server action with proper serialization for Next.js server components
 */

type AnyFunction = (...args: any[]) => any;

/**
 * Creates a server action that ensures proper serialization of arguments and return values
 */
export function createServerAction<F extends AnyFunction>(
  action: F
): (...args: Parameters<F>) => Promise<Awaited<ReturnType<F>>> {
  return async function (...args: Parameters<F>) {
    try {
      // Call the original action with the provided arguments
      const result = await action(...args);
      
      // Ensure the result is serializable
      return JSON.parse(JSON.stringify(result, getCircularReplacer()));
    } catch (error) {
      console.error('Error in server action:', error);
      
      // Return a serializable error
      return {
        error: true,
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        name: error instanceof Error ? error.name : 'Error',
        stack: error instanceof Error ? error.stack : undefined
      };
    }
  };
}

/**
 * Helper function to handle circular references during JSON serialization
 */
function getCircularReplacer() {
  const seen = new WeakSet();
  return (key: string, value: any) => {
    // Handle Date objects
    if (typeof value === 'object' && value !== null) {
      if (value instanceof Date) {
        return value.toISOString();
      }
      
      // Handle circular references
      if (seen.has(value)) {
        return '[Circular]';
      }
      
      // Handle special objects
      if (value instanceof Map) {
        return Object.fromEntries(value);
      }
      
      if (value instanceof Set) {
        return Array.from(value);
      }
      
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack
        };
      }
      
      seen.add(value);
    }
    
    return value;
  };
}
