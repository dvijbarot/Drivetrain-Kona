"""Verify the primary 3D workspace, readable UI and opt-in recorded engine audio.

Run against a production preview with KONA_TEST_URL. Uses installed Chromium and
Python Playwright; no server instrumentation or production debug API is needed.
"""
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = os.environ.get('KONA_TEST_URL', 'http://127.0.0.1:4175/Drivetrain-Kona/')
OUT = Path('/tmp/kona-qa')
OUT.mkdir(exist_ok=True)

# Observe real Web Audio buffers and its final signal, without replacing engine
# sounds or changing the audible routing. An analyser is a parallel output only.
AUDIO_OBSERVER = r"""
(() => {
  const Native = window.AudioContext || window.webkitAudioContext;
  window.__engineAudioProbe = { contexts: [], sources: [], analysers: [] };
  const originalConnect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function(destination, ...args) {
    const result = originalConnect.call(this, destination, ...args);
    if (destination === this.context.destination && !this.__observedOutput) {
      this.__observedOutput = true;
      const analyser = this.context.createAnalyser();
      analyser.fftSize = 2048;
      originalConnect.call(this, analyser);
      window.__engineAudioProbe.analysers.push(analyser);
    }
    return result;
  };
  class ObservedAudioContext extends Native {
    constructor(options) {
      super(options);
      window.__engineAudioProbe.contexts.push(this);
    }
    createBufferSource() {
      const source = super.createBufferSource();
      source.__started = false;
      source.__stopped = false;
      const start = source.start.bind(source), stop = source.stop.bind(source);
      source.start = (...args) => { source.__started = true; return start(...args); };
      source.stop = (...args) => { source.__stopped = true; return stop(...args); };
      window.__engineAudioProbe.sources.push(source);
      return source;
    }
  }
  window.AudioContext = ObservedAudioContext;
  if (window.webkitAudioContext) window.webkitAudioContext = ObservedAudioContext;
  window.__engineAudioSnapshot = () => {
    const probe = window.__engineAudioProbe;
    const rms = probe.analysers.map(analyser => {
      const data = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(data);
      return Math.sqrt(data.reduce((sum, sample) => sum + sample * sample, 0) / data.length);
    });
    return {
      contexts: probe.contexts.map(context => context.state),
      sources: probe.sources.map(source => ({
        started: source.__started, stopped: source.__stopped,
        duration: source.buffer?.duration || 0, loop: source.loop,
        rate: source.playbackRate.value, channels: source.buffer?.numberOfChannels || 0,
      })),
      rms: Math.max(0, ...rms),
    };
  };
})();
"""

CONTRAST_CHECK = r"""selector => {
  const el = document.querySelector(selector), style = getComputedStyle(el);
  const parse = value => (value.match(/[\d.]+/g) || []).map(Number);
  let background = [0, 0, 0];
  const ancestors = []; for (let node = el; node; node = node.parentElement) ancestors.unshift(node);
  for (const node of ancestors) {
    const rgba = parse(getComputedStyle(node).backgroundColor), alpha = rgba[3] ?? 1;
    background = background.map((channel, i) => rgba[i] * alpha + channel * (1 - alpha));
  }
  const color = parse(style.color), alpha = color[3] ?? 1;
  const foreground = background.map((channel, i) => color[i] * alpha + channel * (1 - alpha));
  const luminance = rgb => rgb.map(c => {
    const value = c / 255;
    return value <= .04045 ? value / 12.92 : Math.pow((value + .055) / 1.055, 2.4);
  }).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
  const [a, b] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return { selector, ratio: (a + .05) / (b + .05), fontSize: parseFloat(style.fontSize), color: style.color };
}"""


def set_range(page, name, value):
    page.get_by_role('slider', name=name, exact=True).evaluate(
        """(element, value) => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, value);
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }""", str(value))


def scene_metrics(page):
    box = page.locator('.scene-area').bounding_box()
    viewport = page.viewport_size
    return {**box, 'widthFraction': box['width'] / viewport['width'],
            'heightFraction': box['height'] / viewport['height'],
            'areaFraction': box['width'] * box['height'] / (viewport['width'] * viewport['height'])}


