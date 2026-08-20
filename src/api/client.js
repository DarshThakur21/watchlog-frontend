const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:7000/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  if (response.status === 204 || response.status === 202) {
    return null;
  }

  return response.json();
}

// Projects API
export const projectsApi = {
  list: () => request('/projects'),
  get: (id) => request(`/projects/${id}`),
  create: (data) => request('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Services API
export const servicesApi = {
  list: (projectId) => request(`/services${projectId ? `?projectId=${projectId}` : ''}`),
  get: (id) => request(`/services/${id}`),
  create: (data) => request('/services', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
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
    return request(`/logs?${searchParams.toString()}`);
  },
  ingest: (data) => request('/logs', {
    method: 'POST',
    body: JSON.stringify(data),
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
    return request(`/metrics?${searchParams.toString()}`);
  },
};

// Health API
export const healthApi = {
  status: () => request('/health'),
  statusByService: (serviceId) => request(`/health/${serviceId}`),
};

export default {
  projects: projectsApi,
  services: servicesApi,
  logs: logsApi,
  metrics: metricsApi,
  health: healthApi,
};