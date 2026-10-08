---
name: race-pace
description: Work out who was genuinely fastest in a Formula 1 race, sprint or practice long run with Fastlytics lap data - cleaned lap times, consistency, team pace and fair comparisons across tyres. Use when the user asks who had the fastest car, about race pace, consistency, long-run pace, or how far one team is ahead of another.
---

# Race pace

Lap data exists from 2018. Follow the `f1-analysis` skill to resolve the event, session and drivers.

## Calls

- One event, team level: `get_team_pace(year, event, session)` for lap-time distributions per team.
- Whole season, team level: `get_team_pace(year)` without event.
- Drivers: `get_laptimes(year, event, session, drivers)` and, for consistency, `get_pace_distribution` with the same drivers.

## Clean the laps before comparing

Raw averages mislead. From `driverLapDetails`, drop:

- lap 1 (standing start) and the in-lap and out-lap around each pit stop (where `stint` changes, or the slow laps either side);
- laps whose `trackStatus` is anything other than `"1"` (green). `4` is a Safety Car, `6` and `7` a VSC, `5` a red flag, `2` yellow;
- laps with no `lapTime`, and `deleted` laps;
- obvious outliers: anything more than about 107% of the driver's median clean lap (traffic, a mistake, damage).

Say how many laps were kept for each driver.

## Compare fairly

- **Same compound and similar `tyreLife`:** compare stints on the same tyre at similar ages. A driver on fresh softs at the end is not faster than one on 30-lap-old hards.
- **Fuel:** cars get about 0.03-0.06 s per lap quicker as fuel burns. Compare the same phase of the race, or say that the comparison ignores fuel.
- **Clean air:** a driver stuck in a train is slower than their car. A small, steady gap to the car ahead (under about 1.5 s for many laps) suggests they were held up.
- **Median over mean:** use the median clean lap for pace and the spread (interquartile range or standard deviation) for consistency.

## What to report

- A ranking by median clean lap, with gap to the fastest and number of laps used.
- Consistency: who had the tightest spread.
- The caveats that matter for this race (different strategies, traffic, Safety Car-shortened stints).
- When the client can render charts, a lap-time scatter by lap number coloured by compound shows tyre wear and fuel effect at a glance.

## Avoid

- Declaring the fastest car from the fastest single lap; one lap on fresh tyres says little about race pace.
- Practice long-run conclusions stated as fact; fuel loads and engine modes are unknown, so call them indications.
