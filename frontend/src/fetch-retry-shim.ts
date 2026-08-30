// Browser shim for the `fetch-retry` package.
//
// `fetch-retry@6` ships only a UMD bundle (`module.exports = factory()`) — no
// ESM `default` export. Vite serves it via `?v=...` (optimizeDeps cache-bust)
// and evaluates it as native ESM, so `import fetchBuilder from 'fetch-retry'`
// throws "does not provide an export named 'default'".
//
// This is a direct ESM port of the UMD factory logic, unchanged.

function isPositiveInteger(value: unknown): boolean {
  return Number.isInteger(value as number) && (value as number) >= 0;
}

function ArgumentError(this: any, message: string) {
  this.name = 'ArgumentError';
  this.message = message;
}

type RetryDelayFn = (
  attempt: number,
  error: unknown,
  response: Response | null,
) => number;
type RetryOnFn = (
  attempt: number,
  error: unknown,
  response: Response | null,
) => boolean | Promise<boolean>;

export interface FetchRetryDefaults {
  retries?: number;
  retryDelay?: number | RetryDelayFn;
  retryOn?: number[] | RetryOnFn;
}

export interface FetchRetryInit extends RequestInit {
  retries?: number;
  retryDelay?: number | RetryDelayFn;
  retryOn?: number[] | RetryOnFn;
}

const fetchRetry = function fetchRetry(
  fetch: typeof globalThis.fetch,
  defaults: FetchRetryDefaults = {},
) {
  if (typeof fetch !== 'function') {
    throw new (ArgumentError as any)('fetch must be a function');
  }
  if (typeof defaults !== 'object') {
    throw new (ArgumentError as any)('defaults must be an object');
  }
  if (defaults.retries !== undefined && !isPositiveInteger(defaults.retries)) {
    throw new (ArgumentError as any)('retries must be a positive integer');
  }
  if (
    defaults.retryDelay !== undefined &&
    !isPositiveInteger(defaults.retryDelay) &&
    typeof defaults.retryDelay !== 'function'
  ) {
    throw new (ArgumentError as any)(
      'retryDelay must be a positive integer or a function returning a positive integer',
    );
  }
  if (
    defaults.retryOn !== undefined &&
    !Array.isArray(defaults.retryOn) &&
    typeof defaults.retryOn !== 'function'
  ) {
    throw new (ArgumentError as any)(
      'retryOn property expects an array or function',
    );
  }

  const baseDefaults = {
    retries: 3,
    retryDelay: 1000,
    retryOn: [] as number[] | RetryOnFn,
  };
  defaults = Object.assign(baseDefaults, defaults);

  return function fetchRetryFetch(input: RequestInfo | URL, init?: FetchRetryInit) {
    let retries: number = defaults.retries ?? 3;
    let retryDelay: number | RetryDelayFn = defaults.retryDelay ?? 1000;
    let retryOn: number[] | RetryOnFn = defaults.retryOn ?? [];

    if (init && init.retries !== undefined) {
      if (isPositiveInteger(init.retries)) {
        retries = init.retries;
      } else {
        throw new (ArgumentError as any)('retries must be a positive integer');
      }
    }
    if (init && init.retryDelay !== undefined) {
      if (
        isPositiveInteger(init.retryDelay) ||
        typeof init.retryDelay === 'function'
      ) {
        retryDelay = init.retryDelay;
      } else {
        throw new (ArgumentError as any)(
          'retryDelay must be a positive integer or a function returning a positive integer',
        );
      }
    }
    if (init && init.retryOn) {
      if (Array.isArray(init.retryOn) || typeof init.retryOn === 'function') {
        retryOn = init.retryOn;
      } else {
        throw new (ArgumentError as any)(
          'retryOn property expects an array or function',
        );
      }
    }

    return new Promise<Response>((resolve, reject) => {
      const wrappedFetch = (attempt: number) => {
        const _input =
          typeof Request !== 'undefined' && input instanceof Request
            ? input.clone()
            : input;
        fetch(_input as RequestInfo, init)
          .then((response) => {
            if (Array.isArray(retryOn) && retryOn.indexOf(response.status) === -1) {
              resolve(response);
            } else if (typeof retryOn === 'function') {
              try {
                Promise.resolve(retryOn(attempt, null, response))
                  .then((retryOnResponse) => {
                    if (retryOnResponse) {
                      retry(attempt, null, response);
                    } else {
                      resolve(response);
                    }
                  })
                  .catch(reject);
              } catch (error) {
                reject(error);
              }
            } else {
              if (attempt < retries) {
                retry(attempt, null, response);
              } else {
                resolve(response);
              }
            }
          })
          .catch((error) => {
            if (typeof retryOn === 'function') {
              try {
                Promise.resolve(retryOn(attempt, error, null))
                  .then((retryOnResponse) => {
                    if (retryOnResponse) {
                      retry(attempt, error, null);
                    } else {
                      reject(error);
                    }
                  })
                  .catch((err) => reject(err));
              } catch (err) {
                reject(err);
              }
            } else if (attempt < retries) {
              retry(attempt, error, null);
            } else {
              reject(error);
            }
          });
      };

      function retry(attempt: number, error: unknown, response: Response | null) {
        const delay =
          typeof retryDelay === 'function'
            ? retryDelay(attempt, error, response)
            : retryDelay;
        setTimeout(() => {
          wrappedFetch(++attempt);
        }, delay);
      }

      wrappedFetch(0);
    });
  };
};

export default fetchRetry;
