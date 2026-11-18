import TelemetryPanel from './TelemetryPanel';
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import './ServiceDetail.css';

function ServiceDetail() {
  const { serviceId } = useParams();
  const [service, setService] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [serviceId]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching service and health for:', serviceId);
      const [serviceData, healthData] = await Promise.all([
        api.services.get(serviceId),
        api.health.statusByService(serviceId).catch(() => null),
      ]);
      console.log('Service data received:', serviceData);
      console.log('Health data received:', healthData);
      setService(serviceData);
      setHealth(healthData);
    } catch (err) {
      console.error('Error loading service:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="service-detail loading">
        <div className="page-header">
          <h1>Loading...</h1>
        </div>
        <div className="skeleton-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="service-detail">
        <div className="error-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>Failed to load service: {error}</span>
          <button className="btn btn-sm" onClick={loadData}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="service-detail">
      <div className="page-header">
        <div>
          <Link to="/services" className="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Services
          </Link>
          <h1>{service?.serviceName || 'Service'}</h1>
          <p className="page-subtitle">{service?.baseUrl || ''}</p>
        </div>
      </div>

      <TelemetryPanel serviceId={serviceId} />
      <div className="detail-grid">
        <section className="detail-card">
          <div className="card-header">
            <h2>Configuration</h2>
          </div>
          <div className="card-body">
            <dl className="detail-list">
              <div className="detail-item">
                <dt>Service ID</dt>
                <dd className="mono">{service?.id}</dd>
              </div>
              <div className="detail-item">
                <dt>Project ID</dt>
                <dd className="mono">{service?.projectId}</dd>
              </div>
              <div className="detail-item">
                <dt>Base URL</dt>
                <dd className="mono"><a href={service?.baseUrl} target="_blank" rel="noopener noreferrer">{service?.baseUrl}</a></dd>
              </div>
              <div className="detail-item">
                <dt>Health Check Endpoint</dt>
                <dd className="mono">{service?.healthCheckEndpoint || '/actuator/health'}</dd>
              </div>
              <div className="detail-item">
                <dt>Full Health URL</dt>
                <dd className="mono">{service?.baseUrl}{service?.healthCheckEndpoint || '/actuator/health'}</dd>
              </div>
              <div className="detail-item">
                <dt>Created</dt>
                <dd>{formatDateTime(service?.createdAt)}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="detail-card">
          <div className="card-header">
            <h2>Health Status</h2>
          </div>
          <div className="card-body">
            {health ? (
              <div className="health-status">
                <div className={`status-badge ${health.status.toLowerCase()}`}>
                  <span className="status-dot" aria-hidden="true" />
                  {health.status}
                </div>
                <dl className="health-details">
                  {health.responseTimeMs !== null && (
                    <div className="detail-item">
                      <dt>Response Time</dt>
                      <dd>{health.responseTimeMs} ms</dd>
                    </div>
                  )}
                  <div className="detail-item">
                    <dt>Last Checked</dt>
                    <dd>{formatDateTime(health.lastCheckedAt)}</dd>
                  </div>
                  <div className="detail-item">
                    <dt>Relative</dt>
                    <dd>{formatRelativeTime(health.lastCheckedAt)}</dd>
                  </div>
                </dl>
                <button className="btn btn-secondary btn-sm" onClick={loadData}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  Refresh Health
                </button>
              </div>
            ) : (
              <div className="health-status empty">
                <p>No health data available yet</p>
                <p className="hint">Health is polled every 30 seconds. The first check may take a moment.</p>
                <button className="btn btn-secondary btn-sm" onClick={loadData}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  Check Now
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="detail-actions">
        <Link to={`/logs?serviceId=${serviceId}`} className="btn btn-outline">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          View Logs
        </Link>
        <Link to={`/metrics?serviceId=${serviceId}`} className="btn btn-outline">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          View Metrics
        </Link>
        <Link to={`/health`} className="btn btn-outline">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          Health Dashboard
        </Link>
      </div>
    </div>
  );
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).replace(',', '');
}

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${diffDay}d ago`;
}

export default ServiceDetail;