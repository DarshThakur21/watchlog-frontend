import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import './Health.css';

function Health() {
  const [health, setHealth] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedService, setSelectedService] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    setRefreshInterval(interval);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [healthData, servicesData] = await Promise.all([
        api.health.status(),
        api.services.list(),
      ]);
      setHealth(healthData);
      setServices(servicesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredHealth = selectedService
    ? health.filter((h) => h.serviceId === selectedService)
    : health;

  const statusCounts = health.reduce(
    (acc, h) => {
      acc[h.status.toLowerCase()] = (acc[h.status.toLowerCase()] || 0) + 1;
      return acc;
    },
    { up: 0, down: 0, unknown: 0 }
  );

  if (loading) {
    return (
      <div className="health loading">
        <div className="page-header">
          <h1>Health</h1>
        </div>
        <div className="skeleton-health">
          <div className="skeleton-stats">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
          <div className="skeleton-list">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton-row" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="health">
      <div className="page-header">
        <div>
          <h1>Health</h1>
          <p className="page-subtitle">Service health status overview</p>
        </div>
        <button className="btn btn-secondary" onClick={loadData} disabled={loading}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>Failed to load health status: {error}</span>
          <button className="btn btn-sm" onClick={loadData}>Retry</button>
        </div>
      )}

      <section className="status-summary">
        <StatusCard status="UP" count={statusCounts.up} color="success" icon={<UpIcon />} />
        <StatusCard status="DOWN" count={statusCounts.down} color="error" icon={<DownIcon />} />
        <StatusCard status="UNKNOWN" count={statusCounts.unknown} color="warning" icon={<UnknownIcon />} />
        <StatusCard status="TOTAL" count={health.length} color="primary" icon={<TotalIcon />} />
      </section>

      <section className="filters-card card">
        <div className="card-header">
          <h2>Filter</h2>
        </div>
        <div className="card-body">
          <div className="form-group">
            <label htmlFor="serviceFilter">Service</label>
            <select
              id="serviceFilter"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="filter-select"
            >
              <option value="">All Services</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.serviceName}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="health-card card">
        <div className="card-header">
          <h2>Service Status</h2>
        </div>
        <div className="card-body">
          {filteredHealth.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <h3>No services found</h3>
              <p>{selectedService ? 'No health data for this service' : 'Register a service to monitor its health'}</p>
            </div>
          ) : (
            <div className="health-list">
              {filteredHealth.map((service) => (
                <div key={service.serviceId} className="health-item">
                  <div className="health-main">
                    <div className="health-status">
                      <span className={`status-dot ${service.status.toLowerCase()}`} aria-hidden="true" />
                      <span className={`status-badge ${service.status.toLowerCase()}`}>{service.status}</span>
                    </div>
                    <div className="health-info">
                      <Link to={`/services/${service.serviceId}`} className="service-name">
                        {service.serviceName}
                      </Link>
                      <span className="service-id">{service.serviceId}</span>
                    </div>
                  </div>
                  <div className="health-details">
                    {service.responseTimeMs !== null && (
                      <div className="detail-item">
                        <span className="detail-label">Response Time</span>
                        <span className="detail-value response-time">{service.responseTimeMs}ms</span>
                      </div>
                    )}
                    <div className="detail-item">
                      <span className="detail-label">Last Checked</span>
                      <span className="detail-value">{formatDateTime(service.lastCheckedAt)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Relative</span>
                      <span className="detail-value relative-time">{formatRelativeTime(service.lastCheckedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatusCard({ status, count, color, icon }) {
  return (
    <div className={`status-card ${color}`}>
      <div className="status-card-icon">{icon}</div>
      <div className="status-card-content">
        <span className="status-card-label">{status}</span>
        <span className="status-card-value">{count}</span>
      </div>
    </div>
  );
}

function UpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 15l-6-6-6 6" />
    </svg>
  );
}

function DownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function UnknownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function TotalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  );
}

function formatDateTime(isoString) {
  const date = new Date(isoString);
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

export default Health;