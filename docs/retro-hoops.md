# Retro Hoops web release

Retro Hoops is a separate full-court 3v3 basketball game at `/play/retro-hoops`. The existing authenticated launcher owns entry and return routing. It needs no deck and awards no currency or XP. Two fictional teams play one three-minute period; draws are allowed. Settings and the latest 20 results use the isolated `statoz.retro-hoops.v1` namespace.

## Runtime

Rules 1.2.0 run in seeded pure TypeScript at 60 Hz. Three.js presents a 480 by 360 court viewport. React owns the HUD and simultaneous pointer controls. Keyboard controls are arrows/WASD, J shoot/block and K pass/steal. Editable controls retain native keyboard operation. Near-rim attempts use contextual dunk contact and physical landing. Numerical tuning, AI, probabilities and animation holds are original adaptations.

The game supports lazy asset loading, abort/retry, resize, explicit pause/resume, background input clearing and disposal. Completed results are emitted once and immediate rematch starts a fresh match. No durable mid-match save is implemented.

## Art and audio provenance

`public/games/retro-hoops/credits.json` records reference-art provenance and the 75 PNG hashes. Athlete and basket rasters remain source-derived reference material; no additional source clearance or endorsement is asserted. Authored sparse-pose clips are not a recovered complete native animation pack.

Audio is original procedural synthesis from `audio.ts`: authored oscillator/envelope cues and an original note sequence, with no third-party recordings, downloaded samples or commercial-game audio. `audio-provenance.json` records this selection. The owner provisionally approved audio; acoustic listening has not been performed. Music and SFX have independent volume/mute controls, a combined eight-voice cap and pause/background handling.

## Verification

Run `npm run test:retro-hoops`, `npm run test:retro-circuit`, `npm run lint`, `npx next typegen`, `npx tsc --noEmit` and `npm run build:pages`. The Retro Hoops suite includes six seeded complete matches, scoring/possession/buzzer rules, contact transitions, storage isolation, catalog routing, animation ownership and portable message validation.

Separate browser evidence in the Designer workspace covers loading failures, host rerenders, volume/mute/pause, touch cancellation, results/rematch, both attack directions, Canvas/Three same-state comparison and decoded native-size action loops. Browser emulation and SwiftShader measurements do not establish physical-phone performance. Historical rejected Canvas versions are preserved and are not superseded as approved labs by the production code review.

A same-source portable browser package and host contract are prepared for a later Flutter WebView. Actual Flutter integration remains separate.
