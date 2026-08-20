import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import './Projects.css';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ projectName: '', projectDescription: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching projects...');
      const data = await api.projects.list();
      console.log('Projects data received:', data);
      setProjects(data || []);
    } catch (err) {
      console.error('Error loading projects:', err);
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
    if (!formData.projectName.trim()) {
      setFormError('Project name is required');
      return;
    }

    try {
      setSubmitting(true);
      await api.projects.create({
        projectName: formData.projectName.trim(),
        projectDescription: formData.projectDescription.trim() || '',
      });
      setShowCreateModal(false);
      setFormData({ projectName: '', projectDescription: '' });
      loadProjects();
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
      await api.projects.delete(deletingId);
      loadProjects();
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

  if (loading) {
    return (
      <div className="projects loading">
        <div className="page-header">
          <h1>Projects</h1>
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
    <div className="projects">
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="page-subtitle">Manage your monitoring projects</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Project
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>Failed to load projects: {error}</span>
          <button className="btn btn-sm" onClick={loadProjects}>Retry</button>
        </div>
      )}

      <div className="projects-table-container">
        {projects.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            <h3>No projects yet</h3>
            <p>Create your first project to start organizing services</p>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              Create Project
            </button>
          </div>
        ) : (
          <table className="projects-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>
                    <Link to={`/projects/${project.id}`} className="project-name">
                      {project.projectName}
                    </Link>
                  </td>
                  <td className="project-description">{project.projectDescription || '—'}</td>
                  <td className="project-date">{formatDate(project.createdAt)}</td>
                  <td>
                    <div className="action-buttons">
                      <Link to={`/projects/${project.id}`} className="btn btn-sm btn-outline">
                        View
                      </Link>
                      <button
                        className="btn btn-sm btn-outline btn-danger"
                        onClick={() => handleDeleteClick(project.id)}
                        disabled={deletingId === project.id}
                        title="Delete project"
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
        <Modal onClose={() => setShowCreateModal(false)} title="Create Project">
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label htmlFor="projectName">Project Name *</label>
              <input
                type="text"
                id="projectName"
                name="projectName"
                value={formData.projectName}
                onChange={handleInputChange}
                placeholder="Enter project name"
                required
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label htmlFor="projectDescription">Description</label>
              <textarea
                id="projectDescription"
                name="projectDescription"
                value={formData.projectDescription}
                onChange={handleInputChange}
                placeholder="Optional description"
                rows={3}
                disabled={submitting}
              />
            </div>
            {formError && <div className="form-error">{formError}</div>}
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={handleDeleteCancel} role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="delete-modal-title">Delete Project</h2>
              <button className="modal-close" onClick={handleDeleteCancel} aria-label="Close modal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this project? This will also delete all associated services and cannot be undone.</p>
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

export default Projects;