def check(condition, explanation):
    if not condition:
        raise AssertionError(explanation)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
        args=['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'])
    page = browser.new_page(viewport={'width':1440, 'height':1000})
    page.add_init_script(AUDIO_OBSERVER)
    errors, failed_requests, audio_requests, sizes, contrast = [], [], [], {}, []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('requestfailed', lambda request: failed_requests.append(request.url))
    page.on('request', lambda request: audio_requests.append(request.url)
            if request.resource_type == 'media' or request.url.split('?')[0].endswith(('.mp3', '.ogg', '.wav', '.m4a')) else None)
    page.goto(BASE, wait_until='networkidle')
    page.locator('canvas').wait_for(state='visible', timeout=60000)
    page.locator('.asset-loading').wait_for(state='hidden', timeout=60000)
    pause = page.get_by_role('button', name='Pause animation', exact=True)
    if pause.is_visible():
        pause.click()
    check(page.get_by_role('button', name='Enable engine sound', exact=True).is_visible(), 'Sound defaults to muted')
    check(not audio_requests, 'Muted default does not download sound recordings')
    check(not page.evaluate('window.__engineAudioSnapshot().sources.length'), 'Muted default starts no engine sound sources')

    for width, height in [(1440,1000), (1920,1080)]:
        page.set_viewport_size({'width':width, 'height':height})
        page.wait_for_timeout(200)
        check(not page.locator('.sidebar').is_visible(), 'Navigation is collapsed by default')
        check(not page.locator('.inspector').is_visible(), 'Inspector is collapsed by default')
        check(page.locator('.photo-exterior').is_hidden(), 'The default scene displays the mechanical drivetrain')
        sizes[f'{width}×{height}'] = metrics = scene_metrics(page)
        check(metrics['widthFraction'] >= .9, f'Main scene spans the page width: {metrics}')
        check(metrics['heightFraction'] >= .6, f'Main scene dominates page height: {metrics}')
        check(page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Desktop has no horizontal overflow')
        page.screenshot(path=str(OUT/f'workspace-{width}.png'))
    print('Dominant 3D canvas verified at desktop sizes', flush=True)

    chapters = page.get_by_role('button', name='Chapters', exact=True)
    chapters.click()
    check(chapters.get_attribute('aria-expanded') == 'true', 'Chapter toggle exposes its open state')
    check(page.locator('.sidebar').is_visible(), 'Chapter drawer opens')
    page.locator('.chapter').nth(8).click()
    check(page.locator('.sidebar').is_hidden(), 'Choosing a chapter restores the full canvas')
    page.get_by_role('button', name='Pause animation', exact=True).click()
    page.get_by_role('button', name='Inspect', exact=True).click()
    check(page.locator('.inspector').is_visible(), 'Component inspector opens')
    for selector in ['.part-explanation', '.scene-title p', '.focus-tabs button']:
        result = page.evaluate(CONTRAST_CHECK, selector)
        contrast.append(result)
        check(result['ratio'] >= 4.5, f'Readable text contrast: {result}')
    check(contrast[0]['fontSize'] >= 14, f'Component explanation has readable size: {contrast[0]}')
    page.screenshot(path=str(OUT/'workspace-inspector.png'))
    page.get_by_role('button', name='Close inspector', exact=True).click()
    page.get_by_role('button', name='Read full explanation', exact=True).click()
    check(page.get_by_role('button', name='Collapse explanation', exact=True).is_visible(), 'Full lesson explanation expands')
    page.get_by_role('button', name='Collapse explanation', exact=True).click()
    page.get_by_role('button', name='Enter focus mode', exact=True).click()
    check(page.locator('.app.focus-mode').count() == 1, 'Focus mode is active')
    sizes['focus'] = focused = scene_metrics(page)
    check(focused['heightFraction'] >= .85, f'Focus mode gives the scene most of the viewport: {focused}')
    page.screenshot(path=str(OUT/'workspace-focus.png'))
    page.get_by_role('button', name='Exit focus mode', exact=True).click()
    print('Drawers, contrast, full lesson explanation and focus mode checked', flush=True)

    page.get_by_role('button', name='Simulator', exact=True).click()
    page.get_by_role('button', name='Red light', exact=True).click()
    page.get_by_role('button', name='Enable engine sound', exact=True).click()
    page.wait_for_function("window.__engineAudioSnapshot().sources.some(source => source.started && source.duration > .2)", timeout=30000)
    page.wait_for_function('window.__engineAudioSnapshot().rms > .0001', timeout=10000)
    page.wait_for_timeout(800)
    idle = page.evaluate('window.__engineAudioSnapshot()')
    check(audio_requests, 'Audio opt-in downloads an actual recording')
    check(any(source['loop'] for source in idle['sources']), 'The recorded engine audio loops')
    check(all(source['channels'] >= 1 for source in idle['sources']), 'Audio recordings are successfully decoded')
    page.get_by_role('button', name='Hard launch', exact=True).click()
    page.wait_for_timeout(1200)
    launch = page.evaluate('window.__engineAudioSnapshot()')
    check(launch['rms'] > .0001, 'Acceleration produces real audio output')
    idle_rates = [source['rate'] for source in idle['sources'] if source['started'] and not source['stopped']]
    launch_rates = [source['rate'] for source in launch['sources'] if source['started'] and not source['stopped']]
    check(idle_rates != launch_rates, f'Changing engine RPM changes recording playback: {idle_rates} -> {launch_rates}')
    page.get_by_role('button', name='Pause animation', exact=True).click()
    page.wait_for_timeout(1200)
    paused = page.evaluate('window.__engineAudioSnapshot()')
    check(all(state != 'running' for state in paused['contexts']) or paused['rms'] < .00001,
          f'Pausing the simulator silences engine audio: {paused}')
    page.get_by_role('button', name='Play animation', exact=True).click()
    page.wait_for_function('window.__engineAudioSnapshot().rms > .0001', timeout=10000)
    page.get_by_role('button', name='Mute sound', exact=True).click()
    page.wait_for_timeout(1200)
    muted = page.evaluate('window.__engineAudioSnapshot()')
    check(all(state != 'running' for state in muted['contexts']) or muted['rms'] < .00001,
          f'Mute silences the recorded audio: {muted}')
    print('Real engine recordings, RPM response, pause and mute verified', flush=True)

    for width, height, name in [(834,1112,'ipad'), (390,844,'phone')]:
        page.set_viewport_size({'width':width, 'height':height})
        page.get_by_role('button', name='Learn', exact=False).first.click()
        page.wait_for_timeout(200)
        check(page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), name + ' has no horizontal overflow')
        page.get_by_role('button', name='Chapters', exact=True).click()
        check(page.locator('.sidebar').is_visible(), name + ' chapter drawer opens')
        page.locator('.chapter').nth(3).click()
        check(page.locator('.sidebar').is_hidden(), name + ' selecting chapter restores scene')
        page.get_by_role('button', name='Inspect', exact=True).click()
        check(page.locator('.inspector').is_visible(), name + ' component inspector is accessible')
        page.get_by_role('button', name='Close inspector', exact=True).click()
        page.get_by_role('button', name='Enter focus mode', exact=True).click()
        check(page.get_by_role('button', name='Exit focus mode', exact=True).is_visible(), name + ' focus mode can be exited')
        page.get_by_role('button', name='Exit focus mode', exact=True).click()
        page.screenshot(path=str(OUT/f'workspace-{name}.png'), full_page=True)
    check(not errors, f'No runtime errors: {errors}')
    check(not failed_requests, f'No missing runtime assets: {failed_requests}')
    browser.close()
    (OUT/'presentation-audio-results.json').write_text(json.dumps({
        'status':'passed', 'scene_metrics':sizes, 'contrast':contrast,
        'audio':{'recordings':audio_requests, 'idle':idle, 'launch':launch, 'paused':paused, 'muted':muted},
        'runtime_errors':errors, 'failed_requests':failed_requests,
    }, indent=2))
    print('PASS — primary canvas, readable theme and recorded engine audio', flush=True)
