---
name: qualifying
description: Analyse a Formula 1 qualifying or sprint qualifying session with Fastlytics data - the order, gaps to pole, teammate gaps, who improved on their final run and where pole was won. Use when the user asks about qualifying, pole position, the grid, a qualifying gap, or why a driver was knocked out.
---

# Qualifying analysis

Follow the `f1-analysis` skill to resolve the event. Use session `Q`, or `SQ` for sprint qualifying.

## Calls

1. `get_race_results` with session `Q` (or `SQ`) for the classified order and times.
2. `get_laptimes` for the drivers in question (pole sitter, the driver asked about, their teammate). Each lap in `driverLapDetails` has `lapTime`, `sector1-3`, `compound`, `deleted`, `deletedReason` and speed-trap values.
3. Where pole was won or lost: `compare_telemetry` on the two fastest laps, then follow the `telemetry-compare` skill.

If the results call says qualifying results are not available, rebuild the order from `get_laptimes`: each driver's best lap that is not `deleted`. Say that the order is reconstructed from lap times and may not reflect penalties.

## Reading qualifying laps

- A qualifying lap list alternates out-laps, push laps and in-laps. Push laps are the ones within a few percent of the driver's best; out- and in-laps are 15-40 s slower or have no time. Ignore the slow ones.
- `deleted: true` means the time was removed, usually for track limits. A deleted lap that would have been quicker is worth mentioning, with `deletedReason`.
- Track evolution: grip improves through the session, so later laps are usually quicker. A driver who improved on the final run may simply have had a better track, not a better car.
- Lap data does not label Q1, Q2 and Q3. Use the classified positions from the results instead of guessing which part a lap belongs to. The top 10 reach Q3, and the rest of the field is split evenly between Q1 and Q2 knockouts (5 each with 20 cars, 6 each with the 22-car grid from 2026). Count the drivers in the results rather than assuming.
- Sum each driver's best sectors for an ideal lap. The difference between ideal and actual best shows who left time on the table.

## What to report

- Pole time and margin, top-10 gaps to pole, and the teammate gap for each team when the user cares about the whole grid.
- For one driver: their best lap, gap to pole and to their teammate, which sector cost them, and any deleted lap.
- Speed-trap values (`speedST`, `speedFL`) hint at wing level: a car fast in the trap but slow overall is likely running less downforce.

## Avoid

- Treating qualifying position as the starting grid. Grid penalties change the order; use the race `grid` column from `get_race_results` with `R` for the actual start order.
- Comparing laps across sessions (Q vs SQ, or different years) as if conditions were equal.
