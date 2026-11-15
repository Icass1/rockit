# Installed iOS PWA: bottom surface

The navigation already includes `safe-area-inset-bottom` once. The earlier
34 px browser regression verified that inset and its color inside the CSS
viewport. It did not verify the installed iOS surface outside that viewport;
passing it was insufficient evidence that the black band was fixed on iPhone.

## Document and launch configuration

WebKit can paint the inset/background outside application content from the
page background. Keep `html` and `body` the navigation surface color in app
routes, in both themes. Keep `#root` the content background. Authentication and
standalone utility routes use the content background. Set `theme-color` to the
same outer surface and initialize the exported HTML before React loads.

The PWA now requests the non-translucent `black` Apple status bar rather than
`black-translucent`. WebKit reports describe a standalone viewport shorter than
the screen by the status bar height in translucent mode, leaving a bottom
region outside CSS layout. These reports explain why adding more tab padding
is not a reliable correction; they do not establish the user's exact iOS bug.
Do not add guessed screen-height compensation or duplicate the safe inset.

The generated shell cache includes the changed HTML and manifest. Preserve the
normal service-worker update lifecycle and active playback; do not force a
reload while music is playing. Startup metadata is applied when the installed
PWA opens again after its update becomes active.

## Verification and remaining device acceptance

Unit tests check the initial shell, launch metadata, idempotent generation and
runtime theme updates. Production Chromium flows check the existing 34 px
inset, initial document colors with application scripts blocked, reload and
rotation, and a modeled region outside the React root. That last case checks
the document underlay; it is not an emulation of Safari's OS-owned surface.

Physical iPhone verification is still required: open the updated installed PWA
from a cold start, navigate between app pages and the full-screen player,
background and resume, and rotate where supported. The bottom surface must
match the navigation gray, with one home-indicator inset and no extra black
band. Also check a keyboard open/close and both themes. No iOS device or
simulator is available in this execution environment.

## References

- [WebKit: Designing Websites for iPhone X](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
  describes safe-area backgrounds and `viewport-fit=cover`.
- [WebKit 313800](https://bugs.webkit.org/show_bug.cgi?id=313800) describes an
  installed PWA's shorter visual viewport with `black-translucent`.
- [WebKit 301994](https://bugs.webkit.org/show_bug.cgi?id=301994) records related
  standalone viewport and bottom-background behavior across iOS versions.
