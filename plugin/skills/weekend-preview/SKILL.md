---
name: weekend-preview
description: Prepare a factual preview of an upcoming Formula 1 race weekend with Fastlytics data - session schedule, circuit layout and characteristics, weather forecast and what happened at the circuit in recent years. Use when the user asks about the next race, what to expect at a circuit, the weekend schedule or the forecast.
---

# Weekend preview

## Calls

1. `list_events(year)` - find the event by date ("next race" means the first event whose date is in the future) and note its round, location, dates and format (sprint or conventional).
2. `list_sessions(year, event)` - the weekend's sessions.
3. `get_circuit_info(year, event)` - track length, lap count, corners and sectors. If the current year's event has not been loaded yet, use the previous year's edition of the same event.
4. `get_weather_forecast(latitude, longitude, start_date, end_date)` for the weekend's dates. Use the circuit's coordinates. If you do not know them, use `get_weather(location)` with the location from `list_events`.
5. Recent history: `get_race_results` for the same event in the last two or three seasons, and optionally `get_strategy` for last year to show the typical number of stops.
6. Context: `get_standings(year)` for the gaps going into the weekend.

## Shape of the answer

- When: round number, dates, sprint or conventional format, session list.
- Where: circuit length, laps, number of corners, and the defining features visible in the layout (long straights, slow corner sequences).
- Recent winners and pole sitters at this circuit, and last year's typical strategy.
- Forecast: temperature range and rain chance per day, flagged clearly as a forecast.
- Championship context in one or two lines.

## Avoid

- Predicting results or naming favourites. Present recent form and history, not picks.
- Presenting a forecast as certain; give the date it was fetched.
- Stating session start times from memory; use only what the tools return, and name the time zone.
