# Design system

Refined, editorial, warm. Like an independent food magazine. Photography carries the colour; the interface stays quiet.

## Colours: Cognac & Cream (Tailwind theme)
Warm and professional, like a good hotel restaurant. Updated after the first build: the original olive/ivory felt too muted.

| Token | Hex | Use |
|---|---|---|
| ivory | #F7F2EA | app background (warm cream) |
| paper | #FFFDF9 | cards, sheets, inputs |
| ink | #2A2420 | text, primary buttons (warm charcoal) |
| ink-muted | #6B6158 | secondary text |
| line | #E6DDD0 | borders |
| line-strong | #D8CCBB | pill borders |
| sand | #EFE7DB | segmented control track |
| brand | #A0522D | cognac: Tonight, checks, links, main actions |
| brand-tint | #F4E6DC | cognac backgrounds |
| warm | #8B2E3B | wine: favourites, warnings |
| warm-tint | #F6E7E6 | honesty notes, warnings |
| gold | #B8862B | rating stars |
| quote | #3A2F28 | his notes |
| been | #3F6B4E | bottle green: been there |
| wishlist | #8A6116 | ochre: wishlist |
| stone | #A79C90 | quiet text, not recommended pins |

Card colour blocks (until photos): clay #B5734F, ochre #C29A5B, sage #8A9A7B, slate #6E8094, wine #8B4A4F, bronze #9C7A54, forest #5E7563, rosewood #C08B7A.

## Type
- Display and titles: Newsreader (Google Fonts), regular 400, italic for notes and quotes. Sizes 20, 22, 24, 34, 36.
- Interface: Inter 400/500/600. Body 16, labels 13 to 15, never below 12.

## Shape and spacing
- 4px base. Screen margin 20px mobile, 36px desktop.
- Radius: inputs 12, cards 16 to 18, sheets 24 (top), buttons and pills fully rounded.
- Tap targets at least 44px; primary buttons 48 to 52px tall.

## Components
- Primary button: ink background, paper text, pill. Secondary: transparent, 1px ink border.
- Filter pill: 44px, paper with line-strong border; active = brand (cognac) with paper text; chevron. Black is not used for active states.
- Bottom sheet: paper, radius 24 top, grab handle, title in Newsreader 26, close button.
- Choice row (in sheets): 58px min, label 17px, hint 13px muted, count, round check (olive when on).
- Restaurant card: paper, 1px line border, 96px colour or photo block, status badge (dot + label), name Newsreader 23, note Newsreader italic 18, area 14 muted.
- Status colours: been bottle green, wishlist ochre, favourite wine, not recommended stone.

## Motion
Buttons scale to .96 and fade to .8 on press (120ms). Sheets rise 240ms ease out. Heart fills with a short pop. Respect prefers-reduced-motion.

## Icons
Thin line icons (1.5 to 1.8 stroke), e.g. lucide-react. No emoji.
