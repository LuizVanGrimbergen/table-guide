# Design system

Refined, editorial, warm. Like an independent food magazine. Photography carries the colour; the interface stays quiet.

## Colours (Tailwind theme)
| Token | Hex | Use |
|---|---|---|
| ivory | #F6F1E8 | app background |
| paper | #FFFDF9 | cards, sheets, inputs |
| ink | #1E1B18 | text, primary buttons, active pills |
| muted | #574F46 | secondary text (passes 5:1 on ivory) |
| line | #E3DACB | borders |
| line-strong | #D9CFBF | pill borders |
| sand | #EDE6DA | segmented control track |
| olive | #4F5A2E | actions, Tonight, been there |
| olive-tint | #E9EADB | olive backgrounds |
| burgundy | #7B2D2B | favourites, ratings, stars |
| burgundy-tint | #F3E3DF | warnings, honesty notes |
| espresso | #3B2A20 | quotes |
| stone | #A69B8C | not recommended |

## Type
- Display and titles: Newsreader (Google Fonts), regular 400, italic for notes and quotes. Sizes 20, 22, 24, 34, 36.
- Interface: Inter 400/500/600. Body 16, labels 13 to 15, never below 12.

## Shape and spacing
- 4px base. Screen margin 20px mobile, 36px desktop.
- Radius: inputs 12, cards 16 to 18, sheets 24 (top), buttons and pills fully rounded.
- Tap targets at least 44px; primary buttons 48 to 52px tall.

## Components
- Primary button: ink background, paper text, pill. Secondary: transparent, 1px ink border.
- Filter pill: 44px, paper with line-strong border; active = ink with paper text; chevron.
- Bottom sheet: paper, radius 24 top, grab handle, title in Newsreader 26, close button.
- Choice row (in sheets): 58px min, label 17px, hint 13px muted, count, round check (olive when on).
- Restaurant card: paper, 1px line border, 96px colour or photo block, status badge (dot + label), name Newsreader 23, note Newsreader italic 18, area 14 muted.
- Status colours: been olive, wishlist #9A6A1E text or burgundy outline, favourite burgundy, not recommended #8A4B3A.

## Motion
Buttons scale to .96 and fade to .8 on press (120ms). Sheets rise 240ms ease out. Heart fills with a short pop. Respect prefers-reduced-motion.

## Icons
Thin line icons (1.5 to 1.8 stroke), e.g. lucide-react. No emoji.
