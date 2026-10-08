---
name: strategy
description: Analyse Formula 1 race strategy with Fastlytics data - tyre choices, stint lengths, pit stops, degradation, undercuts and overcuts, and the effect of Safety Cars on strategy. Use when the user asks about tyres, pit stops, one-stop vs two-stop, whether an undercut worked, or why a team pitted when it did.
---

# Strategy analysis

Stint and pit data exist from 2018. Follow the `f1-analysis` skill to resolve the event; the session is normally `R` (or `Sprint`).

## Calls

1. `get_strategy` - per-driver `stints` (compound, start and end lap, tyre life, `freshTyre`, average and best lap), `pitStops` (lap, `duration`, tyre from and to) and `raceControl` messages with lap numbers.
2. `get_stint_analysis` - per-stint `tyreDegradation` (seconds per lap of slowdown) and per-lap details. Use it to compare how compounds and drivers wore their tyres.
3. For a specific undercut or overcut: `get_laptimes_gaps` for the two drivers involved.

## Methods

- **Field overview:** group drivers by strategy (for example M-H one-stop, S-M-H two-stop) and show where each group finished. That usually answers "which strategy was best".
- **Neutralised stops:** cross-check stop laps with Safety Car and VSC periods in `raceControl`. A stop under SC or VSC costs far less time; say who benefited and by how much.
- **Undercut or overcut:** for two drivers who pitted on different laps, compare the gap on the lap before the first stop with the gap once both have pitted. If the earlier stopper gained, the undercut worked; the out-lap on fresh tyres is usually the reason. If the later stopper gained, the overcut worked, typically because their old tyres were still quick or the earlier stopper hit traffic.
- **Degradation:** `tyreDegradation` near zero means fuel burn masked the wear; larger values show real wear. Compare drivers on the same compound only.
- **Stop times:** `duration` includes the pit-lane transit, which differs by circuit. Compare stops within the same race; the field median is the baseline.
- **Fresh vs used tyres:** `freshTyre: false` at a stint start means a used set, usually from qualifying, which affects pace and stint length.

## What to report

- The strategy each relevant driver ran, as compound sequence plus stop laps.
- The decisive strategic moment with numbers: positions gained or lost and gap before and after.
- For field-wide questions: a compact table of strategy groups and their finishing positions, or a stint chart (laps on the x-axis, one bar per driver, coloured by compound) when the client can render it.

## Avoid

- Claiming a team "should have" pitted earlier without the gap data to back it.
- Treating a stop under Safety Car the same as a green-flag stop.
