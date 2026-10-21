# Design review: Rocket Friends

## Summary

The screen's job is to bring people into the same music with as little friction
as possible. Its signature is the shared listening card: album artwork beside
the person you are listening with, with transport controls below. This applies
Apple's design principles to a Next.js web/PWA, rather than imitating native APIs.

## Critical

- Small, low-contrast labels and icon controls needed a stronger baseline. The
  scoped social styles now use secondary text `#b0b0b8` on `#171719` (8.31:1),
  44 px control heights, visible focus, and larger utility text.
  `accessibility.md › Vision`: “Strive to meet color contrast minimum standards.”
  `typography.md › Ensuring legibility`: “In general, avoid light font weights.”

## Improvements

- **High — navigation:** the five sections now use a quiet segmented surface,
  with semantic tabs, selected state, Arrow/Home/End navigation and linked panels.
  `layout.md › Visual hierarchy`: “Group related items to clearly express related
  information or functions.”
- **High — continuity:** existing content stays mounted during background friend
  refreshes instead of flashing a skeleton and resetting active controls.
  This is an interaction judgment specific to Rocket's real-time updates.
- **Medium — sharing:** the native HTML dialog has an accessible title, a clear
  cancel action, native focus containment, a sending indicator, and a compact
  bottom-sheet presentation on phones. It remains a single focused task.
- **Medium — reachability:** friend menus remain visible on touch devices; search
  and its clear action have explicit accessible names and comfortable hit regions.

## Craft notes

The palette comes from Rocket's dark listening environment and pink identity.
System fonts carry controls; album artwork carries expression. A segmented tab
surface replaces the animated hairline indicator. No ornamental blur is added
to content. Motion is limited to control feedback and respects reduced motion;
increased contrast strengthens secondary text and borders.

| Role | Dark value | Light reference value | Dark contrast |
| --- | --- | --- | --- |
| Base | `#0b0b0b` | `#f5f5f7` | — |
| Surface | `#171719` | `#ffffff` | — |
| Raised | `#242426` | `#e8e8ed` | — |
| Content | `#f5f5f7` | `#1d1d1f` | 16.44:1 on surface |
| Secondary | `#b0b0b8` | `#58585f` | 8.31:1 on surface |
| Action | `#ff6aa6` | `#a80b58` | 7.37:1 with dark button text |

The shipped styling follows Rocket's existing dark appearance; the light values
are reference tokens for a future app-wide appearance treatment. Display scale:
32–48 px page title, 28–40 px session title, 16 px body, 13–14 px utility text.

Compact layout:

```text
Friends / supporting description
[ scrollable section tabs ]
[       album artwork      ]
[ partner / track / controls ]
[ invite friend rows       ]
```

Regular layout:

```text
Friends / supporting description
[                 section tabs                ]
[ album artwork | partner / track / controls   ]
[ friend row    ] [ friend row    ] [ ...      ]
```

## What works

The existing player, consent to join, separate host/guest controls, localized
labels, queue restoration and message flow are retained. The design adds no
runtime package or playback changes. The fixed footer controls mount on the client
to avoid a hydration mismatch when the queue loads before React hydrates. Reusable styles stay scoped to Friends and
the share dialog.

## Platform notes

Verify 320 px through desktop widths, large text, keyboard navigation, native
Escape-to-dismiss, reduced motion and absence of horizontal page overflow.
Real iPhone safe areas and lock-screen playback remain device checks.

References were read from `skills/apple-design-skill/references/`: accessibility,
layout, typography, color, designing-for-ios, buttons, tab-bars, sheets and the
cross-platform translation. The upstream revision is pinned separately in
`skills/apple-design-skill.source.json`.
