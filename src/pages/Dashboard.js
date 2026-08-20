import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import './Dashboard.css';

function Dashboard() {
  const [stats, setStats] = useState({
    projects: 0,
    services: 0,
    logs: 0,
    healthyServices: 0,
    totalServices: 0,
  });
  const [healthStatus, setHealthStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const [projects, services, health] = await Promise.all([
        api.projects.list(),
        api.services.list(),
        api.health.status(),
      ]);

      setStats({
        projects: projects.length,
        services: services.length,
        logs: 0,
        healthyServices: health.filter((h) => h.status === 'UP').length,
        totalServices: health.length,
      });
      setHealthStatus(health.slice(0, 5));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="dashboard loading">
        <div className="skeleton-stats">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard error">
        <div className="error-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <h2>Failed to load dashboard</h2>
          <p>{error}</p>
          <button onClick={loadDashboardData} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="page-subtitle">Overview of your monitoring infrastructure</p>
      </div>

      <div className="stats-grid">
        <StatCard
          label="Projects"
          value={stats.projects}
          icon={<ProjectsIcon />}
          link="/projects"
        />
        <StatCard
          label="Services"
          value={stats.services}
          icon={<ServicesIcon />}
          link="/services"
        />
        <StatCard
          label="Healthy Services"
          value={`${stats.healthyServices} / ${stats.totalServices}`}
          icon={<HealthIcon />}
          link="/health"
          trend={stats.totalServices > 0 ? `${Math.round((stats.healthyServices / stats.totalServices) * 100)}%` : 'N/A'}
        />
        <StatCard
          label="Total Logs"
          value={stats.logs}
          icon={<LogsIcon />}
          link="/logs"
        />
      </div>

      <div className="dashboard-grid">
        <section className="card">
          <div className="card-header">
            <h2>Service Health</h2>
            <Link to="/health" className="card-link">View all</Link>
          </div>
          <div className="card-body">
            {healthStatus.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <p>No services registered yet</p>
                <Link to="/services" className="btn btn-primary btn-sm">
                  Add Service
                </Link>
              </div>
            ) : (
              <div className="health-list">
                {healthStatus.map((service) => (
                  <div key={service.serviceId} className="health-item">
                    <div className="health-info">
                      <span className={`status-badge ${service.status.toLowerCase()}`}>
                        {service.status}
                      </span>
                      <span className="service-name">{service.serviceName}</span>
                    </div>
                    <div className="health-meta">
                      {service.responseTimeMs !== null && (
                        <span className="response-time">{service.responseTimeMs}ms</span>
                      )}
                      <span className="last-checked">
                        {formatRelativeTime(service.lastCheckedAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Quick Actions</h2>
          </div>
          <div className="card-body">
            <div className="quick-actions">
              <Link to="/projects" className="action-btn">
                <ProjectsIcon />
                <span>Create Project</span>
              </Link>
              <Link to="/services" className="action-btn">
                <ServicesIcon />
                <span>Register Service</span>
              </Link>
              <Link to="/logs" className="action-btn">
                <LogsIcon />
                <span>View Logs</span>
              </Link>
              <Link to="/metrics" className="action-btn">
                <MetricsIcon />
                <span>Explore Metrics</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, link, trend }) {
  return (
    <Link to={link} className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
        {trend && <span className="stat-trend">{trend} healthy</span>}
      </div>
    </Link>
  );
}

function ProjectsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function ServicesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  );
}

function LogsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function MetricsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function HealthIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
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

export default Dashboard;