"""Rebuild the credited Kona engine loops from KVV Audio's public previews.

Requires ffmpeg and Python with numpy/scipy. Raw previews stay in a temporary
directory; only the application's processed loops and manifest are written.
Source attribution and accuracy limits: public/audio/README.md.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import tempfile
import urllib.request
import wave

import numpy as np
from scipy import signal


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "audio"
SAMPLE_RATE = 48_000
CROSSFADE = int(0.12 * SAMPLE_RATE)
RECORDINGS = [
    (845611, "kona-idle", 850),
    (845607, "kona-2000rpm", 2000),
    (845609, "kona-3000rpm", 3000),
]


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    with tempfile.TemporaryDirectory(prefix="kona-audio-") as directory:
        for identifier, name, base_rpm in RECORDINGS:
            source = Path(directory) / f"{identifier}.mp3"
            source_url = f"https://cdn.freesound.org/previews/845/{identifier}_12846320-hq.mp3"
            urllib.request.urlretrieve(source_url, source)
            raw = subprocess.check_output([
                "ffmpeg", "-v", "error", "-i", str(source), "-ss", "3", "-t", "6",
                "-f", "f32le", "-ac", "2", "-ar", str(SAMPLE_RATE), "-",
            ])
            samples = np.frombuffer(raw, dtype="<f4").reshape(-1, 2).astype(np.float64)
            samples = signal.sosfilt(signal.butter(
                2, 45, btype="highpass", fs=SAMPLE_RATE, output="sos",
            ), samples, axis=0)
            samples = signal.sosfilt(signal.butter(
                2, 5200, btype="lowpass", fs=SAMPLE_RATE, output="sos",
            ), samples, axis=0)
            samples -= samples.mean(axis=0)
            weight = (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, CROSSFADE)))[:, None]
            # The final sample blends into head[CROSSFADE - 1]; the next sample
            # at the wrap is head[CROSSFADE], preserving a natural waveform step.
            loop = np.concatenate([
                samples[CROSSFADE:-CROSSFADE],
                samples[-CROSSFADE:] * (1 - weight) + samples[:CROSSFADE] * weight,
            ])
            gain = min(
                10 ** (-21 / 20) / np.sqrt(np.mean(loop ** 2)),
                0.82 / np.max(np.abs(loop)),
            )
            loop *= gain
            pcm = np.rint(np.clip(loop, -1, 1) * 32767).astype("<i2")
            path = OUTPUT / f"{name}.wav"
            with wave.open(str(path), "wb") as output:
                output.setnchannels(2)
                output.setsampwidth(2)
                output.setframerate(SAMPLE_RATE)
                output.writeframes(pcm.tobytes())
            manifest.append({
                "file": path.name,
                "source_id": identifier,
                "duration": len(pcm) / SAMPLE_RATE,
                "sample_rate": SAMPLE_RATE,
                "channels": 2,
                "sampled_rpm": base_rpm,
                "rpm_status": "estimated idle anchor" if base_rpm == 850 else "source recording title",
                "rms_dbfs": float(20 * np.log10(np.sqrt(np.mean(loop ** 2)))),
                "peak_dbfs": float(20 * np.log10(np.max(np.abs(loop)))),
                "boundary_difference": float(np.max(np.abs(loop[0] - loop[-1]))),
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            })
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
