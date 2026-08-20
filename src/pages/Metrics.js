import React, { useEffect, useState } from 'react';
import api from '../api/client';
import './Metrics.css';

const BUCKET_OPTIONS = ['1 minute', '5 minutes', '15 minutes', '1 hour', '1 day'];
const COMMON_METRICS = ['cpu_usage', 'memory_usage', 'request_count', 'error_rate', 'response_time'];

function Metrics() {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [metricName, setMetricName] = useState('');
  const [customMetric, setCustomMetric] = useState('');
  const [bucket, setBucket] = useState('1 minute');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    if (selectedService && metricName) {
      loadMetrics();
    } else {
      setData([]);
    }
  }, [selectedService, metricName, bucket, from, to]);

  async function loadServices() {
    try {
      console.log('Fetching services for metrics...');
      const data = await api.services.list();
      console.log('Services data received:', data);
      setServices(data || []);
      if (data && data.length > 0) {
        setSelectedService(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load services:', err);
    }
  }

  async function loadMetrics() {
    setLoading(true);
    setError(null);
    try {
      const params = {
        bucket,
        ...(from && { from: new Date(from).toISOString() }),
        ...(to && { to: new Date(to).toISOString() }),
      };
      console.log('Fetching metrics with params:', { serviceId: selectedService, metricName: metricName || customMetric, ...params });
      const response = await api.metrics.query(selectedService, metricName || customMetric, params);
      console.log('Metrics response:', response);
      setData(response.points || []);
    } catch (err) {
      console.error('Error loading metrics:', err);
      setError(err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  function handleServiceChange(serviceId) {
    setSelectedService(serviceId);
  }

  function handleMetricChange(metric) {
    setMetricName(metric);
    setCustomMetric('');
  }

  function handleCustomMetricChange(value) {
    setCustomMetric(value);
    setMetricName('');
  }

  function handleQuery() {
    loadMetrics();
  }

  const hasData = data.length > 0;

  return (
    <div className="metrics">
      <div className="page-header">
        <div>
          <h1>Metrics</h1>
          <p className="page-subtitle">Time-series charts for service metrics</p>
        </div>
      </div>

      <section className="filters-card card">
        <div className="card-header">
          <h2>Query Parameters</h2>
          <button className="btn btn-sm btn-primary" onClick={handleQuery}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Query
          </button>
        </div>
        <div className="card-body">
          <div className="filters-grid">
            <div className="form-group">
              <label htmlFor="service">Service *</label>
              <select
                id="service"
                value={selectedService}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="filter-select"
                disabled={services.length === 0}
              >
                {services.length === 0 ? (
                  <option value="">No services available</option>
                ) : (
                  services.map((s) => (
                    <option key={s.id} value={s.id}>{s.serviceName}</option>
                  ))
                )}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="metric">Metric</label>
              <select
                id="metric"
                value={metricName}
                onChange={(e) => handleMetricChange(e.target.value)}
                className="filter-select"
              >
                <option value="">Custom...</option>
                {COMMON_METRICS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="customMetric">Custom Metric</label>
              <input
                type="text"
                id="customMetric"
                value={customMetric}
                onChange={(e) => handleCustomMetricChange(e.target.value)}
                placeholder="e.g., disk_usage"
                className="filter-input"
                disabled={metricName !== ''}
              />
            </div>
            <div className="form-group">
              <label htmlFor="bucket">Bucket Size</label>
              <select
                id="bucket"
                value={bucket}
                onChange={(e) => setBucket(e.target.value)}
                className="filter-select"
              >
                {BUCKET_OPTIONS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="from">From</label>
              <input
                type="datetime-local"
                id="from"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="filter-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="to">To</label>
              <input
                type="datetime-local"
                id="to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="filter-input"
              />
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="error-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>Failed to load metrics: {error}</span>
        </div>
      )}

      <section className="chart-card card">
        <div className="card-header">
          <h2>{metricName || customMetric || 'Metric'} — Time Series</h2>
          {hasData && (
            <div className="metric-stats">
              <span className="stat-item">Min: {formatNumber(getMin(data))}</span>
              <span className="stat-item">Avg: {formatNumber(getAvg(data))}</span>
              <span className="stat-item">Max: {formatNumber(getMax(data))}</span>
            </div>
          )}
        </div>
        <div className="card-body">
          {!selectedService ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <h3>No service selected</h3>
              <p>Select a service to view its metrics</p>
            </div>
          ) : !metricName && !customMetric ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <h3>Select a metric</h3>
              <p>Choose a metric to visualize</p>
            </div>
          ) : loading ? (
            <div className="chart-loading">
              <div className="chart-skeleton" />
            </div>
          ) : !hasData ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="12" x2="18" y2="12" />
                <line x1="6" y1="12" x2="2" y2="12" />
                <line x1="12" y1="18" x2="12" y2="14" />
                <line x1="12" y1="6" x2="12" y2="2" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              <h3>No data found</h3>
              <p>No metric data available for this time range</p>
            </div>
          ) : (
            <MetricChart data={data} />
          )}
        </div>
      </section>
    </div>
  );
}

function MetricChart({ data }) {
  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = data.map((d) => d.value).filter((v) => v !== null && v !== undefined);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
    const y = padding.top + chartHeight - ((d.value - minValue) / range) * chartHeight;
    return { x, y, ...d };
  });

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${pathData} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

  const gridLines = 5;
  const yTicks = [];
  for (let i = 0; i <= gridLines; i++) {
    const value = minValue + (range * i) / gridLines;
    const y = padding.top + chartHeight - (i / gridLines) * chartHeight;
    yTicks.push({ value, y });
  }

  const xTickCount = Math.min(8, data.length);
  const xTicks = [];
  for (let i = 0; i < xTickCount; i++) {
    const dataIndex = Math.floor((i / (xTickCount - 1)) * (data.length - 1));
    const point = points[dataIndex];
    if (point) {
      xTicks.push(point);
    }
  }

  return (
    <div className="chart-wrapper">
      <svg viewBox={`0 0 ${width} ${height}`} className="metric-chart" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={tick.y}
              x2={width - padding.right}
              y2={tick.y}
              stroke="var(--color-border)"
              strokeWidth="1"
            />
            <text
              x={padding.left - 10}
              y={tick.y + 4}
              textAnchor="end"
              className="chart-label"
            >
              {formatNumber(tick.value)}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="url(#areaGradient)" />
        <path d={pathData} fill="none" stroke="var(--color-primary)" strokeWidth="2" />

        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--color-primary)" className="chart-point" />
        ))}

        {xTicks.map((tick, i) => (
          <text
            key={i}
            x={tick.x}
            y={height - padding.bottom + 20}
            textAnchor="middle"
            className="chart-label"
          >
            {formatTime(tick.timestamp)}
          </text>
        ))}
      </svg>
    </div>
  );
}

function getMin(data) {
  const values = data.map((d) => d.value).filter((v) => v !== null && v !== undefined);
  return values.length ? Math.min(...values) : 0;
}

function getMax(data) {
  const values = data.map((d) => d.value).filter((v) => v !== null && v !== undefined);
  return values.length ? Math.max(...values) : 0;
}

function getAvg(data) {
  const values = data.map((d) => d.value).filter((v) => v !== null && v !== undefined);
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function formatNumber(num) {
  if (num === null || num === undefined) return '—';
  if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toFixed(2);
}

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default Metrics;