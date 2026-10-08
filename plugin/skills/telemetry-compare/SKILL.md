---
name: telemetry-compare
description: Compare two Formula 1 drivers' laps corner by corner with Fastlytics telemetry - braking points, minimum speed, throttle application and top speed - and explain where the time is gained. Use when the user asks where one driver is faster than another, how a lap was won, or about driving style, braking, cornering or straight-line speed.
---

# Telemetry comparison

Telemetry exists from 2018. Follow the `f1-analysis` skill to resolve the event, session and 3-letter codes.

## Choose comparable laps

The comparison is only as good as the laps chosen.

- **Qualifying:** each driver's fastest lap (`lap: "fastest"`). This is the cleanest comparison there is.
- **Race:** pick laps on the same compound, at a similar point in the stint, with clean air. Use `get_laptimes` first: avoid lap 1, in- and out-laps, laps with a non-green `trackStatus`, and laps right behind another car. Pass the lap numbers explicitly.
- **Practice:** say which laps are likely low-fuel runs and which are long runs; fuel loads are unknown, so treat practice comparisons as indicative.

## Calls

1. `compare_telemetry(year, event, session, driver1, lap1, driver2, lap2)` - both speed traces over distance plus sector comparison.
2. `get_circuit_info(year, event)` - corner numbers, names and distances, so deltas can be tied to named corners.
3. Only when the speed trace leaves a question open: `get_telemetry` with `type` = `brake`, `throttle` or `gear` for the specific lap. Each call returns a full trace, so ask for one channel at a time.

## Reading the traces

Work through the lap in order and attach each difference to a corner by distance:

- **Braking:** the point where speed starts to fall sharply. Braking later and still making the corner is time gained.
- **Minimum speed:** the lowest speed in the corner. Higher minimum speed often comes with a later throttle pickup trade-off.
- **Traction and exit:** how quickly speed rises after the apex, which decides the speed down the next straight.
- **Straights:** a top-speed difference with similar exits points to wing level, DRS or engine mode, not driving.
- **Gear:** a different gear in the same corner shows a different line or approach.

## What to report

- The overall gap and the sector split.
- The 3-5 places where most of the gap comes from, each with corner number or name, what differs (for example "brakes about 10 m later into Turn 1, carries 6 km/h more minimum speed") and the time it is worth.
- Whether the gap comes mainly from corners (driver or downforce) or straights (drag, power, DRS).
- When the client can render it, a speed-vs-distance chart with corners marked says more than a table.

## Avoid

- Calling a difference "driver skill" when it could be car set-up, tyre age or fuel. Describe what differs, not why, unless the data shows it.
- Comparing laps from different sessions or years as if like-for-like.
