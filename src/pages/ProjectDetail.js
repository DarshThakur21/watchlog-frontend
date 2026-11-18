import TelemetryPanel from './TelemetryPanel';
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import './ProjectDetail.css';

function ProjectDetail() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
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
    loadProject();
    loadServices();
  }, [projectId]);

  async function loadProject() {
    try {
      const data = await api.projects.get(projectId);
      setProject(data);
    } catch (err) {
      console.error('Error loading project:', err);
      setError(err.message);
    }
  }

  async function loadServices() {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching services for project:', projectId);
      const data = await api.services.list(projectId);
      console.log('Services data received:', data);
      setServices(data || []);
    } catch (err) {
      console.error('Error loading services:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFormError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.serviceName.trim() || !formData.baseUrl.trim()) {
      setFormError('Service name and base URL are required');
      return;
    }

    try {
      setSubmitting(true);
      await api.services.create({
        projectId,
        serviceName: formData.serviceName.trim(),
        baseUrl: formData.baseUrl.trim(),
        healthCheckEndpoint: formData.healthCheckEndpoint.trim() || '/actuator/health',
        apiKey: formData.apiKey.trim() || undefined,
      });
      setShowCreateModal(false);
      setFormData({ serviceName: '', baseUrl: '', healthCheckEndpoint: '/actuator/health', apiKey: '' });
      loadServices();
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
      loadServices();
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

  if (loading && !project) {
    return (
      <div className="project-detail loading">
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

  if (error && !project) {
    return (
      <div className="project-detail">
        <div className="error-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>Failed to load project: {error}</span>
          <button className="btn btn-sm" onClick={loadProject}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="project-detail">
      <div className="page-header">
        <div>
          <Link to="/projects" className="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Projects
          </Link>
          <h1>{project?.projectName || 'Project'}</h1>
          <p className="page-subtitle">{project?.projectDescription || 'No description'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Service
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
          <button className="btn btn-sm" onClick={loadServices}>Retry</button>
        </div>
      )}

      <TelemetryPanel projectId={projectId} />
      <div className="services-table-container">
        {services.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8" />
              <path d="M12 17v4" />
            </svg>
            <h3>No services yet</h3>
            <p>Add a service to start monitoring its health and metrics</p>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              Add Service
            </button>
          </div>
        ) : (
          <table className="services-table">
            <thead>
              <tr>
                <th>Name</th>
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

      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)} title="Add Service">
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label htmlFor="serviceName">Service Name *</label>
              <input
                type="text"
                id="serviceName"
                name="serviceName"
                value={formData.serviceName}
                onChange={handleInputChange}
                placeholder="e.g., user-api, payment-service"
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
                placeholder="http://localhost:8080"
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
              <label htmlFor="apiKey">API Key (optional)</label>
              <input
                type="text"
                id="apiKey"
                name="apiKey"
                value={formData.apiKey}
                onChange={handleInputChange}
                placeholder="Auto-generated if not provided"
                disabled={submitting}
              />
            </div>
            {formError && <div className="form-error">{formError}</div>}
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Creating...' : 'Add Service'}
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

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

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

export default ProjectDetail;