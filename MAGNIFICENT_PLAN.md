# IronTrack — "Magnificent" Overhaul Plan

_Working doc. Status boxes updated as work lands. If session stops mid-way, resume from first unchecked item._

## Design direction — "Volt on Obsidian"

The app already has good bones: OLED-black iOS foundation, Space Grotesk / Manrope / Heebo
type stack, a real component system (`src/components/ios.tsx`), full RTL + 6 locales.
What it lacked was a *signature* — stock-iOS green, flat gray cards floating on black,
no depth, no celebration moments.

Direction:

1. **Color with a voice.** Accent trio retuned to an athletic palette: **Volt**
   (electric lime, black-on-volt CTAs), **Iris** (violet), **Ember** (orange).
   Each accent carries a `glow` token; dark/light variants are contrast-correct.
2. **Depth on black.** True-black stays (OLED). Cards are lifted plates: top-light
   hairline border (`cardBorder` token), raised surface, radius 20. Hero card gets an
   accent-gradient wash (`Card hero`).
3. **Numbers are the product.** Timers, volume, stats use tabular-nums display
   treatment; `AnimatedNumber` count-ups on the summary screen.
4. **Motion as reward.** Set-completion spring pop with glow, pulsing live-workout dot,
   post-workout celebration screen, primary-button glow shadows.

## What deliberately did NOT change

- **Data schema & AsyncStorage keys** — untouched; storage stays kilograms.
- **Navigation topology** — 4 tabs + full-screen modals (right for the app).
- **Native module set** — zero new native deps; no dev-client rebuild needed
  (this ruled out expo-blur — glass surfaces remain rgba fills).
- **HealthKit flow** — untouched.
- **Zustand store architecture** — only additive actions (`rateSession`).
- **LargeTitle / SectionHeader metrics** — already right; left alone (B5 dropped).
- **ProgressRing** — existing animation is good; glow-at-100% experiment skipped as
  not worth the risk/benefit (B4 dropped).
- **Plate calculator greedy loading** — kept greedy fill (25+15 for 40/side), same as
  original behavior; now unit-aware.

---

## Phase A — Design foundation (theme layer)

- [x] A1. Accent palettes retuned in `src/theme/colors.ts` (volt/iris/ember, dark+light),
      per-accent `onPrimary`, `glow` token.
- [x] A2. Dark surface lift: `#161618` cards + `cardBorder` top-light hairline;
      light-mode equivalents; refreshed secondary/tertiary/error ramps.
- [x] A3. Tokens: `type.display/displayXL`, `numeric` (tabular-nums), `spring` configs.

## Phase B — Component system polish (`src/components/ios.tsx`)

- [x] B1. `Card`: hairline border, radius 20, `hero` accent-gradient variant.
- [x] B2. `StatTile`: tabular-nums display value, icon chip, border.
- [x] B3. `PillButton`: primary variant gets accent glow shadow.
- [x] B4. `ProgressRing` — deliberately unchanged (see "did NOT change").
- [x] B5. `SectionHeader`/`LargeTitle` — deliberately unchanged.
- [x] B6. Tab bar: active dot indicator; now-training bar gains pulsing dot + live
      mm:ss elapsed ticker.
- [x] B7. `AnimatedNumber` count-up component (RAF-driven, cross-platform).

## Phase C — Screen polish

- [x] C1. **Today**: hero goal/streak card with gradient wash; suggestions and recent
      rows unit-aware; recent rows navigate to session detail.
- [x] C2. **Active Workout**: display-size tabular timer, set-completion spring pop +
      glow, unit-aware header/suggestions/PR badge, plate-scaled calculator rows.
- [x] C3. **Train**: inherits card/border/glow system (no bespoke changes needed).
- [x] C4. **Insights**: chart gets vertical gradient area fill; tiles unit-aware;
      records rows unit-aware; rows navigate to session detail.
- [x] C5. **Profile**: accent swatches now read from the real theme palette;
      body-weight tile/log/input unit-aware.
- [x] C6. Pickers/editors: TemplateEditor weight steppers unit-aware; picker inherits
      component upgrades.

## Phase D — Functional gaps

- [x] D1. **Post-workout summary** (`app/workout-summary.tsx`): trophy hero, count-up
      duration/volume/sets, avg RPE, new-PR list, unlocked achievements, 1–5 star
      rating (`rateSession` store action). Finish now routes here.
- [x] D2. **Session detail** (`app/session-detail.tsx`): header stats + editable
      rating, per-set breakdown with PR/warmup/RPE markers, explicit Repeat + Delete.
      Tapping history/recent rows no longer instantly starts a workout.
- [x] D3. **Units work**: `src/utils/units.ts` — kg↔lb, display/input boundary
      conversion, 5lb steps, 45lb-bar + lb plate set for the calculator. Storage
      stays kg everywhere.
- [x] D4. i18n: 3 new keys (`new_prs`, `weight_label`, `session_detail`) added to all
      six locales.

## Phase E — Verification

- [x] E1. vitest (dev-only dep) + 26 unit tests, all passing: 1RM, PR detection,
      progression, streaks, unit conversions, plate math, timezone regression.
- [x] E2. Visual pass in browser (expo web, 375×812): Today, Active Workout (full
      set flow), Summary, Session Detail, Insights, Profile, Train — dark + light,
      metric + imperial, RTL (Hebrew). Imperial verified end-to-end
      (480 kg → 1.06K lb, 60 kg → 132.3 lb).
- [x] E3. `npx tsc --noEmit` clean.

## Bugs found & fixed along the way

- **Timezone bug (pre-existing):** session dates and the insights chart keyed days by
  `toISOString()` (UTC), so anywhere east of Greenwich today's volume never appeared
  in the chart, and late-night sessions got the wrong date. Added `localISODate()`;
  used in `finishWorkout`, `addBodyWeight`, `sessionsPerDay`. Regression test added.
- **Navigation during render:** the "missing data → router.back()" pattern in
  session-detail/summary/TemplateEditor fired setState during render (React error) and
  spammed GO_BACK. Moved to `useEffect`, with `canGoBack()` fallback to tabs.
- **Minutes concatenation:** `45min`-style joins read badly in Hebrew ("3דקות");
  spaced throughout.

## Notes

- Locale files already contained unused summary-screen keys — D1 reuses them.
- Browser-pane screenshots show entering animations "frozen"; that's rAF throttling in
  the automated browser, not an app bug (interactions unfreeze them; devices fine).
