# Emblem collection

RockIt! has 903 collectible emblems across 64 families. The previous 615
achievements are unchanged; 48 new families add six ranks each (288 achievements).
The six leagues produce 384 family/league artwork combinations. The catalog lives in `listeningBadgeCatalog.py`; labels and objectives
are translated in Vocabulary.xlsx. Emblems grant no additional XP.

## Categories and horizons

| Family             | Emblems | Evidence                                        |
| ------------------ | ------: | ----------------------------------------------- |
| Sessions           |      20 | Verified listening in the current session       |
| Total listening    |     100 | Persisted verified listening minutes            |
| Recorded listens   |     100 | Recorded play events                            |
| Discovery          |      65 | Distinct recordings listened to                 |
| Streaks            |      40 | Existing consecutive-day streak                 |
| Recommendations    |      35 | Distinct recipient/recording recommendations    |
| Friends            |      15 | Mutually accepted friendships                   |
| Video              |      30 | Recorded video listens                          |
| Discover and share |      25 | Both distinct recordings and recommendations    |
| Active days        |      50 | Distinct UTC dates with a recorded listen       |
| After dark         |      25 | Recorded listens from 00:00 to 05:00 UTC        |
| First light        |      25 | Recorded listens from 05:00 to 09:00 UTC        |
| Weekends           |      25 | Recorded listens on Saturday/Sunday in UTC      |
| First chapters     |      15 | Completed days since account creation           |
| Anniversaries      |      20 | Completed calendar years, from one to twenty    |
| Hidden tracks      |      25 | Secret milestones in existing recorded counters |

New milestones are distributed across early, intermediate and long-term goals.
Session milestones remain capped at six hours. Calendar longevity is separate
from active listening: anniversary/first-chapter emblems require at least one
recorded listen and never invent activity for an unused account. February 29
anniversaries fall on February 28 in non-leap years, at the original UTC time.
The application does not currently store an account time zone, so time-of-day
objectives explicitly identify UTC rather than claiming to use local time.

The 48 additional families use separate evidence, with six increasing thresholds
and one original symbol per family:

| Group              | Families | Evidence                                                                      |
| ------------------ | -------: | ----------------------------------------------------------------------------- |
| Listening windows  |        4 | Recorded plays at 09–12, 12–15, 15–19 and 19–24 UTC                           |
| Weekdays           |        7 | Recorded plays on each ISO weekday in UTC                                     |
| Seasons            |        4 | Fixed month groups: Dec–Feb, Mar–May, Jun–Aug and Sep–Nov                     |
| Special dates      |        5 | Jan 1, Feb 29, Jun 21, Oct 31 and Dec 31, across all years                    |
| Calendar diversity |        6 | Distinct active months, years, ISO weeks, hours, weekdays and month names     |
| Rotation           |        3 | Peak listens to one recording; recordings played at least 10 or 50 times      |
| Saved collection   |        8 | Current saved counts of six media types, all items and distinct types         |
| Sharing            |       11 | Unique recipients/items, incoming curators, sending dates and six media types |

Calendar diversity does not imply consecutive activity, and recorded plays do not
claim full-track completion. Active years require recorded use in each year,
unlike account anniversaries. Seasonal names use the explicit fixed month groups,
not inferred weather, location or hemisphere. February 29 can only advance from
real events on that date. Library thresholds describe simultaneous saved counts;
persisted awards survive later deletion. Sharing deduplicates recipient/item
pairs; discovery-of-shares counts an item only once across recipients. Incoming
recommendations remain scoped to their actual recipient.

## Leagues and artwork

Bronze, silver, gold, platinum, diamond and legend progress through each family.
They have separate silhouettes and shared theme palettes. Category relief,
league finish and distinct silhouettes provide collectible designs. Front faces
reserve a clear interior; the logo and Roman rank appear on the inspectable
reverse rather than overlapping the family motif. The browser and native SVG adapter use the same
artwork source; gradient IDs remain unique across inline native-web instances.

The first 115 keys, thresholds and title keys are preserved. Adding milestones
between existing goals does not renumber persistent identifiers. Previously
awarded rows and their dates remain authoritative, including session milestones
after the active session expires.

## Evaluation and cost

Seven fixed batch queries load progress/account creation, recorded-listen
aggregates, recommendations, mutual friendships and the three additional
history/library/sharing aggregates. The additional 48 counters use three
statements for any batch size, rather than one query per emblem. One set of metric values is
projected per user; eligible awards are inserted in a batch with conflict handling.
No database migration, external API or background polling is required.

Full profiles include the catalog. Leaderboards return earned emblems and explicit
collection totals, avoiding hundreds of locked definitions for every friend.
Web and mobile show three highlights or nine catalog entries at a time, with
family, league and earned-state filters. The older web comparison collection is
also paginated. Locked secret objectives have generic copy and zeroed progress;
their titles and conditions are revealed after a persisted award.

## Verification

Fast backend contracts cover catalog uniqueness and legacy identity, all workbook
languages, leap-year boundaries, unused/future accounts, hidden objectives,
batched award calls and SQL aggregation shape. Portable/native component checks
cover artwork, filters and bounded rendering against a 903-item fixture, plus all 64 family filters. Browser
checks exercise both profile hosts. The optional PostgreSQL persistence suite
requires `ROCKIT_TEST_DATABASE_URL`; SQL-capture tests do not establish live
PostgreSQL persistence or query latency.

See [Prism inspection](../frontend/prism-medals.md) for browser rendering, engraving and native fallback limits.
