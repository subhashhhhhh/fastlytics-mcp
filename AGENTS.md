# Fastlytics MCP Server — Agent Notes

## Project Shape

- Standalone MCP server for Fastlytics F1 data
- All data access goes through the worker API (`api.fastlytics.app`)
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
- `FASTLYTICS_MCP_API_KEY` — your API key from https://fastlytics.app/settings/api-keys

Optional:
- `FASTLYTICS_API_URL` — worker API URL (default: `https://api.fastlytics.app`)
- `TRANSPORT` — `stdio` (default) or `http`
- `HTTP_PORT` — default `3456`

## Architecture

```
MCP Client (Claude/Cursor) ──JSON-RPC──▶ McpServer (this project)
                                           │
                                           │ HTTP + Authorization: Bearer <api_key>
                                           ▼
                                    Worker API (api.fastlytics.app)
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

## Tools

| Tool | Worker Endpoint |
|------|----------------|
| `get_telemetry` | `/api/telemetry/{type}` |
| `compare_telemetry` | `/api/telemetry/speed` + `/api/comparison/sectors` |
| `list_events` | `/api/schedule/{year}` |
| `list_sessions` | `/api/sessions` |
| `list_drivers` | `/api/session/drivers` |
| `get_laptimes` | `/api/laptimes` |
| `get_lap_positions` | `/api/lapdata/positions` |
| `get_strategy` | `/api/strategy` |
| `get_race_results` | `/api/results/race/{year}/{event}` |
| `get_standings` | `/api/standings/{drivers\|teams}` |
| `get_championship_progression` | `/api/standings/progression` |

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
