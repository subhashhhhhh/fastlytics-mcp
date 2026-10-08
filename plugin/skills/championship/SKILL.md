---
name: championship
description: Explain a Formula 1 drivers' or constructors' championship with Fastlytics data - current standings, how the title fight evolved round by round, and whether a driver or team can still win it mathematically. Use when the user asks about standings, the title race, points gaps, who can still win, or how a past championship unfolded.
---

# Championship analysis

Standings and progression cover 1950 to the current season.

## Calls

- Current table: `get_standings(year, type)` with `type` = `drivers` or `teams`.
- How it evolved: `get_championship_progression(year)` for every driver or team, or `get_driver_championship(slug, season)` / `get_team_championship(slug, season)` for one (slugs from `search_driver`).
- Remaining rounds: `list_events(year)`. Rounds with a date in the future are still to come; note which use the sprint format.

## Can they still win?

Work it out from the real remaining schedule, not a rule of thumb:

1. Points available per remaining Grand Prix: 25 for a win. Fastest-lap bonus points exist only in 2019-2024; check the season before adding one.
2. Per remaining sprint: 8 for a sprint win (2022 onward; 2021 sprints paid 3-2-1).
3. Maximum still available = sum over the remaining rounds.
4. A driver is still in contention when their points plus the maximum available is at least the leader's points. If it is exactly equal, mention the tie-break (most wins, then most second places, and so on).
5. For the leader to clinch at the next round, they must lead by more than the maximum available after that round.

Show the arithmetic in one line, for example "Norris trails by 31 with 2 races and 1 sprint left (58 points available), so he is still in it."

Points systems changed over the decades. For historical seasons, describe the result with that season's own points and do not recompute it under modern scoring unless asked.

## Telling the story of a season

From the progression data, pick out:

- lead changes and the round where each happened;
- the largest single-round swing between the top two;
- runs of results that built or erased a lead.

When the client can render charts, a cumulative-points line chart for the top contenders is the clearest view.

## Avoid

- Predicting who will win. Report the arithmetic and what has happened.
- Mixing up drivers' and constructors' tables; confirm which one the user means.
