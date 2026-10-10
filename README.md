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

Public exhibit: https://dvijbarot.github.io/Drivetrain-Kona/

For a new repository, enable Pages in **Settings → Pages**. **GitHub Actions** is the recommended publishing source, so GitHub serves the built application rather than also running a separate branch/Jekyll build. Once Pages is enabled, push to `main` or rerun the **Deploy GitHub Pages** workflow.

The public GitHub Pages copy deploys automatically when `main` changes. The workflow installs the locked dependencies, runs the mechanics and asset tests, builds with the repository's URL prefix, and publishes `dist/` through GitHub's official Pages actions. Models, the local Draco decoder, environment maps, fonts and source documents all respect that prefix.

For a local project-path build:

```sh
npm run build -- --base=/Drivetrain-Kona/
npm run preview -- --port 4173 --base=/Drivetrain-Kona/
```

Open http://localhost:4173/Drivetrain-Kona/. The GitHub Pages site is publicly readable and requires no ChatGPT login. Original private-hosting identifiers and credentials are excluded from this repository.

## Explore

The mechanical scene fills the main page width. **Chapters / Components** and **Inspect** open overlay drawers, so explanatory panels do not permanently squeeze the 3D view. **Focus view** expands the scene across the viewport; **Exit focus** or Escape returns to the normal controls. Lessons use a compact narration dock with **Read full explanation** for more space. The default view shows the drivetrain; the real exterior remains available through **Exterior**.

- **Learn:** 30 chapters, three explanatory stages per chapter, Previous / Next / Replay and browser-local completion tracking.
- **Explore:** focused assemblies, opaque / transparent / cutaway / exploded views, selected-part explanations at three depths, isolate, hide / show, camera reset and angle presets.
- **Simulator:** throttle, brake, P/R/N/D, speed, Normal/Sport/Snow, road grip, steering, manual virtual steps, automatic or custom ratio, optional requested RPM and optional speed evolution. A live RPM guide responds to the selected speed, load, range, mode and grip, then explains an illustrative suitable band and midpoint.
- **Power flow:** connected torque path, playback speeds down to 0.05×, timeline and individual frame steps.
- **Compare:** fixed automatic gearsets, continuously variable pulleys and software-controlled IVT steps.
- **Settings:** graphics quality, labels, torque paths, numeric readouts, selection dimming and optional recorded engine sound.

Mouse: drag to orbit, scroll to zoom, right-drag to pan. Touch: one-finger orbit, pinch zoom, two-finger pan. Space pauses/resumes; Escape closes dialogs and isolation. Mobile has separate Chapters/Components and Inspect drawers.

Numerical readouts are illustrative. The core ratio and wheel-speed relationships are constrained; proprietary calibration and full tire / vehicle dynamics are not reproduced. Refer to SOURCES.md for the complete assumption register.

## Vehicle and detailed assemblies

The exterior is an orbitable 3D SX2 teaching shell in **Ecotronic Grey (PE2)**. Use **3D exterior**, **X-ray shell**, and **Drivetrain** to move continuously from the body surface to the installed mechanical system. The shell, hood, glass and interior remain interactive while the camera can orbit, zoom and pan through a full 360 degrees.

Use **Drivetrain / X-ray shell / 3D exterior**, **Chassis**, **Floor pan** and **Open hood** to control the vehicle context. Camera presets include **Wheel detail**, **Underside** and **Engine bay**. Choosing Full drivetrain or 3D exterior reliably restores the complete vehicle, its perspective camera and exterior view.

The body, chassis and component castings are original educational reconstructions based on public documentation. They are not scanned or manufacturer CAD. The close-up component lessons use enlarged models so internal motion remains readable.

To regenerate the source meshes (optional; Blender 4.3+ required):

```sh
npm run assets:generate
npm run assets:compress
```

