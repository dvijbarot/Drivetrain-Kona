import { useCallback, useEffect, useRef, useState } from 'react';
import { assetPath } from './assetPath';

type AudioStatus = 'idle' | 'loading' | 'ready' | 'error';
type Voice = { source: AudioBufferSourceNode; gain: GainNode; baseRpm: number };
type AudioGraph = {
  context: AudioContext;
  abort: AbortController;
  voices: Voice[];
  master: GainNode | null;
  filter: BiquadFilterNode | null;
  loading: Promise<void> | null;
};

const recordings = [
  { file: 'kona-idle.wav', baseRpm: 850 },
  { file: 'kona-2000rpm.wav', baseRpm: 2000 },
  { file: 'kona-3000rpm.wav', baseRpm: 3000 },
] as const;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Three genuine Kona recordings; RPM interpolation is illustrative, not an OEM audio map. */
export function useEngineAudio(enabled: boolean, rpm: number, throttle: number, playing: boolean) {
  const graph = useRef<AudioGraph | null>(null);
  const latest = useRef({ enabled, rpm, throttle, playing });
  latest.current = { enabled, rpm, throttle, playing };
  const suspendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<AudioStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback(() => {
    const audio = graph.current;
    if (!audio?.master || !audio.filter) return;
    const input = latest.current;
    const now = audio.context.currentTime;
    const engineRpm = clamp(Number.isFinite(input.rpm) ? input.rpm : 850, 500, 7000);
    const load = clamp(input.throttle / 100, 0, 1);
    // Equal-power blends keep loudness steady while moving between recorded RPM bands.
    const weights = [0, 0, 0];
    if (engineRpm <= 850) weights[0] = 1;
    else if (engineRpm < 2000) {
      const blend = (engineRpm - 850) / 1150;
      weights[0] = Math.cos(blend * Math.PI / 2);
      weights[1] = Math.sin(blend * Math.PI / 2);
    } else if (engineRpm < 3000) {
      const blend = (engineRpm - 2000) / 1000;
      weights[1] = Math.cos(blend * Math.PI / 2);
      weights[2] = Math.sin(blend * Math.PI / 2);
    } else weights[2] = 1;
    audio.voices.forEach((voice, index) => {
      // Bounded rates avoid turning the idle recording into a shrill, highly sped-up loop.
      voice.source.playbackRate.setTargetAtTime(clamp(engineRpm / voice.baseRpm, .65, 1.75), now, .16);
      voice.gain.gain.setTargetAtTime(weights[index], now, .14);
    });
    audio.filter.frequency.setTargetAtTime(1900 + load * 2600, now, .2);
    const audible = input.enabled && input.playing && !document.hidden;
    audio.master.gain.setTargetAtTime(audible ? .42 + .2 * load : 0, now, .08);
    if (audible && suspendTimer.current) {
      clearTimeout(suspendTimer.current);
      suspendTimer.current = null;
    }
    if (!audible && !suspendTimer.current && audio.context.state !== 'suspended') {
      // Fade first, then release the audio device. Pause, mute and hidden tabs are silent.
      suspendTimer.current = setTimeout(() => {
        suspendTimer.current = null;
        const state = latest.current;
        if (graph.current === audio && (!state.enabled || !state.playing || document.hidden)) {
          void audio.context.suspend().catch(() => {});
        }
      }, 550);
    } else if (audible && audio.context.state === 'suspended') {
      void audio.context.resume().catch(() => {
        if (graph.current === audio) {
          setError('Audio playback was blocked. Click the sound button again to enable it.');
          setStatus('error');
        }
      });
    }
  }, []);

  const activate = useCallback(() => {
    const existing = graph.current;
    if (existing) {
      // Call resume directly inside the button/checkbox gesture, including on Safari.
      void existing.context.resume().then(() => {
        if (existing.master && graph.current === existing) {
          setError(null);
          setStatus('ready');
          apply();
        }
      }).catch(() => {
        if (graph.current === existing) {
          setError('Audio playback was blocked. Click the sound button again to enable it.');
          setStatus('error');
        }
      });
      return;
    }
    const AudioContextConstructor = window.AudioContext || (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;
    if (!AudioContextConstructor) {
      setError('This browser does not support engine audio.');
      setStatus('error');
      return;
    }
    let context: AudioContext;
    try { context = new AudioContextConstructor(); }
    catch {
      setError('The browser could not start engine audio.');
      setStatus('error');
      return;
    }
    const audio: AudioGraph = { context, abort: new AbortController(), voices: [], master: null, filter: null, loading: null };
    graph.current = audio;
    setError(null);
    setStatus('loading');
    // Resume before awaiting network or decoding; user activation must remain synchronous.
    const resume = context.resume();
    audio.loading = (async () => {
      await resume;
      const buffers = await Promise.all(recordings.map(async recording => {
        const response = await fetch(assetPath(`audio/${recording.file}`), { signal: audio.abort.signal });
        if (!response.ok) throw new Error(`Engine recording could not load (${response.status}).`);
        return context.decodeAudioData(await response.arrayBuffer());
      }));
      if (graph.current !== audio || audio.abort.signal.aborted) return;
      const master = context.createGain();
      master.gain.value = 0;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2200;
      filter.Q.value = .5;
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -12;
      limiter.knee.value = 8;
      limiter.ratio.value = 10;
      limiter.attack.value = .005;
      limiter.release.value = .15;
      filter.connect(master);
      master.connect(limiter);
      limiter.connect(context.destination);
      audio.master = master;
      audio.filter = filter;
      audio.voices = buffers.map((buffer, index) => {
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.loopEnd = buffer.duration;
        const gain = context.createGain();
        gain.gain.value = 0;
        source.connect(gain);
        gain.connect(filter);
        source.start();
        return { source, gain, baseRpm: recordings[index].baseRpm };
      });
      setStatus('ready');
      apply();
    })().catch(reason => {
      if (graph.current !== audio || audio.abort.signal.aborted) return;
      setError(reason instanceof Error ? reason.message : 'Engine audio could not load. Try the sound button again.');
      setStatus('error');
      audio.voices.forEach(voice => voice.source.stop());
      audio.abort.abort();
      void context.close().catch(() => {});
      graph.current = null;
    }).finally(() => { audio.loading = null; });
  }, [apply]);

  useEffect(() => { apply(); }, [enabled, rpm, throttle, playing, apply]);
  useEffect(() => {
    const updateVisibility = () => apply();
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      document.removeEventListener('visibilitychange', updateVisibility);
      if (suspendTimer.current) clearTimeout(suspendTimer.current);
      const audio = graph.current;
      graph.current = null;
      audio?.abort.abort();
      audio?.voices.forEach(voice => voice.source.stop());
      if (audio) void audio.context.close().catch(() => {});
    };
  }, [apply]);

  return { status, error, activate };
}
