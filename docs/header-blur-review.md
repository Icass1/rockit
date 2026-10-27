# Header blur and legibility review — KB-28

The header keeps its controls readable over music artwork while blending back into
page content. This revision replaces the six full-size filter surfaces with three
cropped progressive bands, adds a light tint, and fixes keyboard focus and
narrow desktop overflow. The card remains To Review.

## Implementation

- `HeaderBackdrop.tsx`: 1/4/16 px layers, each limited to its useful vertical band.
  Strong blur starts fading at 75% of the measured header height; the softest band
  reaches the end of a 64 px tail. Masks blend between softened surfaces rather
  than fading one strong filter directly into sharp content.
- A ResizeObserver updates band geometry only when the header resizes, including
  changes to text size. No scroll listener, animated filter or perpetual JavaScript
  loop is introduced. The parent stays unfiltered/unmasked to preserve the backdrop.
- At viewport widths of at least 1920 px the middle band is omitted and blur is
  capped at 4 px. The light tint preserves translucency while the capped blur bounds the cost
  of filtering a wide surface.
- A black tint at 10% alpha covers the header and fades over the tail. This is a
  separate foreground paint, so it does not isolate the filter backdrop or dim the
  controls. This follows the user’s preference for translucency. Contrast in the
  normal translucent mode depends on page content; it no longer has the conservative
  contrast bound measured with the earlier 72% tint. The opaque accessibility
  fallbacks remain available.
- Reduced transparency and increased contrast use an opaque #121214 background
  with no filter layers. Browsers without backdrop-filter receive the same fallback.
- Header controls use lighter active, online, offline and streak colours; the unread
  badge has a darker red surface. Search has a visible 2 px focus outline and an
  explicit placeholder colour. Notification and sign-in controls have a 44 px target.
- The header grid now allocates room by content instead of fixed thirds. On compact
  desktops the username remains the accessible button name while its visual label
  is hidden; the avatar/menu remain available. Sign-in and streak copy use existing
  vocabulary keys. LOG_IN translations are explicit in Vocabulary.xlsx (es/fr).

## Historical contrast observations — earlier 72% tint

Measured from computed CSS colours in the actual components, composited over a
conservative white underlay with the 72% black scrim. Ratios use WCAG 2.x relative
luminance; these results cover the listed header states, not a whole-app audit.
The focus outline is compared with the surrounding scrim, not the darker input.
These ratios describe the earlier 72% tint only and do not certify the current
10% translucent variant.

| State | Ratio | Target |
| --- | ---: | ---: |
| Username | 9.23:1 | 4.5:1 |
| Online count | 5.19:1 | 4.5:1 |
| Streak count | 5.42:1 | 4.5:1 |
| Offline count | 6.23:1 | 4.5:1 |
| Active username | 4.97:1 | 4.5:1 |
| Search text | 17.93:1 | 4.5:1 |
| Search placeholder | 6.94:1 | 4.5:1 |
| Notification icon, default / active | 6.23 / 4.97:1 | 3:1 |
| Unread badge | 6.42:1 | 4.5:1 |
| Sign-in text | 7.13:1 | 4.5:1 |
| Search focus outline | 5.06:1 | 3:1 |

## Rendering and accessibility observations

Browser review used real React components with sample state/HTTP adapters in
headless Chromium, without local test suites. Text, colour stripes, a checkerboard,
photography and a flat white underlay were inspected. No JavaScript errors were
observed. Component captures at 768, 1024, 1440 and 3440 px had no horizontal
page overflow; the earlier fixed-third grid overflowed at 768 px. At 1440 px,
200% root text size increased the header from 88 to 176 px without page overflow.
Reduced-transparency and increased-contrast emulation both hid every filter layer
and rendered the opaque fallback.

Scroll observations used 120 requestAnimationFrame-driven scroll updates over a
repeating checkerboard. They are short render observations in a software-rendered
sandbox, not a production GPU benchmark or a guarantee of 60 fps.

| Configuration | Width | Median frame interval | p95 |
| --- | ---: | ---: | ---: |
| Earlier six full-size layers | 1440 | 43.5 ms | 85.3 ms |
| Earlier six full-size layers | 3440 | 88.5 ms | 137.3 ms |
| Cropped three-layer version | 1440 | 16.7 ms | 26.6 ms |
| Final adaptive two-layer version, 4 px cap | 3440 | 20.9 ms | 23.6 ms |
| Blur disabled, same wide fixture | 3440 | 16.7 ms | 17.0 ms |

Safari/macOS/iOS and production hardware were unavailable. The implementation
includes prefixed filter/mask properties and fallbacks, but real Safari scrolling,
compositing and battery/GPU behaviour still require integrated review. The current 10% tint intentionally prioritises translucency; contrast over light
content is not guaranteed in normal mode. The rest of the application and popover
content need their own audits.

Existing deployments must import Vocabulary.xlsx through the normal
`python3 -m backend import-vocabulary` workflow to update persisted translations.
This review did not connect to or modify a deployed database.