You can rebuild one family with `blender -b --python scripts/build_models.py -- body` (or `engine`, `wheel`, `chassis`, `ivt`), followed by compression. Compression uses glTF Transform CLI 4.5.1; it downloads a build tool on first use. All runtime models and the Draco decoder are local. High graphics adds screen-space ambient occlusion and 2K studio environment lighting. Low uses reduced meshes and baked contact shading without screen-space effects. Paused scenes render on demand; camera and assembly transitions continue smoothly.

## Code organization

- src/mechanics.ts — pure state calculation, speed integration, constant-length pulley/chain geometry.
- src/Assets.tsx — GLB assemblies, physically based materials, chassis and mesh LOD selection.
- src/PhotoExterior.tsx — retained legacy photo-reference component; it is not mounted by the current 3D-shell experience.
- scripts/build_models.py — editable original Blender modeling recipe and baked contact occlusion.
- scripts/compress_models.mjs — local Draco compression, decoder installation and asset manifest.
- public/models — original GLB body, chassis, engine, IVT casting and wheel/brake assets in two LODs.
- src/Scene.tsx — original parameterized parts, instanced links / particles, precise angular relationships, axial explosion and camera transitions.
- src/content.ts — component descriptions, 30 lessons, scenario inputs and source links.
- src/App.tsx — learning state, simulator, inspector drawers, focus mode, accessibility controls and comparison.
- src/engineAudio.ts — on-demand recorded audio, RPM band mixing, smoothed playback and lifecycle cleanup.
- public/audio — licensed engine-loop WAVs, measurement manifest and source attribution.
- src/styles.css — desktop exhibit and touch layouts.
- tests/mechanics.test.ts — mechanical invariants and lesson validation.
- tests/assets.test.ts — GLB assembly contracts, meter-scale tire geometry, shading attributes and actual LOD reduction.
- tests/browser_smoke.py — browser interaction and viewport checks using installed Chromium / Playwright.
- tests/vehicle_views.py — installed-vehicle controls, high-quality camera views and visual-review captures.
- tests/shell_guidance.py — 3D body loading, orbit input, X-ray mode, exterior restoration and live RPM-guidance checks.
- tests/presentation_audio.py — dominant canvas sizing, drawer access, text contrast, focus mode and recorded-audio playback/pause/mute.

Optional audio uses licensed real Hyundai Kona recordings at idle, 2,000 and 3,000 RPM by KVV Audio, with smooth playback blending. Sound stays muted until enabled, fades on pause/mute and is silent in background tabs. The recorded vehicle year and engine variant are unverified. See `public/audio/README.md` for sources, CC BY 4.0 credit and adaptation details.

React + Vite + TypeScript + Three.js + React Three Fiber + Drei + GSAP. No commercial CAD or Hyundai artwork is redistributed. Assets and open-source notices are recorded in ATTRIBUTION.md.

## Verification

Production TypeScript / Vite build; pure mechanics tests; Chromium interaction checks at desktop, iPad and phone viewports. Software WebGL is used in automated checks. Device-specific mobile GPU performance and actual Safari behavior require testing on those devices.

The visual revision passed 13 mechanics and asset-integrity tests and the complete 30-chapter browser suite at 1440×1000, 834×1112 and 390×844. To reproduce the focused vehicle captures, run `KONA_TEST_URL=http://127.0.0.1:4173/ python tests/vehicle_views.py` against the production preview. Captures and result files go to `/tmp/kona-qa`.

The canvas and audio checks cover full-width framing, desktop and touch drawers, focus view, text contrast, actual decoded recording output, RPM response, and silence on pause/mute. Run `KONA_TEST_URL=http://127.0.0.1:4175/Drivetrain-Kona/ python tests/presentation_audio.py` against a project-path production preview. The standard 1920×1080 scene occupies 67% of the viewport height; focus view occupies 88%.

## Privacy

No analytics, accounts, external runtime model loaders or server backend. Font, HDR, body shell and drivetrain models load locally. The current public experience does not request manufacturer exterior imagery. Lesson progress is stored only in localStorage in the browser.
