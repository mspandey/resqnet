# ResQNet — Security Hardening Guide

## 1. API Gateway (FastAPI)

### JWT Enforcement
All protected routes enforce `Depends(require_role([...]))`. **Never** use `Depends(get_current_user)` alone on mutation endpoints — always include role list.

```python
# ✅ Correct
@router.post("/dispatch", dependencies=[Depends(require_role(["rescue_team", "authority"]))])

# ❌ Wrong — any authenticated user can call this
@router.post("/dispatch", dependencies=[Depends(get_current_user)])
```

### Rate Limiting
Add SlowAPI middleware to the gateway:

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@router.post("/api/ingest/report")
@limiter.limit("10/minute")   # per IP
async def ingest_report(request: Request, ...): ...
```

### CORS Policy
Lock down CORS origins in production — never allow `*`:

```python
# config/gateway.py
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "https://resqnet.in").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,       # not ["*"]
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)
```

---

## 2. Secrets Management

### Environment Variable Rules
| Variable | Required In | Never Commit |
|---|---|---|
| `JWT_SECRET_KEY` | Gateway | ✅ |
| `DATABASE_URL` | All services | ✅ |
| `REDIS_URL` | AI / Dispatch | ✅ |
| `LLM_API_KEY` | AI Orchestration | ✅ |
| `OPENWEATHER_API_KEY` | AI Orchestration | ✅ |
| `MAPBOX_SECRET_KEY` | Web (server-side) | ✅ |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Web (client-side) | Domain-locked in Mapbox dashboard |

### Secret Rotation Checklist
- [ ] `JWT_SECRET_KEY` rotated every 90 days; old tokens expire on next restart
- [ ] Database credentials rotated every 180 days via cloud IAM (AWS Secrets Manager / GCP Secret Manager)
- [ ] API keys (LLM, OpenWeather, Mapbox) rotated on any personnel change

---

## 3. Database (PostgreSQL)

### Row-Level Security (RLS)
Enable RLS on the `incidents` table to prevent cross-tenant leakage:

```sql
-- Enable RLS
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Dispatchers can only see incidents in their assigned district
CREATE POLICY dispatcher_district_policy ON incidents
  FOR ALL
  USING (district = current_setting('app.district', TRUE));

-- Authorities see all
CREATE POLICY authority_all_policy ON incidents
  FOR ALL
  TO authority_role
  USING (TRUE);
```

Set `app.district` via connection parameter from the API layer before executing queries:

```python
await db.execute(text("SET LOCAL app.district = :d"), {"d": current_user.district})
```

### Parameterised Queries — Checklist
All existing queries use `text()` with named bind parameters. **Never use f-strings for SQL.**

```python
# ✅ Safe
await db.execute(text("SELECT * FROM incidents WHERE id = :id"), {"id": incident_id})

# ❌ SQL injection vector
await db.execute(text(f"SELECT * FROM incidents WHERE id = '{incident_id}'"))
```

---

## 4. AI Orchestration — Model Security

### Model Versioning (RULES.md §3)
Every DB write from the AI pipeline **must** include `model_version`. The composite format is:

```
{llm_model}@{llm_version}|yolo@{yolo_version}|risk@{risk_version}
# example:
gpt-4o@2024-08-01|yolo@v8n-stub|risk@v1.0.0-stub
```

Automated CI check: `grep -r 'model_version' services/ai-orchestration/` must return at least 2 INSERT/UPDATE usages.

### Input Sanitisation
Before sending user text to the LLM:

```python
import bleach

def sanitise_for_llm(raw: str, max_len: int = 2000) -> str:
    """Strip HTML tags and truncate before forwarding to LLM."""
    return bleach.clean(raw, tags=[], strip=True)[:max_len]
```

Install: `pip install bleach`

---

## 5. Docker / Infra Hardening

### Non-Root Containers
All service Dockerfiles must include:

```dockerfile
# Add non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser
```

### Read-Only Filesystem
In `docker-compose.yml`:

```yaml
services:
  ai-orchestration:
    read_only: true
    tmpfs:
      - /tmp:size=100m,mode=1777
```

### Network Isolation
Services should only be reachable from the API Gateway — not exposed on host:

```yaml
services:
  ingestion:
    expose: ["8001"]        # internal only
    networks: [backend]
  
  api-gateway:
    ports: ["8000:8000"]    # only gateway is public-facing
    networks: [backend, frontend]
```

---

## 6. Dependency Audit Commands

Run these before each release:

```bash
# Python services
pip-audit --requirement services/ai-orchestration/requirements.txt
pip-audit --requirement services/ingestion/requirements.txt

# Node.js frontend
cd web && npm audit --audit-level=moderate

# Docker images
docker scout cves resqnet/api-gateway:latest
```

---

## 7. Security Checklist — Pre-Production

- [ ] All endpoints have role guards (`require_role`)
- [ ] Rate limiting enabled on public-facing routes
- [ ] CORS `allow_origins` set to production domain only
- [ ] All secrets in environment variables, not hardcoded
- [ ] Database RLS policies created and tested
- [ ] All SQL uses parameterised queries (no f-string SQL)
- [ ] `model_version` present in all AI pipeline DB writes
- [ ] Containers run as non-root users
- [ ] Docker networks isolate backend services
- [ ] `npm audit` and `pip-audit` pass with 0 high/critical
- [ ] JWT expiry set to ≤ 24 hours; refresh token rotation enabled
- [ ] Logging does NOT record PII (phone, Aadhaar) in plaintext
