---
name: race-recap
description: Write a recap of a Formula 1 race or sprint from Fastlytics data - result, start, safety cars, incidents, pit stops and how the win was decided. Use when the user asks what happened in a race, how someone won or lost, or wants a race summary or report.
---

# Race recap

Follow the `f1-analysis` skill to resolve the event and session (`R`, or `Sprint` for a sprint). Recaps rely on lap-level data, which exists from 2018; for earlier races give the result and championship impact only.

## Calls, in order

1. `get_race_results` - finishing order, grid, gaps, status (DNF reasons), points, fastest lap.
2. `get_race_control` - Safety Car, VSC and red flag deployments with lap numbers, penalties, notable flags.
3. `get_incidents` - collisions and investigations, with the drivers involved.
4. `get_strategy` - each driver's stints and `pitStops` (lap, stationary-plus-lane `duration`, tyre change).
5. Only if the result hinged on a battle: `get_laptimes_gaps` for the two or three drivers involved, and `get_lap_positions` for position swings.

Five calls cover most recaps. Skip 5 when the winner led every lap unchallenged.

## Finding the story

- **The start:** compare `grid` with position after lap 1 (`get_lap_positions`) for the front-runners. Note pit-lane starts.
- **Turning points:** a Safety Car or VSC that came out just after some drivers had pitted, a slow stop (well above the field's typical `duration`), a penalty, a crash between contenders, or rain.
- **How it was decided:** pace (the winner pulled away on similar tyres), strategy (one-stop beat two-stop, an undercut), or circumstance (a leader's DNF, a well-timed neutralisation). Say which, with the lap and the numbers.
- **Further down the field:** biggest gains from the grid, notable DNFs, and points for teams fighting close in the standings.

## Shape of the answer

1. One sentence: who won, by how much, from where on the grid.
2. A short lap-ordered narrative of the 3-5 moments that shaped the result, each with its lap number.
3. A compact top-10 table: position, driver, team, grid, gap or status, stops.
4. One line on what it means for the championship, only if the user is following a season. Use the `championship` skill for anything more.

## Avoid

- Inventing radio messages, quotes or reasons for retirements that the data does not give. Use the `status` text as given.
- Calling a stop "slow" without comparing it to the other stops in the same race; pit-lane length differs by circuit.
- Opinions about who "deserved" to win. Stick to what happened and the numbers.
