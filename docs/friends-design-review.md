# Rocket Friends — social dashboard

The screen brings your music identity, friends' progress and shared listening
into one continuous space. Five destination tabs hid the context needed to
compare friends; the dashboard now puts that context together.

## Design direction

A record-shaped level indicator references Rocket's vinyl player. Your identity
sits beside the listening league on desktop and above it on mobile. Activity,
listening invitations, shares and friend management remain on the same page.
Existing dark surfaces, pink accents, system typography, visible focus and
44 px controls establish a consistent foundation. The identity card alone gets
a restrained pink glow. No ornamental blur or fabricated ranking history.

## Interaction and motion

Choose a friend to compare recorded listens and streak inline. Equal XP receives
equal rank. A brief entry sequence establishes hierarchy; row press feedback,
avatar hover and a short comparison reveal acknowledge input. Nothing loops or
blocks interaction. Reduced motion disables these effects.

The installed Apple skill informs these decisions:

- `references/hig/layout.md › Visual hierarchy`: group related information.
- `references/hig/motion.md › Best practices`: “Add motion purposefully,
  supporting the experience without overshadowing it.”
- `references/hig/motion.md › Providing feedback`: “Aim for brevity and precision
  in feedback animations.”
- `references/hig/accessibility.md › Vision`: preserve contrast and alternatives
  to visual feedback.

## Honest progression

XP currently comes from recorded listens (10 XP each). The UI explains the rule
and displays all-time totals. Progress uses server-configured current and next
level thresholds. Profiles are batched and scoped to accepted friends and self.
Failed league requests offer retry. Other app activity needs a defined reward
policy before being presented as points.

Physical locked-screen iOS PWA playback remains a device verification; this
visual change does not alter the audio engine.
