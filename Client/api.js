// ProConnect API helper
// Centralizes HTTP behavior, auth handling, and error normalization.

const API = (() => {
  const hasWindow = typeof window !== 'undefined' && typeof window.location !== 'undefined';
  if (!hasWindow) {
    const browserOnlyMessage = 'Client/api.js is browser-only. Open it via the app URL, not with "node Client/api.js".';
    const unavailable = () => {
      throw new Error(browserOnlyMessage);
    };

    if (typeof console !== 'undefined') {
      console.warn(browserOnlyMessage);
    }

    return {
      BASE: '',
      request: unavailable,
      get: unavailable,
      post: unavailable,
      put: unavailable,
      del: unavailable,
      upload: unavailable,
      authGet: unavailable,
      authPut: unavailable,
      formatError: (err, fallback = browserOnlyMessage) => {
        if (err && typeof err.message === 'string' && err.message.trim()) {
          return err.message;
        }
        return fallback;
      },
      isApiError: () => false,
    };
  }

  const LOCAL_API_PORT = '5000';

  function resolveBase() {
    const configuredBase = window.localStorage.getItem('pc_api_base');
    if (configuredBase) {
      return configuredBase;
    }

    if (window.__PC_API_BASE__) {
      return window.__PC_API_BASE__;
    }

    const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const isLiveServerPort = window.location.port === '5500';

    if (isLocalHost && isLiveServerPort) {
      return `${window.location.protocol}//${window.location.hostname}:5000/api`;
    }

    return `${window.location.origin}/api`;
  }

  const BASE = resolveBase().replace(/\/+$/, '');
  const FALLBACK_BASE = resolveFallbackBase(BASE);
  const REQUEST_TIMEOUT_MS = 12000;

  function resolveFallbackBase(primaryBase) {
    const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (!isLocalHost) {
      return null;
    }

    const fallback = `${window.location.protocol}//${window.location.hostname}:${LOCAL_API_PORT}/api`;
    const normalizedFallback = fallback.replace(/\/+$/, '');
    return normalizedFallback !== primaryBase ? normalizedFallback : null;
  }

  class ApiError extends Error {
    constructor(message, { status = 0, code = 'UNKNOWN_ERROR', details = null, cause = null } = {}) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.code = code;
      this.details = details;
      this.cause = cause;
    }
  }

  function getToken() {
    return localStorage.getItem('pc_token');
  }

  function clearSession() {
    localStorage.removeItem('pc_token');
    localStorage.removeItem('pc_user');
  }

  function defaultMessageForStatus(status) {
    if (status === 400) return 'Invalid request. Please check your input.';
    if (status === 401) return 'Your session has expired. Please sign in again.';
    if (status === 403) return 'You do not have permission to perform this action.';
    if (status === 404) return 'The requested resource was not found.';
    if (status === 405) return 'Request method is not allowed for this endpoint.';
    if (status === 409) return 'This action could not be completed due to a conflict.';
    if (status === 413) return 'The uploaded file is too large.';
    if (status >= 500) return 'Server error. Please try again shortly.';
    return 'Request failed. Please try again.';
  }

  function parseJsonSafe(text) {
    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  }

  function buildHeaders({ isFormData, customHeaders }) {
    const headers = { ...(customHeaders || {}) };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  function messageForNonApiResponse(status) {
    const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (isLocalHost) {
      return 'API endpoint is not reachable. Start backend on http://localhost:5000 and verify MySQL is running.';
    }

    return defaultMessageForStatus(status);
  }

  async function request(method, path, body = null, options = {}) {
    const { isFormData = false, headers: customHeaders = {} } = options;
    const requestOptions = {
      method,
      headers: buildHeaders({ isFormData, customHeaders }),
    };

    if (body !== null && body !== undefined) {
      requestOptions.body = isFormData ? body : JSON.stringify(body);
    }

    async function fetchWithBase(baseUrl) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(`${baseUrl}${path}`, {
          ...requestOptions,
          signal: controller.signal,
        });
        return { response, baseUrl };
      } finally {
        clearTimeout(timer);
      }
    }

    let responseInfo;
    let usedFallback = false;

    try {
      responseInfo = await fetchWithBase(BASE);
    } catch (err) {
      if (FALLBACK_BASE) {
        try {
          responseInfo = await fetchWithBase(FALLBACK_BASE);
          usedFallback = true;
          localStorage.removeItem('pc_api_base');
        } catch (fallbackErr) {
          if (fallbackErr.name === 'AbortError') {
            throw new ApiError('Request timed out. Please try again.', {
              code: 'TIMEOUT',
              cause: fallbackErr,
            });
          }
          throw new ApiError('Unable to connect to the server. Check your network and try again.', {
            code: 'NETWORK_ERROR',
            cause: fallbackErr,
          });
        }
      } else if (err.name === 'AbortError') {
        throw new ApiError('Request timed out. Please try again.', {
          code: 'TIMEOUT',
          cause: err,
        });
      } else {
        throw new ApiError('Unable to connect to the server. Check your network and try again.', {
          code: 'NETWORK_ERROR',
          cause: err,
        });
      }
    }

    let { response } = responseInfo;
    const contentType = response.headers.get('content-type') || '';
    const isJsonResponse = contentType.toLowerCase().includes('application/json');
    let text = await response.text();
    let data = isJsonResponse ? parseJsonSafe(text) : {};

    const shouldRetryWithFallback = Boolean(
      FALLBACK_BASE &&
      !usedFallback &&
      responseInfo.baseUrl === BASE &&
      (!isJsonResponse || response.status === 404)
    );

    if (shouldRetryWithFallback) {
      try {
        responseInfo = await fetchWithBase(FALLBACK_BASE);
        response = responseInfo.response;
        text = await response.text();
        const fallbackContentType = response.headers.get('content-type') || '';
        const fallbackIsJson = fallbackContentType.toLowerCase().includes('application/json');
        data = fallbackIsJson ? parseJsonSafe(text) : {};
        localStorage.removeItem('pc_api_base');
      } catch {
        // Ignore fallback errors and continue with original response analysis.
      }
    }

    const finalContentType = response.headers.get('content-type') || '';
    const finalIsJsonResponse = finalContentType.toLowerCase().includes('application/json');
    if (finalIsJsonResponse && !data.message && text) {
      data = parseJsonSafe(text);
    }

    if (response.status === 401) {
      clearSession();
      const isOnLoginPage = window.location.pathname.endsWith('/login.html') || window.location.pathname.endsWith('login.html');
      if (!isOnLoginPage) {
        window.location.href = 'login.html';
      }

      throw new ApiError(data.message || defaultMessageForStatus(401), {
        status: 401,
        code: 'UNAUTHORIZED',
        details: data,
      });
    }

    if (!response.ok) {
      const message = data.message || (finalIsJsonResponse ? defaultMessageForStatus(response.status) : messageForNonApiResponse(response.status));
      throw new ApiError(message, {
        status: response.status,
        code: data.code || `HTTP_${response.status}`,
        details: data,
      });
    }

    // Successful non-JSON responses are treated as unexpected for this API.
    if (!finalIsJsonResponse) {
      throw new ApiError('Received an unexpected response from server.', {
        status: response.status,
        code: 'INVALID_RESPONSE_FORMAT',
      });
    }

    return data;
  }

  function formatError(err, fallback = 'Something went wrong. Please try again.') {
    if (!err) {
      return fallback;
    }

    if (err instanceof ApiError) {
      return err.message;
    }

    if (typeof err.message === 'string' && err.message.trim()) {
      return err.message;
    }

    return fallback;
  }

  return {
    BASE,
    request,
    get: (path) => request('GET', path),
    post: (path, data) => request('POST', path, data),
    put: (path, data) => request('PUT', path, data),
    del: (path) => request('DELETE', path),
    upload: (path, formData) => request('POST', path, formData, { isFormData: true }),
    authGet: (path) => request('GET', path),
    authPut: (path, data) => request('PUT', path, data),
    formatError,
    isApiError: (err) => err instanceof ApiError,
  };
})();

if (typeof window !== 'undefined') {
  window.API = API;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}
