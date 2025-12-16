import { AsyncLocalStorage } from 'async_hooks';
import * as http from 'http';
import * as https from 'https';
import { NextRequest } from 'next/server';

type Call = {
  id: string;
  url: string;
  method: string;
  ms: number;
  status?: number;
  error?: string;
  requestHeaders?: Record<string, any>;
  requestBody?: any;
  responseHeaders?: Record<string, any>;
  responseBody?: any;
  timing?: {
    socket?: number;
    lookup?: number;
    connect?: number;
    secureConnect?: number;
    response?: number;
    end?: number;
  };
};

const ctx = new AsyncLocalStorage<Call[]>();

// Helper to safely stringify potentially large objects
function safeStringify(obj: any, maxLength = 10000): any {
  try {
    const str = JSON.stringify(obj);
    if (str.length > maxLength) {
      return str.substring(0, maxLength) + '... [truncated]';
    }
    return obj;
  } catch (e) {
    return '[Unable to serialize]';
  }
}

// Helper to capture response body from IncomingMessage
function captureResponseBody(res: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let capturedBody = '';

    const originalOn = res.on.bind(res);

    // Intercept data events to capture body
    res.on = function(event: string, listener: any) {
      if (event === 'data') {
        return originalOn(event, (chunk: Buffer) => {
          chunks.push(chunk);
          listener(chunk);
        });
      }
      return originalOn(event, listener);
    } as any;

    res.once('end', () => {
      try {
        capturedBody = Buffer.concat(chunks).toString('utf-8');
        // Try to parse as JSON if possible, otherwise keep as string
        try {
          const parsed = JSON.parse(capturedBody);
          resolve(safeStringify(parsed));
        } catch {
          resolve(capturedBody.substring(0, 10000)); // Limit text responses
        }
      } catch (e) {
        resolve('[Error capturing body]');
      }
    });
  });
}

// Patch both http and https
function patchModule(mod: typeof http | typeof https, protocol: string) {
  const original = mod.request;

  // @ts-expect-error - patching
  mod.request = function(urlOrOptions: any, optionsOrCallback?: any, maybeCallback?: any) {
    const calls = ctx.getStore();

    // Parse URL
    let url: string;
    let options: http.RequestOptions;
    let callback: ((res: http.IncomingMessage) => void) | undefined;

    if (typeof urlOrOptions === 'string' || urlOrOptions instanceof URL) {
      url = urlOrOptions.toString();
      if (typeof optionsOrCallback === 'function') {
        options = {};
        callback = optionsOrCallback;
      } else {
        options = optionsOrCallback || {};
        callback = maybeCallback;
      }
    } else {
      options = urlOrOptions;
      url = `${protocol}//${options.hostname || options.host}${options.path || '/'}`;
      callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback;
    }

    // Skip local calls or if no tracking context
    if (!calls) {
      return original.call(mod, urlOrOptions, optionsOrCallback, maybeCallback);
    }

    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return original.call(mod, urlOrOptions, optionsOrCallback, maybeCallback);
    }

    const start = Date.now();
    const id = `${start}-${Math.random().toString(36).slice(2, 6)}`;
    const method = (options.method || 'GET').toUpperCase();

    // Capture request headers (sanitize sensitive ones)
    const requestHeaders: Record<string, any> = { ...options.headers };
    if (requestHeaders['authorization']) requestHeaders['authorization'] = '***';
    if (requestHeaders['Authorization']) requestHeaders['Authorization'] = '***';

    // Initialize timing object
    const timing: Call['timing'] = {};

    const wrappedCallback = async (res: http.IncomingMessage) => {
      timing.response = Date.now() - start;

      // Capture response headers
      const responseHeaders: Record<string, any> = { ...res.headers };

      // Start capturing response body
      const responseBodyPromise = captureResponseBody(res);

      const call: Call = {
        id,
        url: url.replace(/([?&])(api_?key|token|secret|password|authorization)=[^&]*/gi, '$1$2=***'),
        method,
        ms: Date.now() - start,
        status: res.statusCode,
        requestHeaders,
        responseHeaders,
        timing,
      };

      // Wait for response body to be captured
      res.once('end', async () => {
        timing.end = Date.now() - start;
        call.ms = timing.end;
        call.responseBody = await responseBodyPromise;
      });

      calls.push(call);
      callback?.(res);
    };

    const req = original.call(mod, urlOrOptions, optionsOrCallback, callback ? wrappedCallback : undefined);

    // Track timing events
    req.on('socket', (socket) => {
      timing.socket = Date.now() - start;

      socket.on('lookup', () => {
        timing.lookup = Date.now() - start;
      });

      socket.on('connect', () => {
        timing.connect = Date.now() - start;
      });

      socket.on('secureConnect', () => {
        timing.secureConnect = Date.now() - start;
      });
    });

    req.on('error', (err) => {
      const call: Call = {
        id,
        url: url.replace(/([?&])(api_?key|token|secret|password|authorization)=[^&]*/gi, '$1$2=***'),
        method,
        ms: Date.now() - start,
        error: err.message,
        requestHeaders,
        timing,
      };
      calls.push(call);
    });

    return req;
  };
}

