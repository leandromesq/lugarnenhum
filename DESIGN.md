# Lugar Nenhum design

## Source
Pencil document lugarnenhum.pen. Desktop frames: PAGINA INICIAL, OUÇA NOSSA MUSICA, NOSSA LOJA, QUEM SOMOS. Use the corresponding CELULAR frames for home and about mobile compositions.

## Visual identity
Full-viewport band photography, white transparent ASCII wordmark, illustrated symbol, Consolas navigation and body text, Roboto Mono ASCII overlay. Electric blue announcement strip across desktop pages. Preserve the source palette.

## Layout
Desktop home: logo at x29/y81 on a 1920x1080 canvas, symbol below at x29/y248, three navigation links on the right at x1705/y291. Photo and ASCII overlay fill the screen. Mobile: wordmark and symbol side by side near the top, portrait photo, three links along the bottom over a dark fade.

Desktop about: hill photograph, centered wordmark, two narrow biography columns at left and right. Mobile: spherical hill photograph fading into the updated blue biography gradient from Pencil node zOI6G in Bg3LB. In the 1080-wide design, the photo is 1620px tall and the overlay starts at y=1255 with height 665px: #b3cff300 at 0%, #abc6ee at 25.480768%, #7390d4 at 83.653843%. Text starts at y=1467. Scale those scene coordinates together; continue the final blue below the gradient when the readable biography needs more height. Keep white, 14px left-aligned mobile copy and no desktop biography shadow. Text remains Lorem ipsum by explicit owner decision.

## Visual effects

Desktop home uses one shared photographic scene with `cover` scaling. ASCII coordinates are calibrated in the original 1920 × 1280 image: x=-42, y=26 (the Pencil 1920 × 1080 crop removed 100 px from the top), 24 px font, 14.52 px column advance and 25.92 px row advance. Apply the same centered cover projection to the image and characters at every desktop viewport; do not position the overlay independently with vh/vw.

Hover applies a mild radial expansion in a 55 CSS-pixel radius. Near the center (60% of the radius), characters alternate between density-similar states at independent, varying 400–700ms intervals with 150ms crossfades. The outer region keeps a stable replacement; the fisheye does not pulse. Soften the outer 11px, enter over 100ms and return over 220ms with a small vertical shift. Animate the radial substitution amount itself so the return remains smooth after the pointer leaves the radius. Cache the resting canvas. Animate only while transitions/lens movement settle, sleep with a timer between character beats, and stop all frames/timers outside the interaction or when the document is hidden. SVG preserves the base composition without JavaScript. Reduced motion retains static ASCII.

The blue announcement scrolls continuously right-to-left with duplicate, accessibility-hidden visual segments for a seamless loop. Pause only while the pointer hovers over the banner. The owner requested removing the pause button; keyboard focus must not lock the ticker. Reduced motion shows a single static copy. Keep the approved mobile portrait without ASCII or an announcement banner.

## Provisional screens
Music: interactive silver CD carousel over a dark checkerboard inspired by the reference, not unrelated artists' artwork. The owner requested a continuous horizontal track: previous disc left, selected disc centered, next disc right. The discs sit close enough to partially overlap; the selected disc always paints above both neighbours. Translate the entire track together and smoothly scale the focused disc over 450 ms, retargeting rapid inputs instead of serialising every click; loop seamlessly using identical offscreen copies. Reserve separate vertical space for the arrow controls and isolate/clip the disc stage so discs and focus rings cannot cover them. Tilt side discs slightly with perspective, fade the stage edges, give neighbouring discs a small hover lift and fade the selected title/duration over 150ms. Provide a native expandable tracklist for direct song selection. Keep touch swipes (horizontal-dominant only), keyboard arrows, horizontal wheel scrolling and reduced-motion navigation. Shop: simple coming-soon screen. No fake playback or checkout.

## Implementation
Use shared design tokens, responsive imagery, semantic page headings, and a reusable site shell. Respect reduced motion and retain usable keyboard focus. Navigation uses real routes. The owner subsequently requested white mobile biography text with the updated Pencil gradient and removal of the desktop biography shadow. Use larger short mobile navigation labels (MÚSICA / LOJA / SOBRE), keep navigation available while scrolling, and include only the confirmed Instagram @lugarnenhum.wav and presskit as secondary links. The shop symbol has a neutral-ink variant that preserves the figures’ original colours. Preserve the original photo/layout.
