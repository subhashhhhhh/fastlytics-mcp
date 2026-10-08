---
name: f1-analysis
description: Core rules for answering any Formula 1 question with the Fastlytics MCP tools - data coverage, how to resolve year/event/session and driver identifiers, which tool answers which question, plan limits, and how to report. Use for any F1 question; the topic skills (race-recap, qualifying, telemetry-compare, strategy, race-pace, championship, driver-history, weekend-preview) build on it.
---

# F1 analysis with Fastlytics

Every answer about a race, lap or driver should come from a Fastlytics tool call, not from memory. Say which session and year the numbers come from.

## Data coverage

- Results, schedules, standings and championship progression: 1950 to the current season.
- Telemetry, lap times, gaps, stints, strategy, pace, race control and incidents: 2018 onward. For earlier years, say the data does not exist rather than estimating it.
- Driver and team bios, careers, head-to-heads and leaderboards: all eras.

## Identify the session first

Most tools take `year`, `event` and `session`. Resolve them before fetching data:

1. `list_events(year)` gives event names and round numbers. Pass the event name exactly as returned, for example `"Bahrain Grand Prix"`.
2. `list_sessions(year, event)` shows which sessions exist. Codes: `R` race, `Q` qualifying, `S` or `Sprint`, `SQ` sprint qualifying, `FP1`, `FP2`, `FP3`. Sprint weekends have fewer practice sessions.
3. `list_drivers(year, event, session)` gives the 3-letter codes (`VER`, `HAM`, `LEC`) that session-level tools need.

Skip a step only when the user already supplied an unambiguous value. "Last race" or "this weekend" means: call `list_events` for the current year and pick by date.

## Two kinds of driver identifier

- **3-letter codes** for session data: `get_telemetry`, `compare_telemetry`, `get_laptimes`, `get_laptimes_gaps`, `get_pace_distribution`.
- **Slugs** such as `max_verstappen` or `ferrari` for history: `get_driver_bio`, `get_driver_career`, `get_driver_championship`, `get_driver_teammates`, `get_head_to_head`, `get_team_bio`, `get_team_championship`. Get slugs from `search_driver(query)`.

## Which tool for which question

| Question | Tools | Deeper method |
| --- | --- | --- |
| Who won, finishing order, grid, DNFs | `get_race_results` (session defaults to `R`) | race-recap |
| Qualifying order, gaps to pole | `get_race_results` with `Q`, `get_laptimes` | qualifying |
| Where one driver gains on another | `compare_telemetry`, `get_circuit_info` | telemetry-compare |
| Tyres, pit stops, undercuts | `get_strategy`, `get_stint_analysis`, `get_laptimes_gaps` | strategy |
| Who was really fastest | `get_laptimes`, `get_pace_distribution`, `get_team_pace` | race-pace |
| Title fight, standings | `get_standings`, `get_championship_progression` | championship |
| Careers, teammates, records | `get_driver_career`, `get_head_to_head`, `get_leaderboard` | driver-history |
| Upcoming weekend | `list_events`, `get_circuit_info`, `get_weather_forecast` | weekend-preview |
| Safety cars, flags, penalties | `get_race_control`, `get_incidents` | race-recap |

## Plan limits and errors

- Each account has a monthly tool-call allowance (Free 300, Pro 3000). Plan the fewest calls that answer the question; do not fetch every driver when two were asked about.
- A message saying the monthly limit is reached, that the free plan only covers the current season, or that the tier does not include an endpoint is a plan limit, not missing data. Tell the user plainly and point them to https://fastlytics.app/settings. Do not retry the same call.
- "Not found" or "not available" for a session usually means it has not been processed or did not happen. Say so and suggest the nearest available session.

## Reporting

- Lead with the direct answer, then the supporting numbers.
- Telemetry and lap data are large. Summarise them: deltas, where on the lap they occur, braking points, top speeds. Do not paste raw traces.
- Compare like with like: same session, and the fastest lap or a representative stint on the same compound.
- Lap times from the API are in seconds. Show them as `1:23.456`, gaps as `+0.123s`.
- When the client can render charts or artifacts, a small chart (gap over laps, lap-time scatter, speed trace) beats a long table. Otherwise use a compact table.
