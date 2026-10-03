# Fastlytics MCP Server — Agent Notes

## Project Shape

- Standalone MCP server for Fastlytics F1 data
- All data access goes through the worker API (`fastlytics-api-proxy-v2.subhashgottumukkala17.workers.dev`)
- No direct R2 or Supabase access — purely an HTTP proxy layer with typed tool schemas
- Two transports: stdio (local) and HTTP+SSE (remote)
- TypeScript, ES modules, Node.js 22+

## Commands

| Command | Purpose |
| --- | --- |
| `npm run build` | Compile TypeScript |
| `npm run start:stdio` | Run via stdio (Claude Desktop / Cursor) |
| `npm run start:http` | Run HTTP+SSE on port 3456 |

## Env

Copy `.env.example` to `.env`.

Required:
- `FASTLYTICS_MCP_API_KEY` — your API key from https://fastlytics.app/settings?section=api-keys

Optional:
- `FASTLYTICS_API_URL` — worker API URL (default: `https://fastlytics-api-proxy-v2.subhashgottumukkala17.workers.dev`)
- `TRANSPORT` — `stdio` (default) or `http`
- `HTTP_PORT` — default `3456`

## Architecture

```
MCP Client (Claude/Cursor) ──JSON-RPC──▶ McpServer (this project)
                                           │
                                           │ HTTP + Authorization: Bearer <api_key>
                                           ▼
                                    Worker API (workers.dev)
                                           │
                              ┌────────────┼────────────┐
                              ▼            ▼            ▼
                            R2         Supabase     Python Backend
                         (telemetry,  (historical,  (FastF1 processing,
                          results,    1950-2017)    cache generation)
                          charts)

```

All tools are thin wrappers around existing worker API endpoints. The worker handles:
- Auth validation (checks API key)
- Data routing (R2 for modern, Supabase for historical)
- Backend fallback for telemetry cache misses
- Edge caching
- CORS

## Tools (29 total)

### Telemetry & Circuit
| Tool | Worker Endpoint |
|------|----------------|
| `get_telemetry` | `/api/telemetry/{type}` |
| `compare_telemetry` | `/api/telemetry/speed` + `/api/comparison/sectors` |
| `get_circuit_info` | `/api/circuit/info` |
| `get_pace_distribution` | `/api/telemetry/pace-distribution` |

### Sessions & Drivers
| Tool | Worker Endpoint |
|------|----------------|
| `list_events` | `/api/schedule/{year}` |
| `list_sessions` | `/api/sessions` |
| `list_drivers` | `/api/session/drivers` |

### Lap Analysis
| Tool | Worker Endpoint |
|------|----------------|
| `get_laptimes` | `/api/laptimes` |
| `get_laptimes_gaps` | `/api/laptimes/gaps` |
| `get_lap_positions` | `/api/lapdata/positions` |
| `get_strategy` | `/api/strategy` |
| `get_stint_analysis` | `/api/stint-analysis` |

### Results & Standings
| Tool | Worker Endpoint |
|------|----------------|
| `get_race_results` | `/api/results/race/{year}/{event}` |
| `get_standings` | `/api/standings/{drivers\|teams}` |
| `get_championship_progression` | `/api/standings/progression` |

### Race Context
| Tool | Worker Endpoint |
|------|----------------|
| `get_race_control` | `/api/openf1/race_control` |
| `get_incidents` | `/api/incidents` |

### Team Performance
| Tool | Worker Endpoint |
|------|----------------|
| `get_team_pace` | `/api/team-pace/{summary\|event\|session}` |

### Driver/Team Bios & Stats
| Tool | Worker Endpoint |
|------|----------------|
| `search_driver` | `/api/search` |
| `get_driver_bio` | `/api/driver/{slug}/bio` |
| `get_driver_career` | `/api/driver/{slug}/career` |
| `get_team_bio` | `/api/team/{slug}/bio` |
| `get_head_to_head` | `/api/bios/head-to-head` |
| `get_leaderboard` | `/api/bios/leaderboard/{type}/{stat}` |

### Weather
| Tool | Worker Endpoint |
|------|----------------|
| `get_weather_forecast` | `/api/weather/forecast` |
| `get_weather` | `/api/weather/{location}` |

### Driver/Team History
| Tool | Worker Endpoint |
|------|----------------|
| `get_driver_championship` | `/api/driver/{slug}/championship` |
| `get_driver_teammates` | `/api/driver/{slug}/teammates` |
| `get_team_championship` | `/api/team/{slug}/championship` |

## Setup for Claude Desktop

```json
{
  "mcpServers": {
    "fastlytics": {
      "command": "node",
      "args": ["/path/to/fastlytics-mcp/dist/index.js"],
      "env": {
        "FASTLYTICS_MCP_API_KEY": "fl_mcp_..."
      }
    }
  }
}
```

## Setup for Cursor

```json
{
  "mcpServers": {
    "fastlytics": {
      "command": "node",
      "args": ["/path/to/fastlytics-mcp/dist/index.js"],
      "env": {
        "FASTLYTICS_MCP_API_KEY": "fl_mcp_..."
      }
    }
  }
}
```

## Setup for Remote Clients (Perplexity, Claude Desktop remote, etc.)

Connect to: `https://mcp.fastlytics.app/mcp`

Pass your API key via `Authorization: Bearer fl_mcp_...` header.

## Remote Deployment (VPS)

The HTTP transport is deployed on the same VPS as the Fastlytics backend.

### First-time setup

```bash
# On the VPS
mkdir -p /opt/fastlytics-mcp
cp deploy/fastlytics-mcp.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable fastlytics-mcp

# Set up nginx (see deploy/nginx-mcp.conf)
# Get SSL cert: certbot certonly -d mcp.fastlytics.app
```

### Subsequent deploys

```bash
./deploy/deploy.sh root@fastlytics
```

This builds locally, rsyncs `dist/` + `package.json`, installs deps, and restarts systemd.

### Key flow (remote)

Client sends `Authorization: Bearer fl_mcp_xxx` header → server extracts → sets `process.env` → `api-client.ts` uses it to call the worker. No env var needed on the server itself (the VPS env var is a fallback, not the primary source).

