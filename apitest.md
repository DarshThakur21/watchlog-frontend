# Watchlog — API Testing Cookbook

**Base URL:** `http://localhost:7000` (from `server.port=7000`)

All `POST` bodies are JSON (`Content-Type: application/json`). All IDs are UUIDs. Suggested flow order: **Project → Service → Logs → Health → Metrics**.

---

## 1. Projects — `/api/projects`

### POST /api/projects — create a project
```bash
curl -X POST http://localhost:7000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"projectName":"Demo","projectDescription":"Demo project"}'
```
```json
// 201 Created
{
  "id": "c0d5e0a0-...-uuid",
  "projectName": "Demo",
  "projectDescription": "Demo project",
  "createdAt": "2026-08-09T10:00:00Z"
}
```
| Error case | Status | Body |
|---|---|---|
| `projectName` missing/blank | 400 | `{"projectName":"projectName is required"}` |
| Duplicate `projectName` | 409 | `Project name already exists: Demo` |

> `projectDescription` is optional — omitted → stored as empty string.

### GET /api/projects — list all projects
```bash
curl "http://localhost:7000/api/projects"
```
```json
// 200 OK
[{ "id": "...", "projectName": "Demo", "projectDescription": "Demo project", "createdAt": "..." }]
```

### GET /api/projects/{id} — get one project
```bash
curl "http://localhost:7000/api/projects/c0d5e0a0-...-uuid"
```
| Error case | Status | Body |
|---|---|---|
| Unknown id | 404 | `Project not found: <id>` |

---

## 2. Services — `/api/services`

### POST /api/services — create a service (under a project)
```bash
curl -X POST http://localhost:7000/api/services \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<projectId-from-step-1>","serviceName":"demo-app","baseUrl":"http://localhost:8080","healthCheckEndpoint":"/actuator/health"}'
```
```json
// 201 Created  (NOTE: apiKey is NOT returned — by design)
{
  "id": "f1a2b3c4-...-uuid",
  "projectId": "c0d5e0a0-...-uuid",
  "serviceName": "demo-app",
  "baseUrl": "http://localhost:8080",
  "healthCheckEndpoint": "/actuator/health",
  "createdAt": "..."
}
```
| Error case | Status | Body |
|---|---|---|
| `projectId` missing | 400 | `{"projectId":"projectId is required"}` |
| `serviceName` missing/blank | 400 | `{"serviceName":"serviceName is required"}` |
| Unknown `projectId` | 404 | `Project not found: <id>` |
| Duplicate `serviceName` in same project | 409 | `Service name already exists in project: demo-app` |

> `apiKey` is optional — omitted → auto-generated as a UUID server-side (never returned).

### GET /api/services — list all (or by project)
```bash
curl "http://localhost:7000/api/services"                        # all services
curl "http://localhost:7000/api/services?projectId=<projectId>"  # only that project's
```

### GET /api/services/{id} — get one service
```bash
curl "http://localhost:7000/api/services/f1a2b3c4-...-uuid"
```
| Error case | Status | Body |
|---|---|---|
| Unknown id | 404 | `Service not found: <id>` |

---

## 3. Logs — `/api/logs`

### POST /api/logs — ingest a log (async → Kafka → Elasticsearch)
```bash
curl -X POST http://localhost:7000/api/logs \
  -H "Content-Type: application/json" \
  -d '{"serviceId":"<serviceId-from-step-2>","timestamp":"2026-08-09T10:00:00Z","level":"INFO","logger":"com.demo.App","thread":"main","message":"hello from demo-app"}'
```
```text
// 202 Accepted  (empty body — event is buffered in Kafka, indexed moments later)
```
| Error case | Status | Body |
|---|---|---|
| `serviceId` missing | 400 | `{"serviceId":"serviceId is required"}` |
| `message` missing/blank | 400 | `{"message":"message is required"}` |
| `level` not one of `TRACE/DEBUG/INFO/WARN/ERROR` | 400 | Jackson deserialization error |
| Unknown `serviceId` | 404 | `Service not found: <id>` |

> `timestamp` is optional-able in JSON but `@NotNull` — always send it (ISO-8601, e.g. `2026-08-09T10:00:00Z`).

