# fastlytics-mcp

An MCP server that exposes [Fastlytics](https://fastlytics.app) F1 telemetry and historical data as tools, so Claude Desktop, Cursor, OpenCode, or any other MCP client can query races directly instead of scraping an API.

- 29 typed tools covering telemetry, lap analysis, strategy, results, standings, driver and team bios, and weather
- Two transports: stdio for local clients, HTTP + SSE for remote clients
- TypeScript, Node.js 22+

## How it works

The server is a thin proxy. Every tool call becomes one authenticated HTTP request to the Fastlytics worker API, which owns auth, edge caching, data routing, and rate limits.

```
MCP client (Claude, Cursor, OpenCode)
        │  JSON-RPC
        ▼
  fastlytics-mcp  ──HTTP + Bearer──▶  Worker API (workers.dev)
        │                                    │
        │                     ┌──────────────┼──────────────┐
        │                     ▼              ▼              ▼
        │                    R2          Supabase      Python backend
        │              (recent telemetry, (historical,  (FastF1 processing,
        │               charts, results)  1950-2017)    cache generation)
```

The server holds no credentials of its own. A stdio client supplies an API key through the environment, and a remote client supplies one per request through an `Authorization` header. No database, object storage, or payment access lives in this codebase.

Data coverage: telemetry and lap data from 2018 onward, results, schedules, and standings from 1950 onward.

## Quick start

```bash
npm install -g fastlytics-mcp
fastlytics-mcp setup      # writes the client config for you
```

The setup wizard detects installed clients and writes the right config block for each one. Or configure a client by hand:

```json
{
  "mcpServers": {
    "fastlytics": {
      "command": "npx",
      "args": ["-y", "fastlytics-mcp"],
      "env": { "FASTLYTICS_MCP_API_KEY": "fl_mcp_..." }
    }
  }
}
```

Get a key at [fastlytics.app/settings](https://fastlytics.app/settings?section=api-keys).

## Remote (hosted) server

```
https://mcp.fastlytics.app/mcp
```

Pass the key per request:

```
Authorization: Bearer fl_mcp_...
```

The hosted instance accepts the key from `Authorization: Bearer`, `X-API-Key`, or `Api-Key` headers. Keys are read per request through an `AsyncLocalStorage` context, so one request never sees another request's key.

## Tools (29)

### Telemetry and circuit
`get_telemetry` `compare_telemetry` `get_circuit_info` `get_pace_distribution`

### Sessions and drivers
`list_events` `list_sessions` `list_drivers` `search_driver`

### Lap analysis and strategy
`get_laptimes` `get_laptimes_gaps` `get_lap_positions` `get_strategy` `get_stint_analysis`

### Results and standings
`get_race_results` `get_standings` `get_championship_progression`

### Race context
`get_race_control` `get_incidents`

### Team performance
`get_team_pace`

### Bios and history
`get_driver_bio` `get_driver_career` `get_driver_championship` `get_driver_teammates` `get_team_bio` `get_team_championship` `get_head_to_head` `get_leaderboard`

### Weather
`get_weather` `get_weather_forecast`

Every tool maps to one worker API endpoint. The mapping lives in `AGENTS.md`.

## Environment

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `FASTLYTICS_MCP_API_KEY` | stdio only | none | API key from fastlytics.app |
| `FASTLYTICS_API_URL` | no | `https://fastlytics-api-proxy-v2.subhashgottumukkala17.workers.dev` | Worker API base URL |
| `TRANSPORT` | no | `stdio` | `stdio` or `http` |
| `HTTP_PORT` | no | `3456` | Port for the HTTP transport |

## Development

```bash
npm install
npm run build
npm run start:stdio      # stdio transport
npm run start:http       # HTTP + SSE on port 3456
```

## Deployment

Build artifacts are rsynced to the host and run under systemd, with nginx terminating TLS in front of the HTTP transport. `deploy/` contains the unit file, the nginx server block, and the deploy script.

```bash
./deploy/deploy.sh user@host
```

## Privacy Policy

Full policy: https://fastlytics.app/privacy

This server is a thin proxy. Every tool call is an authenticated HTTPS request from your machine
to the Fastlytics API; no F1 data is stored on your machine, and the server holds no database,
object storage, or payment access.

**Data collected.** Your API key is sent as a bearer token to authenticate each request. Query
parameters you pass to a tool (season, event, session, driver codes) are sent to the API to service
that request.

**Usage and storage.** The server is stateless. It performs no logging of queries or results to
disk. The hosted API at `mcp.fastlytics.app` records request counts against your account's rate
limit, which is how usage such as "0/3000" is reported.

**Third-party sharing.** Requests are sent only to the Fastlytics API. The server does not send
data to any other service or third party.

**Data retention.** Nothing is retained by this server. Retention for data held by the Fastlytics
API and its underlying storage is described in the privacy policy above.

**Contact.** https://fastlytics.app for support.

## License

MIT
