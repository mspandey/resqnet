# ResQNet — AI-Powered Disaster Intelligence Platform



## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  Next.js 14 Web (port 3000)                                    │
│  Volunteer ∙ Rescue Team ∙ Authority dashboards                │
└────────────────────────┬───────────────────────────────────────┘
                         │ HTTPS / WebSocket
┌────────────────────────▼───────────────────────────────────────┐
│  API Gateway  (FastAPI · port 8000)                            │
│  JWT auth ∙ Rate limiting ∙ Reverse proxy                      │
└──┬─────────────┬─────────────┬─────────────┬───────────────────┘
   │             │             │             │
   ▼             ▼             ▼             ▼
Ingestion    AI-Orchestration  Dispatch &  Notification
(FastAPI     (FastAPI          Resource    (Node.js
 :8001)       :8002)           :3001)       :3002)
   │             │             │
   └──────── PostgreSQL ───────┘
             (PostGIS + pgvector)
                   │
                 Redis
            (queues + Socket.IO adapter)
```

### Services

| Service | Stack | Port | Responsibility |
|---|---|---|---|
| `api-gateway` | FastAPI | 8000 | Auth, rate-limiting, reverse proxy |
| `ingestion` | FastAPI | 8001 | Report intake, deduplication (pgvector) |
| `ai-orchestration` | FastAPI | 8002 | LLM classification, severity mapping |
| `dispatch-resource` | Node.js/TS | 3001 | Team dispatch, Socket.IO real-time updates |
| `notification` | Node.js/TS | 3002 | SMS (Twilio), push (Firebase) |

---

## Quick Start (Local Development)

### Prerequisites

- Docker Desktop ≥ 4.25
- Node.js ≥ 20 (for frontend)
- Python 3.11+ (only if running Python services outside Docker)

### 1 — Configure environment

```bash
cp infra/.env.example infra/.env
# Edit infra/.env and fill in at minimum:
#   JWT_SECRET — generate with: openssl rand -hex 32
#   LLM_API_KEY — Groq, Together, or OpenAI API key
```

### 2 — Start all backend services

```bash
cd infra
docker-compose up --build
```

This will:
- Start PostgreSQL 16 with PostGIS and pgvector
- Run all three migrations automatically
- Load dev seed data (10 incidents, sample users/teams)
- Start all 5 backend services

### 3 — Verify services are healthy

```bash
curl http://localhost:8000/health   # API Gateway
curl http://localhost:8001/health   # Ingestion
curl http://localhost:8002/health   # AI Orchestration
curl http://localhost:3001/health   # Dispatch & Resource
curl http://localhost:3002/health   # Notification
```

All should return `{"status": "ok", "service": "<name>"}`.

### 4 — Start the web frontend

```bash
cd web
cp .env.example .env.local        # Fill in NEXT_PUBLIC_MAPBOX_TOKEN
npm install
npm run dev                        # http://localhost:3000
```

---

## Database

**PostgreSQL 16** with:
- **PostGIS** — geography(Point) columns, `ST_Distance` for proximity matching
- **pgvector** — 1536-dimension embeddings for report deduplication

### Running migrations manually

```bash
# Inside the running postgres container
docker exec -it infra-postgres-1 psql -U resqnet -d resqnet \
  -f /migrations/001_extensions.sql \
  -f /migrations/002_core_schema.sql \
  -f /migrations/003_indexes.sql
```

---



---

## Role Matrix

| Role | Can Submit Report | View Queue | Override Severity | Dispatch Team | Broadcast Alert |
|---|---|---|---|---|---|
| `citizen` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `volunteer` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `rescue_team` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `authority` | ✅ | ✅ | ✅ | ✅ | ✅ |

---



---

## Project Structure

```
resqnet/
├── db/
│   ├── migrations/        # 001_extensions, 002_core_schema, 003_indexes
│   └── seed/              # dev_seed.sql
├── infra/
│   ├── docker-compose.yml
│   ├── .env.example
│   └── init.sh
├── services/
│   ├── api-gateway/       # FastAPI
│   ├── ingestion/         # FastAPI
│   ├── ai-orchestration/  # FastAPI
│   ├── dispatch-resource/ # Node.js/TypeScript + Socket.IO
│   └── notification/      # Node.js/TypeScript + Twilio
├── web/                   # Next.js 14 (Phase 2)
└── mobile/                # Flutter citizen app (Phase 2, scaffolded only)
```

---

## Implementation Status

See [TRACKER.md](./TRACKER.md) for sprint-level task tracking.

- **Phase 1 (MVP):** Database layer ✅ | All 5 services ✅ | Infra ✅
- **Phase 2 (AI Optimization):** YOLOv8, faster-whisper, risk predictor, heatmap, offline sync
- **Phase 3 (Govt. Integration):** Multi-agency dashboard, pilot deployment

---

## Contributing

1. Branch from `main`: `git checkout -b feat/<short-description>`
2. Follow naming conventions in RULES.md §1 exactly.
3. Docs must be updated in the same commit as the code change (RULES.md §5).
4. All AI classification code must log `model_version` — PRs failing this are blocked.
