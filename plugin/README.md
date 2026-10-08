# Fastlytics plugin for Claude Code

Adds the [Fastlytics](https://fastlytics.app) MCP server to Claude Code and Cowork: 29 tools for Formula 1 telemetry (2018 onward), lap-time and stint analysis, race strategy, results and standings (1950 onward), driver and team bios, and race weekend weather.

On install you are asked for a Fastlytics API key, which is stored as a sensitive value. Create a free key at [fastlytics.app/settings](https://fastlytics.app/settings?section=api-keys).

The server runs locally as `fastlytics-mcp@1.2.2`, pinned with `package-lock.json` in this folder. Every tool call is one authenticated HTTPS request to the Fastlytics API; the key is sent only there. Source and full tool list: [the repository README](https://github.com/subhashhhhhh/fastlytics-mcp#readme). Privacy policy: [fastlytics.app/privacy-policy](https://fastlytics.app/privacy-policy).
