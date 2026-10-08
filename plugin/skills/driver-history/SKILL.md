---
name: driver-history
description: Answer Formula 1 history questions with Fastlytics data - driver and team careers, teammate head-to-heads, all-time records and leaderboards, and comparisons across eras. Use when the user asks about a driver's or team's career, who beat whom as teammates, records such as most wins or poles, or compares drivers from different eras.
---

# Driver and team history

Career, bio and leaderboard data cover every season from 1950.

## Calls

1. `search_driver(query)` to get the slug (`lewis_hamilton`, `ferrari`). Never guess a slug.
2. Then the tool that matches the question:

| Question | Tool |
| --- | --- |
| Career totals and teams | `get_driver_career(slug)` |
| Background, early life | `get_driver_bio(slug)`, `get_team_bio(slug)` |
| Every teammate and the record against each | `get_driver_teammates(slug)` |
| Two drivers side by side | `get_head_to_head(slug1, slug2)` |
| One season round by round | `get_driver_championship(slug, season)`, `get_team_championship(slug, season)` |
| Records | `get_leaderboard(type, stat, limit, min_races)` |

Leaderboard stats for drivers: wins, points, podiums, poles, championships, win-streaks, podium-streaks, win-percentage, entries, dnfs, fastest-laps, average-finish, seasons. For teams: wins, championships, podiums, poles, points, entries, seasons, win-percentage, podium-percentage, average-finish, one-two-finishes, dnfs, fastest-laps, drivers-fielded.

For percentage and average stats, set `min_races` (for example 50) so drivers with a handful of starts do not top the list.

## Comparing across eras

Raw totals favour modern drivers. Season lengths grew from 7-11 races in the 1950s to over 20 today, points per win changed several times, and reliability used to be far worse. When comparing eras:

- prefer rates (win percentage, podium percentage, poles per start) over totals, with `min_races` set;
- mention the number of entries next to any total;
- do not convert points between scoring systems unless asked, and say so if you do.

## Teammate comparisons

Teammates share a car, so the teammate record is the fairest driver comparison there is. From `get_driver_teammates` or `get_head_to_head`, report the qualifying and race head-to-head for the seasons they shared, and note seasons where one driver missed races.

## Avoid

- Calling anyone "the greatest". Present the numbers and the context, and let the user judge.
- Using bio text for statistics; take numbers from the career, head-to-head or leaderboard tools.
