import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './TelemetryPanel.css';

const base = process.env.REACT_APP_API_BASE || '/api';
const windows = { '1h': [60, '1 minute', 60], '6h': [360, '5 minutes', 300], '24h': [1440, '15 minutes', 900], '7d': [10080, '1 hour', 3600] };
const units = {container_cpu_percent: '%', container_memory_bytes: 'MiB', jvm_heap_used_bytes: 'MiB', process_cpu_percent: '%', jvm_threads_live: 'threads'};
const levels = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'];

async function query(path, params, signal) {
  const res = await fetch(base + path + '?' + new URLSearchParams(params), {signal, credentials: 'include'});
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

function useQuery(path, params, revision) {
  const [state, setState] = useState({});
  const encoded = new URLSearchParams(params).toString();
  useEffect(() => {
    const controller = new AbortController();
    if (path) {
      setState(s => s.key === path + encoded ? s : {});
      query(path, encoded, controller.signal)
        .then(data => { if (!controller.signal.aborted) setState({key: path + encoded, data}); })
        .catch(err => { if (!controller.signal.aborted) setState({key: path + encoded, error: err.message}); });
    }
    return () => controller.abort();
  }, [path, encoded, revision]);
  return state.key === path + encoded ? state : {};
}

function Status({state}) {
  return <p role="status">{state.error ? 'Telemetry unavailable (' + state.error + ')' : 'Loading telemetryâ€¦'}</p>;
}

export default function TelemetryPanel({projectId, serviceId, showGauges = true}) {
  const [range, setRange] = useState('1h');
  const [end, setEnd] = useState(Date.now);
  const [live, setLive] = useState(true);
  const [selection, setSelection] = useState('');
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => { if (!document.hidden) setEnd(Date.now()); }, 30000);
    return () => clearInterval(timer);
  }, [live]);
  const [minutes, bucket, seconds] = windows[range];
  const scope = {...(serviceId && {serviceId}), ...(projectId && {projectId})};
  const from = new Date(end - minutes * 60000).toISOString();
  const to = new Date(end).toISOString();
  const params = {...scope, from, to, bucket};
  const logs = useQuery('/logs/stats', params, end);
  const health = useQuery('/health/history', params, end);
  const catalog = useQuery(serviceId && showGauges ? '/metrics/catalog' : null, scope, end);
  const options = catalog.data || [];
  const key = row => row.name + '/' + row.instance;
  const chosen = options.find(o => key(o) === selection) || options[0];
  const series = useQuery(chosen ? '/metrics/series' : null,
    {...params, metricName: chosen?.name || '', instance: chosen?.instance || ''}, end);
  const rows = series.data || [];
  const count = rows.reduce((a,r) => a + Number(r.samples), 0);
  const format = n => (n / (units[chosen?.name] === 'MiB' ? 1048576 : 1)).toFixed(2);
  const total = logs.data?.reduce((a,r) => a + r.total, 0);
  const errors = logs.data?.reduce((a,r) => a + (r.levels.ERROR || 0), 0);
  const peak = Math.max(1, ...(logs.data || []).map(r => r.total));
  const up = health.data?.reduce((a,r) => a + Number(r.up), 0);
  const down = health.data?.reduce((a,r) => a + Number(r.down), 0);
  const x = stamp => Math.max(0, Math.min(100, (Date.parse(stamp) - Date.parse(from)) / (minutes * 600)));
  const durations = health.data?.filter(r => r.duration != null) || [];
  const maxDuration = Math.max(1, ...durations.map(r => r.duration));
  const maxGauge = Math.max(1, ...rows.map(r => r.value));
  return <section className="card telemetry-panel">
    <div className="card-header"><h2>Telemetry</h2>
      <label>Window <select value={range} onChange={e => setRange(e.target.value)}>{Object.keys(windows).map(v => <option key={v}>{v}</option>)}</select></label>
      <label><input type="checkbox" checked={live} onChange={e => setLive(e.target.checked)} /> Refresh every 30s</label>
    </div>
    <div className="card-body"><h3>Logs by severity</h3>
      {logs.data ? <><p>{total} logs Â· {errors} errors Â· {total ? (100 * errors / total).toFixed(1) + '% ERROR' : 'No events'}</p>
        <div className="wl-bars">{logs.data.map(r => {
          const start = new Date(Math.max(Date.parse(from), Date.parse(r.timestamp))).toISOString();
          const stop = new Date(Math.min(end, Date.parse(r.timestamp) + seconds * 1000)).toISOString();
          const title = start + ' Â· ' + r.total + ' logs';
          return <Link key={r.timestamp} aria-label={title} title={title} to={'/logs?' + new URLSearchParams({...scope, from:start, to:stop})}>
            {levels.map(l => <i key={l} className={'wl-' + l} style={{height:(100 * (r.levels[l] || 0) / peak) + '%'}} />)}
          </Link>;
        })}</div><small>{levels.map(l => <span key={l} className={'wl-key wl-' + l}>{l} </span>)}</small></> : <Status state={logs}/>}
      <h3>Health probes</h3>
      {health.data ? <p>{up + down ? (100 * up / (up + down)).toFixed(1) + '% successful' : 'No checks in this window'} Â· {up} up Â· {down} down</p> : <Status state={health}/>}
      {serviceId && durations.length > 0 && <figure><figcaption>Successful probe duration (ms)</figcaption>
        <svg className="wl-gauge" viewBox="0 0 100 30" preserveAspectRatio="none" role="img" aria-label="Mean probe duration by time">
          {durations.map(r => <circle key={r.timestamp} cx={x(r.timestamp)} cy={29-28*r.duration/maxDuration} r=".5"><title>{r.timestamp} · {Number(r.duration).toFixed(1)} ms</title></circle>)}
        </svg></figure>}
      {serviceId && showGauges && <><h3>Measured gauges</h3>{!catalog.data ? <Status state={catalog}/> : !chosen ? <p>No collector samples yet.</p> : <>
        <select aria-label="Metric and instance" value={key(chosen)} onChange={e => setSelection(e.target.value)}>{options.map(o => <option key={key(o)} value={key(o)}>{o.name} Â· {o.instance}</option>)}</select>
        <p>Last sample {new Date(chosen.latest).toLocaleString()}{end - Date.parse(chosen.latest) > 90000 ? ' Â· Stale' : ''}</p>
        {!series.data ? <Status state={series}/> : !count ? <p>No samples in this window.</p> : <>
          <p>Min {format(Math.min(...rows.map(r => r.min)))} Â· Mean {format(rows.reduce((a,r) => a + r.value * r.samples, 0) / count)} Â· Max {format(Math.max(...rows.map(r => r.max)))} {units[chosen.name]} Â· {count} samples</p>
          <svg className="wl-gauge" viewBox="0 0 100 30" preserveAspectRatio="none" role="img" aria-label={chosen.name + ' bucket averages over time'}>
            {rows.map((r,i) => <g key={r.timestamp}>{i > 0 && Date.parse(r.timestamp) - Date.parse(rows[i-1].timestamp) <= seconds * 1000 && <line x1={x(rows[i-1].timestamp)} y1={29-28*rows[i-1].value/maxGauge} x2={x(r.timestamp)} y2={29-28*r.value/maxGauge}/>}
              <circle cx={x(r.timestamp)} cy={29-28*r.value/maxGauge} r=".45"><title>{r.timestamp} Â· {format(r.value)} {units[chosen.name]}</title></circle></g>)}
          </svg></>}
      </>}</>}
      <small>{new Date(from).toLocaleString()} â€” {new Date(to).toLocaleString()}</small>
    </div></section>;
}