### GET /api/logs — search logs (all filters optional)
```bash
# everything
curl "http://localhost:7000/api/logs?size=5"

# by service + level
curl "http://localhost:7000/api/logs?serviceId=<serviceId>&level=ERROR"

# keyword (full-text on message) + time window + paging
curl "http://localhost:7000/api/logs?keyword=exception&from=2026-08-09T00:00:00Z&to=2026-08-10T00:00:00Z&page=0&size=20"
```
```json
// 200 OK
{
  "logs": [{ "id": "...", "projectId": "...", "serviceId": "...", "timestamp": "...",
             "level": "INFO", "logger": "com.demo.App", "thread": "main", "message": "hello" }],
  "totalHits": 1,
  "page": 0
}
```
| Param | Type | Default | Meaning |
|---|---|---|---|
| `serviceId` | UUID | — | filter to one service |
| `level` | `TRACE/DEBUG/INFO/WARN/ERROR` | — | filter by severity |
| `from` | ISO-8601 | — | inclusive lower bound |
| `to` | ISO-8601 | — | exclusive upper bound |
| `keyword` | string | — | full-text match on `message` |
| `page` | int ≥0 | 0 | zero-based page |
| `size` | int 1–500 | 20 | page size |

---

## 4. Health — `/api/health`

```bash
curl "http://localhost:7000/api/health"
```
```json
// 200 OK  (one entry per registered service; polled every 30s)
[
  {
    "serviceId": "f1a2b3c4-...-uuid",
    "status": "UP",                // UP | DOWN | UNKNOWN (never checked yet)
    "serviceName": "demo-app",
    "lastCheckedAt": "2026-08-09T10:00:30Z",
    "responseTimeMs": 12
  }
]
```
> The poller calls `baseUrl + healthCheckEndpoint` with a 3s timeout. If your service isn't actually running on `http://localhost:8080`, expect `status: DOWN` — that's the poller working as designed.

### GET /api/health/{serviceId} — status of a single service
```bash
curl "http://localhost:7000/api/health/f1a2b3c4-...-uuid"
```
```json
// 200 OK  (same shape as one entry above)
{
  "serviceId": "f1a2b3c4-...-uuid",
  "status": "UP",
  "serviceName": "demo-app",
  "lastCheckedAt": "2026-08-09T10:00:30Z",
  "responseTimeMs": 12
}
```
| Error case | Status | Body |
|---|---|---|
| Unknown `serviceId` (not a UUID / not registered) | 400 / 500 | `Service not found: <serviceId>` (IllegalArgumentException) |

> Unlike the list endpoint, the `{serviceId}` here is a **path variable** consumed as a `String` and parsed via `UUID.fromString(...)`. A malformed UUID throws before the "not found" check.

---

## 5. Metrics — `/api/metrics`

```bash
# default: last hour, 1-minute buckets
curl "http://localhost:7000/api/metrics?serviceId=<serviceId>&metricName=cpu_usage"

# custom window + bucket
curl "http://localhost:7000/api/metrics?serviceId=<serviceId>&metricName=cpu_usage&from=2026-08-09T09:00:00Z&to=2026-08-09T10:00:00Z&bucket=5 minutes"
```
```json
// 200 OK
{
  "serviceId": "f1a2b3c4-...-uuid",
  "metricName": "cpu_usage",
  "points": [
    { "timestamp": "2026-08-09T09:59:00Z", "value": 42.3 },
    { "timestamp": "2026-08-09T10:00:00Z", "value": 55.1 }
  ]
}
```
| Param | Type | Default | Meaning |
|---|---|---|---|
| `serviceId` | UUID | **required** | which service |
| `metricName` | string | **required** | e.g. `cpu_usage`, `memory_usage_mb` |
| `from` | ISO-8601 | last hour | window start |
| `to` | ISO-8601 | now | window end |
| `bucket` | interval | `1 minute` | TimescaleDB interval, e.g. `5 minutes`, `1 hour` |

> **Requires the hypertable** (Step 2). If you get a `time_bucket` SQL error, run:
> ```sql
> CREATE EXTENSION IF NOT EXISTS timescaledb;
> SELECT create_hypertable('metric_points', 'timestamp');
> ```
> The poller writes a `cpu_usage` + `memory_usage_mb` sample every 15s per service, so wait a bit after registering a service.

---

## Quick smoke-test sequence
```bash
#1. project
curl -X POST http://localhost:7000/api/projects -H "Content-Type: application/json" \
  -d '{"projectName":"Demo","projectDescription":"Demo project"}'
#2. service — copy {id} as $SERVICE
curl -X POST http://localhost:7000/api/services -H "Content-Type: application/json" \
  -d '{"projectId":"<pid>","serviceName":"demo-app","baseUrl":"http://localhost:8080","healthCheckEndpoint":"/actuator/health"}'
#3. ingest
curl -X POST http://localhost:7000/api/logs -H "Content-Type: application/json" \
  -d '{"serviceId":"<sid>","timestamp":"2026-08-09T10:00:00Z","level":"INFO","logger":"com.demo.App","thread":"main","message":"hello watchlog"}'
#4. read back
curl "http://localhost:7000/api/logs?size=5"
#5. health + metrics (wait ~30s for first poll)
curl "http://localhost:7000/api/health"
curl "http://localhost:7000/api/metrics?serviceId=<sid>&metricName=cpu_usage"
```
