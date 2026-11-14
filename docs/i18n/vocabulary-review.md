# Contextual vocabulary review — PR 212

The workbook remains the translation source of truth. This review covers the
complete English, Spanish and French dictionaries and the product copy introduced
or touched by PR 212.

## Results

- 2,284 existing keys reviewed; 900 existing language cells changed across 480 keys
  (21 English, 449 Spanish, 430 French).
- 78 fully translated keys added: interface labels/count templates and 63 singular
  medal stories. The final workbook contains 2,362 keys and 7,086 language values.
- All 754 original Excel translation formulas retained at their original cell
  addresses, with their original `TRANSLATE` fallback. Previously, 754 formula
  results lacked cached translations, so imports outside Excel fell back to English.
- No empty translations, Excel error values or mismatched placeholders remain.
  No original key, award identifier, target or earned date was removed or changed.

## Editorial choices

| Context | English | Spanish | French |
| --- | --- | --- | --- |
| Software diagnostics | Logs | Logs | Logs |
| Music library | Library | Biblioteca | Bibliothèque |
| Playback queue | Queue | Cola | File d’attente |
| Track timestamps | Bookmarks | Marcadores | Repères |
| Saved radio stream | Station | Emisora | Station |
| Saved playlist | Playlist | Lista de reproducción | Playlist |
| Pin / unpin | Pin / Unpin | Fijar / Desfijar | Épingler / Désépingler |

Restore context in account/settings, downloads, notifications, offline status,
search, library, radio, playback, statistics, administration and medal stories.
Correct English source typos and misleading labels before reviewing their
translations. French notification/download messages previously copied verbatim
from English now have French wording. Spanish playlist terminology is consistent;
placeholder names such as `{playlist}` remain technical identifiers in every
language. Short button labels may use “lista” where the surrounding UI gives the
context. Technical log levels, brands, media formats and user-provided names remain
data rather than translated interface copy.

Medals keep their concise narrative names and Roman tiers. Singular objectives
select reviewed `_ONE` stories when the target is one, including agreement in all
three languages. Secrets continue to use their existing redacted copy.

## Excel automation

Context-reviewed formula cells now follow this pattern:

```excel
=IF(EXACT(B224,"Logs"),"Logs",TRANSLATE(B224,$B$2,C$2))
```

The exact English source keeps the reviewed translation stable when Excel
recalculates. Editing that source resumes the original automatic translator.
Review the resulting suggestion in its product context before publishing a new
workbook. OOXML retains Excel's `_xlfn.TRANSLATE` spelling and stores the reviewed
string as the cached value, so the backend can import without launching Excel or
contacting a translation service. Existing styles, shared strings and other ZIP
members are preserved; only worksheet cells and the table range change.

To apply reviewed wording without losing formulas/caches:

```sh
python3 scripts/update-vocabulary.py reviewed.json
# reviewed.json: {"LOGS": {"es": "Logs", "fr": "Logs"}}
```

For new keys, provide all three translations to `scripts/append-vocabulary.py`.
Never edit generated JSON or TypeScript vocabulary declarations directly.
Regenerate them with the backend's `generate-vocabulary` command, then run:

```sh
pnpm check:vocabulary
pnpm check:frontend:boundaries
python3 -m unittest discover -s tests/tooling
node --test tests/tooling/ui-vocabulary.test.mjs
```

The workbook check enforces unique valid keys, all three language values, usable
formula caches, placeholder names/counts and the software meaning of Spanish
logs. The AST check covers JSX, conditional/interpolated labels, accessible names,
label/title configuration objects, toast/notification literals and hardcoded
formatting languages. CSS, action IDs and real vocabulary key references remain
excluded. These checks are regression guards; they complement contextual review.

## Application integration

Move queue errors, storage warnings, upload accessibility labels, library layouts,
unknown metadata fallbacks, player controls, collection counts, navigation and
featured-page metadata into vocabulary. Remove the unused mobile home component's
English dictionary. Format profile/leaderboard/statistics numbers and dates in
the selected interface language. Translate compact duration units through the
workbook and use locale-aware compact numbers. Collection counts use the actual
collection total for both the value and singular/plural selection.

## Validation

Record final check results in the PR and the web refactor progress log. Excel
itself is not installed in this environment: formula syntax, source guards,
original fallbacks, caches, ZIP preservation and idempotency are verified through
tooling contracts. Browser checks use the real cached workbook translations with
isolated fixture accounts; they do not update production translations or user data.
