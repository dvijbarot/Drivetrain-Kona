# Kona Drivetrain Lab — sources and assumption register

Research date: 2026-10-10. Target: Canadian 2026 Hyundai Kona Preferred AWD with Trend Package, naturally aspirated 2.0L and IVT.

The site uses original Blender-authored GLB assemblies and parameterized Three.js internals. The October 10 visual revision reconstructs an installed SX2 vehicle layout, with a body shell, unibody, suspension and 18-inch wheels. It is not Hyundai service CAD, an OEM calibration, a repair procedure, or a full vehicle dynamics model.

## Evidence levels

- **Confirmed:** explicitly supported by manufacturer documentation at the scope stated.
- **Inferred / representative:** based on the documented Hyundai/Kia IVT family or front-based on-demand AWD, without exact Kona component geometry or part-number verification.
- **Simplified:** an intentionally reduced mechanism or schematic.
- **Illustrative:** numerical calibration or visual parameter chosen for teaching; never an OEM measurement.

## Primary sources

1. [Hyundai Auto Canada 2026 Kona product card](https://www.hyundaicanada.com/content/dam/hac/images/Showroom/2026/kona/Product_Card/2026%20KONA%20ICE%20Product%20Card%20English.pdf). Essential powertrain and optional HTRAC on page 2; Preferred inherits Essential on page 3; Preferred AWD with Trend Package on page 4. Confirms the target trim inherits the 2.0L / IVT, traditional shift-by-cable selector and AWD powertrain. The old media-library URL is a 404; the linked current document was opened successfully.
2. [Hyundai Canada 2026 Kona](https://www.hyundaicanada.com/en/showroom/2026/kona). Model-year-specific page used to locate the product card. The default /showroom/kona page now describes 2027 and is not treated as 2026 evidence.
3. [Hyundai USA 2026 Kona specifications](https://www.hyundaiusa.com/us/en/vehicles/kona/compare-specs). 2.0L MPI-Atkinson inline-four; 147 hp at 6,200 rpm; 132 lb-ft at 4,500 rpm; DOHC 16-valve DCVVT; IVT and HTRAC available. These are manufacturer US powertrain specifications; exact regional calibration equivalence is inferred, not independently service-verified.
4. [2026 Kona SX2 IVT operation](https://ownersmanual.hyundai.com/full_webhelp/SX2/2026/en_US/idee8ba84aa3d.html). Range selector, manual gate, eight forward manual selections, automatic downshift at low speed and protective upshift near the red zone. This is the shift-lever variant, appropriate to the Canadian product card; the column-mounted 8AT is not substituted.
5. [2026 Kona SX2 IVT overview](https://ownersmanual.hyundai.com/full_webhelp/SX2/2026/en_US/id976e8e0e516.html). No actual fixed forward gears; ratio selection depends on selector, speed and accelerator demand.
6. [2026 Kona SX2 AWD drive modes](https://ownersmanual.hyundai.com/full_webhelp/SX2/2026/en_US/id_mnp_kmg_bxb.html). Normal, Sport, Snow. Sport may retain higher RPM after accelerator release and delay upshifts. The model-year table of contents was retrieved to verify the page association. This manual spans equipment variants; paddle-shifter instructions are not claimed for the target shift-lever IVT.
7. [2026 Kona SX2 AWD operation](https://ownersmanual.hyundai.com/full_webhelp/SX2/2026/en_US/id_ly3_gnl_4wb.html). Automatic distribution according to road and driving conditions. Describes optional AWD Lock, but that control is omitted because the target trim's exact lock-switch equipment has not been separately verified. No exact percentages are extracted.
8. [Hyundai Transys transmission technology](https://www.hyundai-transys.com/en/product/powertrain/transmission.do). IVT-family metal chain belt, high-efficiency vane pump, simulated automatic-transmission shift patterns and manual control modes.
9. [Hyundai Motor Group — World of Transmissions](https://www.hyundaimotorgroup.com/en/story/CONT0000000000001176). Hyundai IVT's CVT foundation, metal chain belt and virtual gear behavior. Manufacturer explanatory language is interpreted carefully: the metal loop does not physically stretch or contract to change ratio.
10. [Hyundai Transys IVT product reference](https://new.hyundai-transys.com/en/product/passenger-vehicle-powertrain/cvt.do). Search-index evidence describes a torque converter and chain-belt IVT. Page could not be fully retrieved by the research browser. It supports a representative family architecture, not an exact Kona converter type.
11. [Hyundai Transys axle / 4WD technology](https://www.hyundai-transys.com/en/product/powertrain/axle-4wd.do). Family-level axle, differential and transfer technology; no assertion that a particular supplier illustration is exact Kona hardware.

12. [Hyundai SX2 Kona product guide, hosted by Hyundai Dominican Republic](https://hyundai.com.do/wp-content/uploads/2023/08/SX2-Product-Guide-1.pdf). Manufacturer guide dated 2023 for the second-generation SX2 architecture. Pages 28 (MPI/IVT powertrain family), 37 (MacPherson front, multi-link rear for AWD and subframe illustrations), 38 (HTRAC underbody path and coupling), and 55 (2,660 mm wheelbase, 4,350 mm global ICE length, 1,825 mm width, 1,580 mm body height / 1,615 mm with rack). This is a global launch guide, not the 2026 Canadian shop manual. It supplies reference proportions and architecture; it does not verify exact Canadian body panels or suspension hardpoints.
13. [Hyundai’s official service-information portal](https://www.hyundaitechinfo.com/) and [subscription scope](https://www.hyundaitechinfo.com/external/files/HyundaiTechInfo_Service_Information_Subscriptions.pdf). The shop manual and electrical troubleshooting manual require a service subscription; the portal covers US vehicles. No account was available and no access restriction was bypassed. A complete publicly accessible 2026 Canadian SX2 workshop manual or OEM CAD was not located.
14. [2026 Kona engine and transaxle mounting catalog](https://www.hyundaipartsdeal.com/parts-list/2026-hyundai-kona/engine/engine_transaxle_mounting.html). Public OEM parts-catalog data reproduced by a parts reseller. Lists 2.0L NU PE / DOHC MPI / CVT 2WD and CVT 4WD fitment and engine/transmission mount parts. Useful corroboration, not a substitute for VIN-specific service information.
15. [2026 Kona cylinder block catalog](https://www.hyundaipartsdeal.com/parts-list/2026-hyundai-kona/engine/cylinder_block.html) and [crankshaft/piston catalog](https://www.hyundaipartsdeal.com/parts-list/2026-hyundai-kona/engine/crankshaft_piston.html). Public 2.0L NU PE / MPI / CVT entries support the component families and exploded relationships. The cast shapes in the project are original reconstructions, not copied service meshes.
16. [2026 Kona torque converter catalog](https://www.hyundaipartsdeal.com/oem-2026-hyundai-kona-torque_converter.html). MPI fitment lists converter assemblies 45100-2H110 and 45100-2H115. Confirms a converter for this engine/transmission combination; which part applies to the user’s specific VIN was not determined. Internal blade counts, clutch stack, dampers and dimensions remain representative.
17. [Hyundai USA 2026 Kona tire specifications](https://www.hyundaiusa.com/us/en/vehicles/kona/compare-specs). The 18-inch wheel applications list 215/55 R18. Canadian 2026 Preferred/Trend dealer fitment entries corroborate this size, while the Canadian product card confirms 18-inch wheels. The visual model uses the nominal unloaded radius 0.34685 m and 0.215 m section width; the simulation retains its explicitly illustrative effective rolling radius of 0.335 m. No tire brand, compound or OEM tread pattern is claimed.

## Assumption register

| Item | Status | Implementation / limit |
|---|---|---|
| Canadian Preferred AWD Trend, 2.0L / IVT / HTRAC | Confirmed | Manufacturer Canadian product card, inherited trim equipment. |
| Naturally aspirated MPI-Atkinson inline-four; 147 hp / 132 lb-ft | Confirmed for US engine family; Canadian calibration inferred | Technical engine notes state the source scope; no measured torque curve is simulated. |
| Shift-by-cable traditional selector | Confirmed | Manual + / − gate; no DCT or 8AT substituted. |
| Eight manual forward selections | Confirmed in SX2 manual | Eight virtual requests, not eight physical gear pairs. Numerical ratios are illustrative. |
| Hyundai Smartstream chain belt | Confirmed at IVT-family level; representative for exact Kona unit | Discrete chain links, not a scooter rubber belt or conventional steel push-belt. Exact chain / pin construction unverified. |
| Exact transmission code, ratios, final drive and internals | Unconfirmed | No exact transmission code is asserted. All ratios are explicitly simulated. |
| Converter installation / internal elements | Installation corroborated by 2026 MPI OEM-parts entries; internal elements representative | Curved vane and stamped-shell geometry remains original and representative. Exact Kona blade counts, damper type and friction stack are unknown. No CPA pendulum arrangement asserted. |
| Torque multiplication | Representative physics, illustrative curve | Decreases from about 1.95 to 1 as speed ratio rises; this is not a measured converter map. A stalled turbine transfers torque but delivers zero output power. |
| Stator hold / freewheel transition | Illustrative | Speed ratio 0.85 is an explanatory threshold, not OEM control data. A real stator reacts to the fluid moment through a passive one-way clutch. |
| Lock-up control | Illustrative | Binary clutch model above 48 km/h, low throttle and light braking. Real lock-up can use controlled slip, temperature-dependent operation and damping. |
| Fluid paths | Simplified | Toroidal circulation with swirl; particle visualization, not CFD. |
| Fixed and movable pulley sheaves | Representative | Only movable sheaves translate axially. Secondary fixed sheave is on the opposite flank; conical contact geometry is representative. |
| Constant metal chain length | Mechanical constraint | Radii solved by bisection with exact external-tangent loop-length equation, fixed center distance, and i = r_secondary / r_primary. Link positions are uniformly sampled around the loop. |
| Slight chain lateral alignment change | Simplified | Axial contact positions follow representative conical faces with interpolation on spans. Cone dimensions and clearances are not service specifications. |
| Hydraulic pistons, bearings, valve body | Simplified | Coordinated actuator visualization, no pressure values, oil channels or verified valve layout. |
| Range / reverse mechanism placement | Simplified functional schematic | Adjacent gears and parking pawl indicate function only. Exact forward-clutch and reverse planetary topology and location are not confirmed. |
| Park, Neutral, Drive, Reverse | Confirmed user-facing behavior; internal engagement schematic | Engine / impeller can run while the powered wheel path is disconnected. Brake-held Drive stalls turbine; Reverse changes final output direction while engine and chain remain forward. |
| Engine crank / rods / pistons | Simplified | Finite rod length; paired crank throws. Dimensions not matched to OEM bore or stroke. |
| DOHC, valves and flexplate | Representative | Half-speed cams, 16 schematic valves, simple cam lobes and lift. No exact firing dynamics or Atkinson valve timing reproduced. |
| Final reduction 3.8, tire rolling radius 0.335 m | Illustrative | Used to derive consistent wheel, output and turbine RPM. Not OEM ratios or tire measurements. |
| Pulley range 0.65–2.65, eight virtual step values | Illustrative | Teaching range, not advertised or service ratios. Overspeed protection reduces unsuitable requests. |
| Traditional AT / CVT / IVT comparison | Simplified | Schematic mechanism diagrams and illustrative traces. Other CVTs can also simulate shifts; this is not exclusive to Hyundai IVT. |
| Stepped IVT behavior | Confirmed strategy, illustrative programming | Smooth programmed ratio transitions under high throttle / Sport. No proprietary shift map reproduced. |
| Sport around 2,500 RPM or above | Possible behavior, not a fixed specification | RPM depends on speed, demand and ratio. No constant 2,500 RPM setpoint is claimed. |
| Normal / Sport / Snow | Confirmed in 2026 SX2 AWD manual | Eco is discussed as another Hyundai-application strategy, not presented as a target-vehicle selector. |
| Installed transverse engine, transaxle, takeoff and longitudinal rear drive path | Architecture corroborated by SX2 manufacturer guide; exact coordinates inferred | Vehicle view uses real-scale proportions; component lessons enlarge internals separately. Exact mounts, clearances and shaft angles are inferred. |
| Exterior imagery and Ecotronic Grey | Paint code PE2 and 2026 US imagery confirmed; Canadian trim match unconfirmed | The active exterior replaces the reconstructed shell with Hyundai's 2026 ICE SEL Sport spin in Ecotronic Grey. It is a regional exterior reference, not an exact image of the Canadian Preferred AWD Trend. Public builds use a licensed SX2 photograph with unverified paint code or a user-selected photo. |
| Photo / mechanical alignment | Simplified presentation | Two visible wheel centres align Hyundai side frame 001 to the representative 3D drivetrain. Interior packaging and perspective remain approximate. The aligned cutaway uses a fixed camera; Drivetrain mode restores unrestricted 3D rotation. No photograph is treated as OEM CAD. |
| Chassis / suspension | MacPherson front and AWD multi-link rear confirmed | Original unibody floor, sills, subframes, control arms, coils, rotors and fixed calipers. Exact hardpoints, brake diameter, joint topology and ancillary placements are simplified. |
| 18-inch wheel / 215/55 R18 tire | Wheel size confirmed for Canadian Preferred; tire size corroborated | Nominal bead/section/outer dimensions used visually. Spoke styling and tire tread are original representative patterns. |
| Rear multi-plate controlled coupling | Representative | Plate count / actuator unknown. Rear activity is qualitative and never reported as an OEM torque split. |
| Front and rear open differentials | Representative assumption | Mean left/right speed preserved. No locking differential or individual-wheel torque-vectoring claim. |
| Cornering | Simplified | Symmetric relative wheel speeds; schematic steering and CV joint angles. No Ackermann, lateral tire forces or ESC control loop. |
| Front-slip scenario | Simplified | Low-grip input increases qualitative rear demand and applies an illustrative front-wheel slip-speed factor. Rear coupling input/output plates can differ in speed. Tire-force/ABS/traction-control dynamics are not solved. |
| Speed evolution, creep, brake and grip | Illustrative | Optional bounded integration for exploration; not acceleration, stopping-distance or road-safety predictions. |
| Shaft / wheel angular rates | Slowed visualization | Mechanical ratios are preserved, but displayed angular speed is scaled to make parts visible. |
| Deceleration / engine braking | Simplified | Changing ratio and wheel-driven RPM are shown. Flow markers reverse to indicate overrun. Overrun torque magnitude and detailed clutch/coast control are not calculated. |
| Audio | Illustrative | Web Audio harmonics synchronized to RPM. Not an actual Kona engine recording. |
| Exploded views | Simplified geometry; mechanically organized motion | Converter and pulley elements translate on shaft axes; engine / drivetrain groups and axle assemblies separate along sensible support directions. |

## Asset search and reuse decisions

Before modeling, searches covered GitHub mechanical simulators, Sketchfab torque-converter models, GrabCAD / STLFinder converter and CVT parts, and Wikimedia reference animations.

- [Sketchfab ZF Ecomat](https://sketchfab.com/3d-models/zf-ecomat-5c87970fa98046fa8cacfab9d41bed9c): different transmission, and a reusable download/license was not established. Not imported.
- [STLFinder torque-converter index](https://www.stlfinder.com/3dmodels/Torque-converter/): assorted fragments and mechanical models; index discovery alone does not confer redistribution rights. Not imported.
- [GitHub Simscape wheel-loader CVT](https://github.com/simscape/Wheel-Loader-Simscape): a different hydromechanical architecture requiring another simulation environment. Not imported.
- [GitHub DCT teaching model](https://github.com/nirbhikviswas/Dual-Clutch-Transmission): wrong architecture for the Kona IVT. Not imported.
- [Wikimedia converter reference](https://commons.wikimedia.org/wiki/File:Menic_bez_spojky.gif): conceptual reference, no artwork copied.

The second visual pass also inspected [MattDoesBlender’s CC BY Kona](https://sketchfab.com/3d-models/hyundai-kona-bb927b0cd4404b4abc3acaf30d41e0ce). Its preview depicts the older OS body, so it was not imported. The SX2 models found on SQUIR/Free3D/TurboSquid/CGTrader require commercial licenses; no licensed purchased asset was available. VeesGuy/slowpoly SX2 results were very low polygon or lacked a verified downloadable license suitable for this exhibit. Unverified free rehosts were not used.

The common indexed [hkona.com “OS 2018–2026” service manual](https://www.hkona.com/hyundai_kona_os_2018_2026_service_manual-554.html) is expressly OS-generation material and includes DCT content. Its broad year heading does not establish applicability to this SX2 IVT vehicle; it was excluded from exact-vehicle modeling.

The delivered assets are original, editable Blender meshes in `public/models`: body, chassis, engine castings, IVT housing and wheel/brake assembly. Baked vertex contact shading, mesh LODs and local Draco compression support desktop and mobile. Procedural rotating shafts, converter vanes, pulley faces, layered representative chain links and fluid particles remain parameterized for mechanical animation. Original modeling recipe: `scripts/build_models.py`; compression/manifest: `scripts/compress_models.mjs`. Materials distinguish cast metal, machined metal, polymer, rubber, paint and glass. All geometry is identified as representative where no exact source CAD exists.

Reused assets: Poly Haven CC0 studio HDR and Inter OFL font. See ATTRIBUTION.md and public license notices.

## Photo exterior revision — 10 October 2026

- [Hyundai USA: 2026 Kona SEL Sport](https://www.hyundaiusa.com/us/en/vehicles/2026-kona/sel-sport) contains a 36-frame exterior image set with the path `2026-kona-ice-sel-sport-fwd-ecotronic-gray-`. The 2026 gallery explicitly identifies Ecotronic Gray Metallic and uses exterior colour code **PE2**. The `ice` path is the combustion-engine Kona, not Kona Electric. The unqualified `/vehicles/kona` page now serves 2027; it was not used for this revision.
- [Hyundai USA: 2026 Kona gallery](https://www.hyundaiusa.com/us/en/vehicles/2026-kona/gallery) separately exposes `2026-kona-ice-limited-fwd-ecotronic-gray-en-007` with the same PE2 colour code. The SEL Sport spin was chosen for the broadly similar black-cladding / 18-inch presentation. **Wheels, sunroof, equipment, FWD/AWD designation and market-specific trim are not claimed to exactly match the user's Canadian Trend vehicle.**
- [Hyundai Canada: 2026 Kona](https://www.hyundaicanada.com/en/showroom/2026/kona) lists Ecotronic Grey. Its current configurator uses separately hosted CGI assets. A publicly retrievable, exact 2026 Preferred AWD Trend spin was not established; the US manufacturer imagery is explicitly labeled a reference.
- [Alexander-93's SX2 photograph](https://commons.wikimedia.org/wiki/File:Hyundai_Kona_(SX2)_1X7A1646.jpg): Wikimedia image metadata confirms author, date and CC BY-SA 4.0. Its paint code is **unconfirmed**; it is not labeled as confirmed Ecotronic Grey. No recolouring or background editing was applied.
- Personal manufacturer references stay on Hyundai's image host. **Public distribution uses `VITE_PUBLIC_BUILD=true`, which substitutes the licensed Commons photograph and does not request OEM images.** The user may select their own car photo locally in either build. Asset rights and terms are recorded in ATTRIBUTION.md.
- The original procedural body GLBs and Blender recipe remain as legacy source assets, but the reconstructed shell is no longer rendered. Engine-bay, wheel and underbody views use the interactive mechanical model. “Reveal engine bay” switches into that view; no opening hood is falsely animated on a still image.


## Recorded engine audio and playback assumptions

- **Confirmed at source scope:** KVV Audio identifies the [Hyundai Kona sound pack](https://freesound.org/people/KVV_Audio/packs/45205/) as recordings of an internal-combustion Kona. [Idle](https://freesound.org/people/KVV_Audio/sounds/845611/), [2,000 RPM](https://freesound.org/people/KVV_Audio/sounds/845607/) and [3,000 RPM](https://freesound.org/people/KVV_Audio/sounds/845609/) are source recording titles, under CC BY 4.0. They were published on 17 February 2026 and checked on 10 October 2026.
- **Unverified:** the recorded Kona's model year, engine displacement, powertrain variant and market. These recordings are not presented as authenticated 2026 Canadian 2.0L engine audio.
- **Illustrative:** an estimated 850 RPM anchor for idle; equal-power mixing across the recorded bands; playback-rate scaling limited to 0.65–1.75; throttle-dependent volume and filtering. Above the highest sampled band, the sound remains approximate. No synthesized engine oscillator is used.
- **Adapted asset:** filtered, normalized, loop-crossfaded WAVs from Freesound's public high-quality MP3 previews. Sound downloads only after user opt-in. See [audio README](audio/README.md) for exact titles, source links, license and processing measurements.