patchModule(http, 'http:');
patchModule(https, 'https:');

// Also patch fetch for good measure (covers modern SDKs)
const _fetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : String(input);
  const calls = ctx.getStore();

  if (!calls) {
    return _fetch(input, init);
  }

  if (url.startsWith('/') || url.includes('localhost')) {
    return _fetch(input, init);
  }

  const t = Date.now();
  const method = init?.method || 'GET';

  // Capture request headers
  const requestHeaders: Record<string, any> = {};
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((value, key) => {
        requestHeaders[key] = key.toLowerCase().includes('auth') || key.toLowerCase().includes('token') ? '***' : value;
      });
    } else if (Array.isArray(init.headers)) {
      init.headers.forEach(([key, value]) => {
        requestHeaders[key] = key.toLowerCase().includes('auth') || key.toLowerCase().includes('token') ? '***' : value;
      });
    } else {
      Object.entries(init.headers).forEach(([key, value]) => {
        requestHeaders[key] = key.toLowerCase().includes('auth') || key.toLowerCase().includes('token') ? '***' : value;
      });
    }
  }

  // Capture request body
  let requestBody: any = undefined;
  if (init?.body) {
    try {
      if (typeof init.body === 'string') {
        try {
          requestBody = safeStringify(JSON.parse(init.body));
        } catch {
          requestBody = init.body.substring(0, 1000); // Limit string length
        }
      } else {
        requestBody = '[Binary or FormData]';
      }
    } catch (e) {
      requestBody = '[Unable to capture]';
    }
  }

  try {
    const r = await _fetch(input, init);

    // Capture response headers
    const responseHeaders: Record<string, any> = {};
    r.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Capture response body (clone so original response isn't consumed)
    let responseBody: any;
    try {
      const cloned = r.clone();
      const contentType = r.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseBody = safeStringify(await cloned.json());
      } else {
        const text = await cloned.text();
        responseBody = text.substring(0, 10000); // Limit text length
      }
    } catch (e) {
      responseBody = '[Unable to capture body]';
    }

    const call: Call = {
      id: `${t}`,
      url,
      method,
      ms: Date.now() - t,
      status: r.status,
      requestHeaders,
      requestBody,
      responseHeaders,
      responseBody,
    };

    calls.push(call);
    return r;
  } catch (e: any) {
    const call: Call = {
      id: `${t}`,
      url,
      method,
      ms: Date.now() - t,
      error: e.message,
      requestHeaders,
      requestBody,
    };
    calls.push(call);
    throw e;
  }
};

// The wrapper export
export const track = (fn: (r: NextRequest, c?: any) => Promise<Response>) =>
  async (req: NextRequest, c?: any) => {
    const calls: Call[] = [];

    const res = await ctx.run(calls, () => {
      return fn(req, c);
    });

    if (calls.length > 0) {
      const nr = new Response(res.body, res);
      nr.headers.set('x-api-calls', JSON.stringify(calls));
      return nr;
    }

    return res;
  };
