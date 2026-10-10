# Recorded Hyundai Kona engine audio

These three loops are adapted from actual Hyundai Kona combustion-engine recordings by **KVV Audio**, published on Freesound on 17 February 2026 under **Creative Commons Attribution 4.0 International (CC BY 4.0)**.

They are recordings rather than synthesized oscillator tones. The recorded Kona's model year, market, displacement, transmission and engine variant have **not** been verified. They are sound references for this exhibit, not authenticated recordings of a 2026 Canadian 2.0L Preferred AWD Trend.

| Application asset | Original title and source | RPM evidence |
| --- | --- | --- |
| `kona-idle.wav` | [VEHEngi-HYUNDAI KONA_Engine Static Idle Exterior 01_KVV AUDIO_FREE](https://freesound.org/people/KVV_Audio/sounds/845611/) | Idle stated by author; the application's 850 RPM audio anchor is an estimate. |
| `kona-2000rpm.wav` | [VEHEngi-HYUNDAI KONA_Engine Static 2000Rpm Exterior 01_KVV AUDIO_FREE](https://freesound.org/people/KVV_Audio/sounds/845607/) | 2,000 RPM stated in original title. |
| `kona-3000rpm.wav` | [VEHEngi-HYUNDAI KONA_Engine Static 3000Rpm Exterior 01_KVV AUDIO_FREE](https://freesound.org/people/KVV_Audio/sounds/845609/) | 3,000 RPM stated in original title. |

- Creator: [KVV Audio](https://freesound.org/people/KVV_Audio/).
- Collection: [SFX Pack - Hyundai Kona](https://freesound.org/people/KVV_Audio/packs/45205/).
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), [legal code](https://creativecommons.org/licenses/by/4.0/legalcode).
- Source description identifies a Hyundai Kona with an internal combustion engine and a Zoom H5 / SSH-6 recording setup. It describes original WAV files as 24-bit / 96 kHz stereo. The application adaptations were made from the publicly served Freesound high-quality MP3 previews, decoded at 48 kHz; they are not the original 96 kHz files.
- Source URLs and licensing were checked on 10 October 2026.

## Adaptations

Each source was trimmed to its steady central section, from 3 to 9 seconds. A 45 Hz high-pass filter reduces subsonic rumble; a 5.2 kHz low-pass filter reduces background hiss. A 120 ms cosine crossfade joins the tail and head into a continuous loop. DC offset was removed, and the loops were normalized to -21 dBFS RMS without exceeding a conservative peak limit. Resulting assets are 5.88 seconds each, 48 kHz stereo, 16-bit PCM WAV. WAV preserves the loop boundaries without lossy-codec padding.

`manifest.json` records duration, sampling, normalization measurements and file hashes. Playback blends the three actual recorded RPM bands with smooth, equal-power gains. A small amount of smoothed playback-rate adjustment follows simulated RPM; it is bounded between 0.65 and 1.75 to limit pitch artifacts. At RPM beyond the available recordings, audio feedback is approximate and does not reproduce a calibrated engine sound spectrum. Throttle affects level and low-pass filtering gently. No additional synthesized engine oscillator is used.

To reproduce the adaptations, install `ffmpeg` and Python's `numpy` / `scipy`, then run `python scripts/build_audio.py` from the repository. The script downloads public high-quality previews into a temporary directory; raw source audio is not retained in the repository.

Sound remains muted by default. The application creates its audio context and fetches these assets only after a sound-enable gesture. Pause and mute fade the output to silence before suspending the audio device. Background tabs are silent. Decoding or playback failures are exposed to the interface.

The source author's project-use request is respected: these processed loops are included to operate this educational application, not presented as a standalone royalty-free stock library. No raw originals are included. CC BY 4.0 attribution and licensing continue to apply to the audio adaptations; the application does not imply author or Hyundai endorsement.

## Reusable credit

Recorded Hyundai Kona engine audio by **KVV Audio** — [idle](https://freesound.org/people/KVV_Audio/sounds/845611/), [2,000 RPM](https://freesound.org/people/KVV_Audio/sounds/845607/) and [3,000 RPM](https://freesound.org/people/KVV_Audio/sounds/845609/), via Freesound, licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Adapted by trimming, filtering, normalizing and loop crossfading. Recorded vehicle year and engine variant unverified; RPM blending is illustrative.
