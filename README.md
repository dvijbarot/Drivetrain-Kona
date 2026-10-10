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
npm run build -- --base=/Drivetrain-Kona/
npm run preview -- --port 4173 --base=/Drivetrain-Kona/
```

Open http://localhost:4173/Drivetrain-Kona/. The GitHub Pages site is publicly readable and requires no ChatGPT login. Original private-hosting identifiers and credentials are excluded from this repository.

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

The exterior now uses real imagery in place of the reconstructed body shell. Personal builds use Hyundai's transparent, 36-frame **2026 Ecotronic Grey (PE2)** exterior sequence. Drag, swipe, use arrow keys or select an exterior angle. The manufacturer imagery shows a US SEL Sport; Canadian Preferred AWD Trend wheels and equipment differ and the exhibit labels that scope.

Use **Drivetrain / X-ray / Exterior**, **Chassis**, **Floor pan** and **Reveal engine bay** to control the vehicle context. X-ray registers the side photograph to visible wheel centres and reveals the 3D internals; packaging remains representative. This fixed side presentation avoids stretching a still photograph around a freely orbiting model. **Drivetrain** restores unrestricted mechanical rotation, zoom and pan. Camera presets include **Wheel detail**, **Underside** and **Engine bay**. Exterior component buttons open their detailed 3D assemblies.

**My car** accepts a JPEG, PNG or WebP photo of your own vehicle. It stays in the browser and is never uploaded. Public distribution must build with `VITE_PUBLIC_BUILD=true`: that disables Hyundai image requests and uses the included CC BY-SA SX2 reference photo, whose paint code is unverified. OEM reference image binaries are not bundled. See ATTRIBUTION.md for the different asset rights.

The chassis and component castings are original educational reconstructions based on public documentation. They are not scanned or manufacturer CAD. The close-up component lessons use enlarged models so internal motion remains readable. The old procedural body assets are retained only as editable legacy source; the app does not render them.

To regenerate the source meshes (optional; Blender 4.3+ required):

```sh
npm run assets:generate
npm run assets:compress
```

You can rebuild one family with `blender -b --python scripts/build_models.py -- body` (or `engine`, `wheel`, `chassis`, `ivt`), followed by compression. Compression uses glTF Transform CLI 4.5.1; it downloads a build tool on first use. All runtime models and the Draco decoder are local. High graphics adds screen-space ambient occlusion and 2K studio environment lighting. Low uses reduced meshes and baked contact shading without screen-space effects. Paused scenes render on demand; camera and assembly transitions continue smoothly.

## Code organization

- src/mechanics.ts — pure state calculation, speed integration, constant-length pulley/chain geometry.
- src/Assets.tsx — GLB assemblies, physically based materials, chassis and mesh LOD selection.
- src/PhotoExterior.tsx — manufacturer exterior spin, licensed fallback, local personal photos and exterior controls.
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
- tests/photo_exterior.py — real exterior navigation, cutaway registration, local-photo privacy, responsive layouts and public-build image restrictions.

React + Vite + TypeScript + Three.js + React Three Fiber + Drei + GSAP. No commercial CAD or Hyundai artwork is redistributed. Assets and open-source notices are recorded in ATTRIBUTION.md.

## Verification

Production TypeScript / Vite build; pure mechanics tests; Chromium interaction checks at desktop, iPad and phone viewports. Software WebGL is used in automated checks. Device-specific mobile GPU performance and actual Safari behavior require testing on those devices.

The visual revision passed 13 mechanics and asset-integrity tests and the complete 30-chapter browser suite at 1440×1000, 834×1112 and 390×844. To reproduce the focused vehicle captures, run `KONA_TEST_URL=http://127.0.0.1:4173/ python tests/vehicle_views.py` against the production preview. Captures and result files go to `/tmp/kona-qa`.

## Privacy

No analytics, accounts, external runtime model loaders or server backend. Font, HDR, licensed fallback photo and models load locally. Personal builds request manufacturer exterior reference images directly from Hyundai's image CDN; public builds disable these requests. Selected personal photos use browser-local object URLs and are never uploaded. Lesson progress is stored only in localStorage in the browser.
