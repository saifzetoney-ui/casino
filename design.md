# Design — Greenpump

A locked visual system for every Greenpump game view. Preserve the game logic and make every screen feel like one blue competitive-play environment.

## Genre

Atmospheric workbench: focused, dark, technical, and fast without visual noise.

## Macrostructure family

- App and game views: Workbench — the active game is the primary artifact, surrounded by calm control panels and live status.
- Utility views: Workbench variation — narrow panels for wallet, case, leaderboard, and chat share the same navy surface and cobalt interaction language.
- Mobile: compact workbench — detached top command pill plus the existing bottom game navigation.

## Theme

- `--color-paper`: dark navy, `oklch(16% 0.028 258)`
- `--color-paper-2`: raised navy, `oklch(19% 0.032 258)`
- `--color-ink`: cool white, `oklch(94% 0.012 245)`
- `--color-rule`: blue-tinted divider, `oklch(33% 0.035 255)`
- `--color-accent`: cobalt action signal, `oklch(62% 0.18 255)`
- `--color-focus`: cyan keyboard focus, `oklch(78% 0.17 225)`

## Typography

- Display: Sora, 700, roman
- Body: Plus Jakarta Sans, 500–900
- Outlier: Fredoka only for existing game-brand moments

## Spacing and motion

Use the 4-point tokens in `tokens.css`. Motion is transform/opacity only, with concise `--dur-micro` and `--dur-short` transitions. Respect reduced motion with an immediate visual result.

## CTA voice

Primary actions are cobalt fills with cool-white copy. Secondary actions are navy surfaces with blue-tinted rules. Every interactive control exposes hover, active, focus-visible, and disabled states.

## Shared rules

- The accent is reserved for decisive actions, selected states, live information, and focus.
- Existing gameplay copy, assets, and numeric values remain intact.
- Game stages are the visual centre; utility cards stay quiet.
- Do not introduce green as the primary interface signal.

## Exports

The portable CSS source of truth is [tokens.css](tokens.css). This project is vanilla HTML/CSS, so no framework export is needed.
