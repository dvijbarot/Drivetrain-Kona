# Kona Drivetrain Lab

A browser-based educational exhibit for the Canadian 2026 Hyundai Kona Preferred AWD Trend: 2.0L naturally aspirated engine, torque converter, Hyundai chain-belt IVT and HTRAC AWD.

## Run

Requires Node.js 22+.

```sh
npm ci
npm run dev
```

Open the printed local URL (normally http://localhost:5173). In a remote workspace, use its port preview/forwarding for port 5173. Nothing in this project uploads learning progress or publishes a site automatically.

```sh
npm test
npm run build
npm run preview
```

The production bundle is in dist/. It can be served with any private static web server.

## GitHub Pages

The public GitHub Pages copy deploys automatically when `main` changes. The workflow installs the locked dependencies, runs the mechanics and asset tests, builds with the repository's URL prefix, and publishes `dist/` through GitHub's official Pages actions. Models, the local Draco decoder, environment maps, fonts and source documents all respect that prefix.

For a local project-path build:

```sh
npm run build -- --base=/kona-drivetrain-lab/
npm run preview -- --port 4173
```

Open http://localhost:4173/kona-drivetrain-lab/. The GitHub Pages site is publicly readable and requires no ChatGPT login. Original private-hosting identifiers and credentials are excluded from this repository.

## Explore

- **Learn:** 30 chapters, three explanatory stages per chapter, Previous / Next / Replay and browser-local completion tracking.
- **Explore:** focused assemblies, opaque / transparent / cutaway / exploded views, selected-part explanations at three depths, isolate, hide / show, camera reset and angle presets.
- **Simulator:** throttle, brake, P/R/N/D, speed, Normal/Sport/Snow, road grip, steering, manual virtual steps, automatic or custom ratio, optional requested RPM and optional speed evolution.
- **Power flow:** connected torque path, playback speeds down to 0.05×, timeline and individual frame steps.
- **Compare:** fixed automatic gearsets, continuously variable pulleys and software-controlled IVT steps.
- **Settings:** graphics quality, labels, torque paths, numeric readouts, selection dimming and optional synthesized engine sound.

Mouse: drag to orbit, scroll to zoom, right-drag to pan. Touch: one-finger orbit, pinch zoom, two-finger pan. Space pauses/resumes; Escape closes dialogs and isolation. Mobile has separate Chapters/Components and Inspect drawers.

Numerical readouts are illustrative. The core ratio and wheel-speed relationships are constrained; proprietary calibration and full tire / vehicle dynamics are not reproduced. Refer to SOURCES.md for the complete assumption register.

## Vehicle and detailed assemblies

The full-drivetrain and HTRAC views install the powertrain inside a reference-based SX2 body and chassis. Use **Drivetrain / X-ray / Bodywork**, **Chassis**, **Floor pan** and **Open hood** to control the vehicle context. Camera presets include **Wheel detail**, **Underside** and **Engine bay**. Detailed rotating wheel and brake-rotor geometry is separate from fixed calipers and suspension.

The body and component castings are original educational reconstructions based on public documentation. They are not scanned or manufacturer CAD. The close-up component lessons use enlarged models so internal motion remains readable.

To regenerate the source meshes (optional; Blender 4.3+ required):

```sh
npm run assets:generate
npm run assets:compress
```

You can rebuild one family with `blender -b --python scripts/build_models.py -- body` (or `engine`, `wheel`, `chassis`, `ivt`), followed by compression. Compression uses glTF Transform CLI 4.5.1; it downloads a build tool on first use. All runtime models and the Draco decoder are local. High graphics adds screen-space ambient occlusion and 2K studio environment lighting. Low uses reduced meshes and baked contact shading without screen-space effects. Paused scenes render on demand; camera and assembly transitions continue smoothly.

## Code organization

- src/mechanics.ts — pure state calculation, speed integration, constant-length pulley/chain geometry.
- src/Assets.tsx — GLB assemblies, physically based materials, body panels, chassis and mesh LOD selection.
- scripts/build_models.py — editable original Blender modeling recipe and baked contact occlusion.
- scripts/compress_models.mjs — local Draco compression, decoder installation and asset manifest.
- public/models — original GLB body, chassis, engine, IVT casting and wheel/brake assets in two LODs.
- src/Scene.tsx — original parameterized parts, instanced links / particles, precise angular relationships, axial explosion and camera transitions.
- src/content.ts — component descriptions, 30 lessons, scenario inputs and source links.
- src/App.tsx — learning state, simulator, inspector, accessibility controls, audio and comparison.
- src/styles.css — desktop exhibit and touch layouts.
- tests/mechanics.test.ts — mechanical invariants and lesson validation.
- tests/assets.test.ts — GLB assembly contracts, meter-scale tire geometry, shading attributes and actual LOD reduction.
- tests/browser_smoke.py — browser interaction and viewport checks using installed Chromium / Playwright.
- tests/vehicle_views.py — installed-vehicle controls, high-quality camera views and visual-review captures.

React + Vite + TypeScript + Three.js + React Three Fiber + Drei + GSAP. No commercial CAD or Hyundai artwork is redistributed. Assets and open-source notices are recorded in ATTRIBUTION.md.

## Verification

Production TypeScript / Vite build; pure mechanics tests; Chromium interaction checks at desktop, iPad and phone viewports. Software WebGL is used in automated checks. Device-specific mobile GPU performance and actual Safari behavior require testing on those devices.

The visual revision passed 13 mechanics and asset-integrity tests and the complete 30-chapter browser suite at 1440×1000, 834×1112 and 390×844. To reproduce the focused vehicle captures, run `KONA_TEST_URL=http://127.0.0.1:4173/ python tests/vehicle_views.py` against the production preview. Captures and result files go to `/tmp/kona-qa`.

## Privacy

No analytics, accounts, external runtime model loaders or server backend. Source links open only when selected. Font, HDR and models load locally. Lesson progress is stored only in localStorage in the browser.
