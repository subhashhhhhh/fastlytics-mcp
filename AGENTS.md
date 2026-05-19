# Fastlytics MCP Server — Agent Notes

## Project Shape

- Standalone MCP server for Fastlytics F1 data
- Reads telemetry from R2 (S3-compatible), historical data from Supabase
- Falls back to Python backend API when R2 cache misses
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
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

Optional (for R2 cache miss fallback):
- `BACKEND_API_URL`
- `BACKEND_API_KEY`

## Architecture

```
MCP Client (Claude/Cursor) ──JSON-RPC──▶ McpServer
                                          ├─ tools/telemetry.ts ──▶ R2 (S3) or Backend API
                                          ├─ tools/sessions.ts  ──▶ R2 (S3)
                                          ├─ tools/laps.ts      ──▶ R2 (S3) or Supabase
                                          ├─ tools/results.ts   ──▶ R2 (S3) or Supabase
                                          ├─ tools/schedule.ts  ──▶ R2 (S3) or Supabase
                                          └─ tools/drivers.ts   ──▶ Supabase
```

## R2 Key Patterns

- Telemetry: `cache/{year}/telemetry/{event}_{session}_{driver}_{lap}_{type}.json.gz`
- Charts: `cache/{year}/charts/{event}_{session}_{drivers}_{type}.json.gz`
- Races: `cache/{year}/races/{event}_{session}.json.gz`
- Schedule: `cache/{year}/schedule/season_schedule.json.gz`
- Standings: `cache/{year}/standings/standings.json.gz`

## Supabase Tables

Historical data (1950-2017): `f1_seasons`, `f1_rounds`, `f1_circuits`, `f1_sessions`, `f1_session_entries`, `f1_round_entries`, `f1_team_drivers`, `f1_drivers`, `f1_teams`, `f1_laps`, `f1_pitstops`
