const API_BASE = process.env.REACT_APP_API_BASE || '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',  // Include cookies for CORS
    ...options,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const error = await response.json();
      errorMessage = error.message || error.error || errorMessage;
    } catch (e) {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204 || response.status === 202) {
    return null;
  }

  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text);
}

// Type-safe API error handler
export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// Enhanced request with better error handling
async function requestWithTypes(path, options = {}) {
  try {
    return await request(path, options);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message, 0, err);
  }
}

// Projects API
export const projectsApi = {
  list: () => requestWithTypes('/projects'),
  get: (id) => requestWithTypes(`/projects/${id}`),
  create: (data) => requestWithTypes('/projects', {
    method: 'POST',
    body: JSON.stringify({
      projectName: data.projectName,
      projectDescription: data.projectDescription || '',
    }),
  }),
  delete: (id) => requestWithTypes(`/projects/${id}`, { method: 'DELETE' }),
};

// Services API
export const servicesApi = {
  list: (projectId) => requestWithTypes(`/services${projectId ? `?projectId=${projectId}` : ''}`),
  get: (id) => requestWithTypes(`/services/${id}`),
  create: (data) => requestWithTypes('/services', {
    method: 'POST',
    body: JSON.stringify({
      projectId: data.projectId,
      serviceName: data.serviceName,
      baseUrl: data.baseUrl,
      healthCheckEndpoint: data.healthCheckEndpoint || '/actuator/health',
      apiKey: data.apiKey || undefined,
    }),
  }),
  delete: (id) => requestWithTypes(`/services/${id}`, { method: 'DELETE' }),
};

// Logs API
export const logsApi = {
  query: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    return requestWithTypes(`/logs?${searchParams.toString()}`);
  },
  ingest: (data) => requestWithTypes('/logs', {
    method: 'POST',
    body: JSON.stringify({
      serviceId: data.serviceId,
      timestamp: data.timestamp || new Date().toISOString(),
      level: data.level,
      logger: data.logger || '',
      thread: data.thread || '',
      message: data.message,
    }),
  }),
};

// Metrics API
export const metricsApi = {
  query: (serviceId, metricName, params = {}) => {
    const searchParams = new URLSearchParams();
    searchParams.append('serviceId', serviceId);
    searchParams.append('metricName', metricName);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    return requestWithTypes(`/metrics?${searchParams.toString()}`);
  },
};

// Health API
export const healthApi = {
  status: () => requestWithTypes('/health'),
  statusByService: (serviceId) => requestWithTypes(`/health/${serviceId}`),
};

export default {
  projects: projectsApi,
  services: servicesApi,
  logs: logsApi,
  metrics: metricsApi,
  health: healthApi,
  // Export error class for consumers
  ApiError,
};