import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import './Services.css';

function Services() {
  const [services, setServices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [formData, setFormData] = useState({
    projectId: '',
    serviceName: '',
    baseUrl: '',
    healthCheckEndpoint: '/actuator/health',
    apiKey: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching services and projects...');
      const [servicesData, projectsData] = await Promise.all([
        api.services.list(),
        api.projects.list(),
      ]);
      console.log('Services data received:', servicesData);
      console.log('Projects data received:', projectsData);
      setServices(servicesData || []);
      setProjects(projectsData || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setFormError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.projectId || !formData.serviceName.trim() || !formData.baseUrl.trim()) {
      setFormError('Project, service name, and base URL are required');
      return;
    }

    try {
      setSubmitting(true);
      await api.services.create({
        projectId: formData.projectId,
        serviceName: formData.serviceName.trim(),
        baseUrl: formData.baseUrl.trim(),
        healthCheckEndpoint: formData.healthCheckEndpoint.trim() || '/actuator/health',
        apiKey: formData.apiKey.trim() || undefined,
      });
      setShowCreateModal(false);
      setFormData({ projectId: '', serviceName: '', baseUrl: '', healthCheckEndpoint: '/actuator/health', apiKey: '' });
      loadData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleDeleteClick(id) {
    setDeletingId(id);
    setDeleteConfirm(true);
  }

  async function handleDeleteConfirm() {
    if (!deletingId) return;
    try {
      await api.services.delete(deletingId);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
      setDeleteConfirm(false);
    }
  }

  function handleDeleteCancel() {
    setDeletingId(null);
    setDeleteConfirm(false);
  }

  function handleProjectFilter(projectId) {
    setSelectedProjectId(projectId);
    if (projectId) {
      api.services.list(projectId).then(setServices).catch(setError);
    } else {
      api.services.list().then(setServices).catch(setError);
    }
  }

  if (loading) {
    return (
      <div className="services loading">
        <div className="page-header">
          <h1>Services</h1>
        </div>
        <div className="skeleton-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="services">
      <div className="page-header">
        <div>
          <h1>Services</h1>
          <p className="page-subtitle">Register and manage monitored services</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Service
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>Failed to load services: {error}</span>
          <button className="btn btn-sm" onClick={loadData}>Retry</button>
        </div>
      )}

      {projects.length > 0 && (
        <div className="filter-bar">
          <label className="filter-label">
            Filter by Project
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.projectName}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="services-table-container">
        {services.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8" />
              <path d="M12 17v4" />
            </svg>
            <h3>No services registered</h3>
            <p>Add a service to start monitoring its health and logs</p>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              Register Service
            </button>
          </div>
        ) : (
          <table className="services-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Project</th>
                <th>Base URL</th>
                <th>Health Endpoint</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id}>
                  <td>
                    <Link to={`/services/${service.id}`} className="service-name">
                      {service.serviceName}
                    </Link>
                  </td>
                  <td className="service-project">
                    {projects.find(p => p.id === service.projectId)?.projectName || 'Unknown'}
                  </td>
                  <td className="service-url">{service.baseUrl}</td>
                  <td className="service-endpoint">{service.healthCheckEndpoint}</td>
                  <td className="service-date">{formatDate(service.createdAt)}</td>
                  <td>
                    <div className="action-buttons">
                      <Link to={`/services/${service.id}`} className="btn btn-sm btn-outline">
                        View
                      </Link>
                      <button
                        className="btn btn-sm btn-outline btn-danger"
                        onClick={() => handleDeleteClick(service.id)}
                        disabled={deletingId === service.id}
                        title="Delete service"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreateModal && projects.length === 0 && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>No Projects Available</h2>
            </div>
            <div className="modal-body">
              <p>You need to create a project first before registering a service.</p>
              <div className="modal-actions">
                <button className="btn btn-primary" onClick={() => { setShowCreateModal(false); window.location.href = '/projects'; }}>
                  Create Project
                </button>
                <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && projects.length > 0 && (
        <Modal onClose={() => setShowCreateModal(false)} title="Register Service">
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label htmlFor="projectId">Project *</label>
              <select
                id="projectId"
                name="projectId"
                value={formData.projectId}
                onChange={handleInputChange}
                required
                disabled={submitting}
              >
                <option value="">Select a project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.projectName}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="serviceName">Service Name *</label>
              <input
                type="text"
                id="serviceName"
                name="serviceName"
                value={formData.serviceName}
                onChange={handleInputChange}
                placeholder="Enter service name"
                required
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label htmlFor="baseUrl">Base URL *</label>
              <input
                type="url"
                id="baseUrl"
                name="baseUrl"
                value={formData.baseUrl}
                onChange={handleInputChange}
                placeholder="https://api.example.com"
                required
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label htmlFor="healthCheckEndpoint">Health Check Endpoint</label>
              <input
                type="text"
                id="healthCheckEndpoint"
                name="healthCheckEndpoint"
                value={formData.healthCheckEndpoint}
                onChange={handleInputChange}
                placeholder="/actuator/health"
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label htmlFor="apiKey">API Key (Optional)</label>
              <input
                type="text"
                id="apiKey"
                name="apiKey"
                value={formData.apiKey}
                onChange={handleInputChange}
                placeholder="Auto-generated if not provided"
                disabled={submitting}
              />
              <p className="form-hint">Leave empty to auto-generate a UUID</p>
            </div>
            {formError && <div className="form-error">{formError}</div>}
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Registering...' : 'Register Service'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={handleDeleteCancel} role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="delete-modal-title">Delete Service</h2>
              <button className="modal-close" onClick={handleDeleteCancel} aria-label="Close modal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this service? This action cannot be undone.</p>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={handleDeleteCancel} disabled={deletingId !== null}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary btn-danger" onClick={handleDeleteConfirm} disabled={deletingId === null}>
                  {deletingId ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Modal({ onClose, title, children }) {
  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="modal-body">{children}</div>
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

export default Services;