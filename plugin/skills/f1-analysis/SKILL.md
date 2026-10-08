---
name: f1-analysis
description: Answer Formula 1 questions with the Fastlytics MCP tools - race results, standings, lap times, tyre strategy, telemetry comparisons, driver and team history, and race weekend weather. Use when the user asks about an F1 race, session, driver, team, season or championship.
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

Skip a step only when the user already supplied an unambiguous value.

## Two kinds of driver identifier

- **3-letter codes** for session data: `get_telemetry`, `compare_telemetry`, `get_laptimes`, `get_stint_analysis`, `get_pace_distribution`.
- **Slugs** such as `max_verstappen` or `ferrari` for history: `get_driver_bio`, `get_driver_career`, `get_driver_championship`, `get_driver_teammates`, `get_head_to_head`, `get_team_bio`, `get_team_championship`. Get slugs from `search_driver(query)`.

## Which tool for which question

| Question | Tools |
| --- | --- |
| Who won, finishing order, grid, DNFs | `get_race_results` (session defaults to `R`) |
| Championship table or how it evolved | `get_standings`, `get_championship_progression` |
| Race pace and consistency | `get_laptimes`, `get_pace_distribution`, `get_team_pace` |
| How the gap developed, position changes | `get_laptimes_gaps`, `get_lap_positions` |
| Tyres and pit stops | `get_strategy` (whole field), `get_stint_analysis` (chosen drivers) |
| Where one driver gains on another | `compare_telemetry`, then `get_circuit_info` to name the corners |
| A single channel on one lap | `get_telemetry` with `type` = speed, throttle, brake, gear, rpm, drs or steering; `lap` = a number or `"fastest"` |
| Safety cars, flags, penalties | `get_race_control`, `get_incidents` |
| Career, teammates, all-time records | `get_driver_career`, `get_driver_teammates`, `get_head_to_head`, `get_leaderboard` |
| Weather | `get_weather(location)`; `get_weather_forecast` for a date range at given coordinates |

## Reporting

- Lead with the direct answer, then the supporting numbers.
- Telemetry and lap data are large. Summarise them: deltas, where on the lap they occur, braking points, top speeds. Do not paste raw traces.
- When comparing drivers, compare like with like: same session, and the fastest lap or a representative stint on the same tyre compound.
- If a tool returns an error or no data, say so and suggest the nearest available session or year rather than guessing.
