# Lugar Nenhum design

## Source
Pencil document lugarnenhum.pen. Desktop frames: PAGINA INICIAL, OUÇA NOSSA MUSICA, NOSSA LOJA, QUEM SOMOS. Use the corresponding CELULAR frames for home and about mobile compositions.

## Visual identity
Full-viewport band photography, white transparent ASCII wordmark, illustrated symbol, Consolas navigation and body text, Roboto Mono ASCII overlay. Electric blue announcement strip across desktop pages. Preserve the source palette.

## Layout
Desktop home: logo at x29/y81 on a 1920x1080 canvas, symbol below at x29/y248, three navigation links on the right at x1705/y291. Photo and ASCII overlay fill the screen. Mobile: wordmark and symbol side by side near the top, portrait photo, three links along the bottom over a dark fade.

Desktop about: hill photograph, centered wordmark, two narrow biography columns at left and right. Mobile: spherical hill photograph above a pale-blue biography area. Text remains Lorem ipsum by explicit owner decision.

## Visual effects

Desktop home uses one shared photographic scene with `cover` scaling. ASCII coordinates are calibrated in the original 1920 × 1280 image: x=-42, y=26 (the Pencil 1920 × 1080 crop removed 100 px from the top), 24 px font, 14.52 px column advance and 25.92 px row advance. Apply the same centered cover projection to the image and characters at every desktop viewport; do not position the overlay independently with vh/vw.

Hover replaces each nearby character once with a stable alternative and applies a mild radial expansion in a 45 CSS-pixel radius. Crossfade with a small vertical shift over 180 ms on entry and exit; restore the original character after leaving the radius. Cache the resting canvas, animate only while transitions/lens movement settle (not while a stationary mouse is hovering), and stop when the document is hidden. SVG preserves the base composition without JavaScript. Reduced motion retains static ASCII.

The blue announcement scrolls continuously right-to-left with duplicate, accessibility-hidden visual segments for a seamless loop. Provide a persistent pause control and pause on hover/focus. Reduced motion shows a single static copy. Keep the approved mobile portrait without ASCII or an announcement banner.

## Provisional screens
Music: interactive silver CD carousel over a dark checkerboard inspired by the reference, not unrelated artists' artwork. The owner requested a continuous horizontal track: previous disc left, selected disc centered, next disc right. The discs sit close enough to partially overlap; the selected disc always paints above both neighbours. Translate the entire track together and smoothly scale the focused disc over 650 ms; loop seamlessly using identical offscreen copies. Reserve separate vertical space for the arrow controls and isolate/clip the disc stage so discs and focus rings cannot cover them. Keep touch swipes, keyboard arrows, horizontal wheel scrolling and reduced-motion navigation. Shop: simple coming-soon screen. No fake playback or checkout.

## Implementation
Use shared design tokens, responsive imagery, semantic page headings, and a reusable site shell. Respect reduced motion and retain usable keyboard focus. Navigation uses real routes. The owner approved dark-blue mobile biography text and reinforced desktop contrast for legibility; preserve the original photo/layout.
