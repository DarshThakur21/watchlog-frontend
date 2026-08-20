import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import './Logs.css';

const LOG_LEVELS = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'];
const PAGE_SIZES = [10, 20, 50, 100];

function Logs() {
  const [logs, setLogs] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalHits, setTotalHits] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [filters, setFilters] = useState({
    serviceId: '',
    level: '',
    from: '',
    to: '',
    keyword: '',
  });

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [page, size, filters]);

  async function loadServices() {
    try {
      const data = await api.services.list();
      setServices(data);
    } catch (err) {
      console.error('Failed to load services:', err);
    }
  }

  async function loadLogs() {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        size,
        ...(filters.serviceId && { serviceId: filters.serviceId }),
        ...(filters.level && { level: filters.level }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
        ...(filters.keyword && { keyword: filters.keyword }),
      };
      const response = await api.logs.query(params);
      setLogs(response.logs || []);
      setTotalHits(response.totalHits || 0);
    } catch (err) {
      setError(err.message);
      setLogs([]);
      setTotalHits(0);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(name, value) {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(0);
  }

  function handlePageChange(newPage) {
    setPage(newPage);
  }

  function handleSizeChange(newSize) {
    setSize(newSize);
    setPage(0);
  }

  function clearFilters() {
    setFilters({
      serviceId: '',
      level: '',
      from: '',
      to: '',
      keyword: '',
    });
    setPage(0);
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  if (loading && logs.length === 0) {
    return (
      <div className="logs loading">
        <div className="page-header">
          <h1>Logs</h1>
        </div>
        <div className="skeleton-logs">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton-log-row" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="logs">
      <div className="page-header">
        <div>
          <h1>Logs</h1>
          <p className="page-subtitle">Search and explore application logs</p>
        </div>
      </div>

      <section className="filters-card card">
        <div className="card-header">
          <h2>Filters</h2>
          {hasActiveFilters && (
            <button className="btn btn-sm btn-outline" onClick={clearFilters}>
              Clear All
            </button>
          )}
        </div>
        <div className="card-body">
          <div className="filters-grid">
            <div className="form-group">
              <label htmlFor="serviceId">Service</label>
              <select
                id="serviceId"
                value={filters.serviceId}
                onChange={(e) => handleFilterChange('serviceId', e.target.value)}
                className="filter-select"
              >
                <option value="">All Services</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.serviceName}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="level">Level</label>
              <select
                id="level"
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
                className="filter-select"
              >
                <option value="">All Levels</option>
                {LOG_LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="keyword">Keyword</label>
              <input
                type="text"
                id="keyword"
                value={filters.keyword}
                onChange={(e) => handleFilterChange('keyword', e.target.value)}
                placeholder="Search in message..."
                className="filter-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="from">From</label>
              <input
                type="datetime-local"
                id="from"
                value={filters.from}
                onChange={(e) => handleFilterChange('from', e.target.value)}
                className="filter-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="to">To</label>
              <input
                type="datetime-local"
                id="to"
                value={filters.to}
                onChange={(e) => handleFilterChange('to', e.target.value)}
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
          <span>Failed to load logs: {error}</span>
          <button className="btn btn-sm" onClick={loadLogs}>Retry</button>
        </div>
      )}

      <section className="logs-card card">
        <div className="card-header">
          <h2>Log Entries</h2>
          <div className="card-header-actions">
            <span className="results-count">
              Showing {logs.length} of {totalHits} entries
            </span>
            <select
              value={size}
              onChange={(e) => handleSizeChange(Number(e.target.value))}
              className="page-size-select"
              aria-label="Page size"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>{s} per page</option>
              ))}
            </select>
          </div>
        </div>
        <div className="card-body">
          {logs.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <h3>No logs found</h3>
              <p>{hasActiveFilters ? 'Try adjusting your filters' : 'No logs have been ingested yet'}</p>
            </div>
          ) : (
            <>
              <div className="logs-table-container">
                <table className="logs-table">
                  <thead>
                    <tr>
                      <th style={{ width: '180px' }}>Timestamp</th>
                      <th style={{ width: '80px' }}>Level</th>
                      <th style={{ width: '150px' }}>Service</th>
                      <th style={{ width: '150px' }}>Logger</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td className="log-timestamp">{formatTimestamp(log.timestamp)}</td>
                        <td>
                          <span className={`level-badge ${log.level.toLowerCase()}`}>{log.level}</span>
                        </td>
                        <td className="log-service">{log.serviceId}</td>
                        <td className="log-logger">{log.logger || '—'}</td>
                        <td className="log-message">{log.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalHits > size && (
                <Pagination
                  currentPage={page}
                  totalPages={Math.ceil(totalHits / size)}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  const pages = [];
  const maxPages = 5;
  let start = Math.max(0, currentPage - Math.floor(maxPages / 2));
  let end = Math.min(totalPages, start + maxPages);

  if (end - start < maxPages) {
    start = Math.max(0, end - maxPages);
  }

  for (let i = start; i < end; i++) {
    pages.push(i);
  }

  return (
    <div className="pagination">
      <button
        className="btn btn-sm btn-outline"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        aria-label="Previous page"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      {start > 0 && (
        <>
          <button
            className="btn btn-sm btn-outline"
            onClick={() => onPageChange(0)}
            aria-label="First page"
          >
            1
          </button>
          {start > 1 && (
            <span className="pagination-ellipsis">…</span>
          )}
        </>
      )}
      {pages.map((p) => (
        <button
          key={p}
          className={`btn btn-sm ${p === currentPage ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => onPageChange(p)}
          aria-label={`Page ${p + 1}`}
          aria-current={p === currentPage ? 'page' : undefined}
        >
          {p + 1}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && (
            <span className="pagination-ellipsis">…</span>
          )}
          <button
            className="btn btn-sm btn-outline"
            onClick={() => onPageChange(totalPages - 1)}
            aria-label="Last page"
          >
            {totalPages}
          </button>
        </>
      )}
      <button
        className="btn btn-sm btn-outline"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages - 1}
        aria-label="Next page"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}

function formatTimestamp(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).replace(',', '');
}

export default Logs;