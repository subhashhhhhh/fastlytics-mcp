# Fastlytics plugin for Claude

Adds the [Fastlytics](https://fastlytics.app) MCP server to Claude Code, Cowork and Claude chat: 29 read-only tools for Formula 1 telemetry (2018 onward), lap-time and stint analysis, race strategy, results and standings (1950 onward), driver and team bios, and race weekend weather. It also adds skills that teach Claude how to use those tools well:

| Skill | For |
| --- | --- |
| `f1-analysis` | Core rules: data coverage, resolving sessions and drivers, which tool answers which question, plan limits |
| `race-recap` | What happened in a race and how it was decided |
| `qualifying` | Qualifying order, gaps to pole, deleted laps, where pole was won |
| `telemetry-compare` | Corner-by-corner comparison of two drivers' laps |
| `strategy` | Tyres, pit stops, undercuts and Safety Car timing |
| `race-pace` | Who was really fastest, from cleaned lap times |
| `championship` | Standings, how a title fight evolved, who can still win |
| `driver-history` | Careers, teammate head-to-heads, records across eras |
| `weekend-preview` | Schedule, circuit, forecast and recent history for an upcoming race |

The plugin connects to the hosted server at `https://mcp.fastlytics.app/mcp`. The first time a tool runs, Claude asks you to sign in with your Fastlytics account and approve access; no API key is needed. You can revoke access at any time from your Fastlytics account. Calls count toward your plan's monthly MCP quota.

Source and full tool list: [the repository README](https://github.com/subhashhhhhh/fastlytics-mcp#readme). Privacy policy: [fastlytics.app/privacy-policy](https://fastlytics.app/privacy-policy).
