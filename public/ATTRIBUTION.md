# Asset and software attribution

The drivetrain meshes, diagrams, educational text, layout and synthesized sound are original project work. They are representative teaching geometry, not OEM CAD. Hyundai / Kona / HTRAC / IVT names identify the vehicle and technology; no affiliation is asserted.

## Reused assets

- **Hyundai 2026 Kona exterior image sequence** — Hyundai Motor America, [2026 Kona SEL Sport](https://www.hyundaiusa.com/us/en/vehicles/2026-kona/sel-sport). Manufacturer-hosted `2026-kona-ice-sel-sport-fwd-ecotronic-gray-001` through `-036` on `s7d1.scene7.com`. Personal builds request these images directly from Hyundai; no OEM image binaries are copied into this repository, archives or public deployment. Copyright remains with Hyundai. This is **not** a Creative Commons or open-source asset. [Hyundai USA terms](https://www.hyundaiusa.com/us/en/terms-conditions) allow a personal, noncommercial home-use copy and restrict redistribution/public use. [Hyundai Canada legal](https://www.hyundaicanada.com/en/about/legal) likewise distinguishes personal use from republication. Owning the car does not transfer image copyright. Public builds disable these requests with `VITE_PUBLIC_BUILD=true`.
- **Hyundai Kona (SX2) 1X7A1646** — Alexander-93, 26 December 2023, [original photograph and metadata](https://commons.wikimedia.org/wiki/File:Hyundai_Kona_(SX2)_1X7A1646.jpg), **[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)**. The unmodified photograph is included in `public/photos/kona-sx2-reference.jpg` as the public-build exterior and personal-build network fallback. Credit and license links appear directly in the exhibit. The photograph remains under CC BY-SA 4.0; this notice does not claim the rest of the original application is a derivative photograph. Its regional trim and paint code are not verified against the user's 2026 Canadian vehicle.
- **User-selected vehicle photographs** — viewed using browser-local object URLs, never uploaded, stored in the repository or included in the deployment. The user retains their rights. A photo survives assembly navigation while the scene is mounted, but is cleared by a page reload.
- **Studio Small 09 HDRI** — Poly Haven, downloaded from https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/studio_small_09_2k.hdr. Asset page: https://polyhaven.com/a/studio_small_09. License: **CC0 1.0**; https://polyhaven.com/license. Used as local 2K environment lighting in public/studio.hdr, with a 1K variant in public/studio-low.hdr for low graphics. No attribution is legally required under CC0; credit retained here.
- **Inter variable font** — Rasmus Andersson and Inter contributors. Source: https://github.com/rsms/inter. License: **SIL Open Font License 1.1**. Unmodified font in public/InterVariable.woff2; full license in public/INTER-LICENSE.txt.

## Open-source software

React / React DOM, Vite, TypeScript, Three.js, React Three Fiber, Drei, Lucide React and transitive packages are installed through npm. Their required license notices are retained in public/THIRD_PARTY_NOTICES.txt and their original packages in node_modules. Exact dependency versions are pinned in package-lock.json.

- React / React DOM — Meta and contributors; MIT.
- Three.js — Three.js contributors; MIT.
- React Three Fiber / Drei — pmndrs contributors; MIT.
- Vite — Vite contributors; MIT.
- TypeScript — Microsoft; Apache 2.0.
- Lucide — Lucide contributors; ISC.
- GSAP — GreenSock / Webflow; standard GSAP license, rather than a claim of MIT. License text copied from the installed distribution into THIRD_PARTY_NOTICES.txt. GSAP's current distribution supports free use, with license-specific conditions; refer to the retained text.

Manufacturer documentation is linked and paraphrased. No diagrams, service manuals, protected technical drawings or full manufacturer text are bundled.

## Detailed model revision

- All five GLB assembly families and both mesh LODs are original project geometry generated with Blender 4.3.2. Editable generation and compression scripts are included. No third-party car or engine CAD was copied. Geometry follows reference proportions and diagrams without claiming to be Hyundai service CAD.
- Draco decoder JavaScript and WebAssembly are bundled from the Three.js distribution in `public/draco`. Draco is Copyright Google, Apache License 2.0; license in `public/draco/LICENSE.txt`.
- Postprocessing / React Three Postprocessing — pmndrs and contributors, MIT. N8AO — N8Programs and contributors, MIT. Notices retained with the npm dependency licenses.
- Blender was used as a build tool (GNU GPL); the original generated mesh outputs do not incorporate Blender program code.
- glTF Transform CLI 4.5.1 — Don McCurdy and contributors, MIT. Used only during optional model compression. Draco output is decoded locally; no CDN or external model hosting is required at runtime.
