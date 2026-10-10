import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { ChevronLeft, ChevronRight, Upload, RotateCcw, ArrowUpRight } from 'lucide-react';
import { assetPath } from './assetPath';

// Hyundai-hosted images are personal reference only. Public builds use the
// separately licensed Commons photograph; OEM binaries are never bundled.
export const personalReferences = import.meta.env.VITE_PUBLIC_BUILD !== 'true';
export const exteriorImage = (frame: number, low = false) =>
  `https://s7d1.scene7.com/is/image/hyundai/2026-kona-ice-sel-sport-fwd-ecotronic-gray-${String(frame).padStart(3, '0')}?wid=${low ? 960 : 1800}&fmt=webp-alpha&qlt=95`;
const manufacturerPage = 'https://www.hyundaiusa.com/us/en/vehicles/2026-kona/sel-sport';
const commonsPage = 'https://commons.wikimedia.org/wiki/File:Hyundai_Kona_(SX2)_1X7A1646.jpg';
const angles = [{ name: 'Front ¾', frame: 7 }, { name: 'Side', frame: 1 }, { name: 'Rear ¾', frame: 34 }, { name: 'Front', frame: 10 }, { name: 'Rear', frame: 28 }];
const wrap = (frame: number) => ((frame - 1) % 36 + 36) % 36 + 1;

export function PhotoExterior({ active, xray, low, cameraView, reset, imageRef, onRegistered, onInspect, onReveal }: {
  active: boolean; xray: boolean; low: boolean; cameraView: string; reset: number;
  imageRef: React.RefObject<HTMLImageElement | null>;
  onRegistered: (registered: boolean) => void;
  onInspect: (id: string) => void; onReveal: () => void;
}) {
  const [frame, setFrame] = useState(7);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [ownPhoto, setOwnPhoto] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(24);
  const [error, setError] = useState('');
  const drag = useRef<{ id: number; x: number; frame: number } | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const manufacturer = personalReferences && !failed && !ownPhoto;
  const registered = active && xray && manufacturer;
  const shownFrame = registered ? 1 : frame;
  const src = ownPhoto || (manufacturer ? exteriorImage(shownFrame, low) : assetPath('/photos/kona-sx2-reference.jpg'));
  useEffect(() => { onRegistered(registered); return () => onRegistered(false); }, [registered, onRegistered]);
  useEffect(() => { setLoaded(false); }, [src]);
  useEffect(() => { setFrame(cameraView === 'Side' ? 1 : cameraView === 'Front' ? 10 : 7); }, [cameraView, reset]);
  useEffect(() => () => { if (ownPhoto) URL.revokeObjectURL(ownPhoto); }, [ownPhoto]);
  useEffect(() => {
    if (!active || !manufacturer || !loaded || xray) return;
    // Warm a few adjacent frames, rather than fetching the entire spin upfront.
    const images = [-2, -1, 1, 2].map(offset => { const im = new Image(); im.src = exteriorImage(wrap(frame + offset), low); return im; });
    return () => { images.forEach(im => { im.src = ''; }); };
  }, [active, manufacturer, loaded, frame, low, xray]);
  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!manufacturer || xray || (event.target as HTMLElement).closest('button,a,input,label')) return;
    drag.current = { id: event.pointerId, x: event.clientX, frame };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || event.pointerId !== start.id) return;
    setFrame(wrap(start.frame + Math.round((event.clientX - start.x) / 14)));
  }
  const referenceOnly = xray && !registered;
  return <div hidden={!active} className={'photo-exterior ' + (xray ? 'photo-xray ' : 'photo-solid ') + (referenceOnly ? 'photo-reference-only' : '')} data-source={manufacturer ? 'hyundai' : ownPhoto ? 'personal' : 'commons'}>
    <div className="photo-stage" onPointerDown={startDrag} onPointerMove={moveDrag}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
      onKeyDown={event => { if (!manufacturer || xray) return; if (event.key === 'ArrowLeft') { event.preventDefault(); setFrame(wrap(frame - 1)); } if (event.key === 'ArrowRight') { event.preventDefault(); setFrame(wrap(frame + 1)); } }}
      tabIndex={!xray && manufacturer ? 0 : undefined} role={!xray && manufacturer ? 'group' : undefined} aria-label={!xray && manufacturer ? 'Exterior image rotation. Drag or use arrow keys.' : undefined}>
      <img ref={imageRef} className={'exterior-photo ' + (registered ? 'registered-photo' : '')}
        src={src} alt={manufacturer ? '2026 Hyundai Kona SEL Sport exterior in Ecotronic Grey, manufacturer reference' : ownPhoto ? 'Your personal vehicle photo' : 'Grey Hyundai Kona SX2 photographed by Alexander-93'}
        draggable={false} decoding="async" style={{ '--body-opacity': opacity / 100 } as CSSProperties}
        onLoad={() => setLoaded(true)} onError={() => { if (manufacturer) { setFailed(true); setLoaded(false); } else { setError('The image could not load. You can choose a photo from your device.'); } }} />
      {!loaded && !xray && !error && <span className="photo-loading" role="status">Loading exterior reference…</span>}
      {!xray && <div className="photo-inspect"><span>LOOK INSIDE</span><button onClick={() => onInspect('engine')}>2.0L engine <ArrowUpRight size={12}/></button><button onClick={() => onInspect('converter')}>Converter <ArrowUpRight size={12}/></button><button onClick={() => onInspect('primary')}>IVT <ArrowUpRight size={12}/></button><button onClick={() => onInspect('coupling')}>HTRAC AWD <ArrowUpRight size={12}/></button></div>}
    </div>
    <div className="photo-toolbar">
      <div className="photo-identity"><span className="paint-swatch"/><div><strong>{ownPhoto ? 'Your Kona' : manufacturer ? 'Ecotronic Grey' : 'Kona SX2 · photo reference'}</strong><span>{ownPhoto ? 'Personal photo · stays on this device' : manufacturer ? '2026 · PE2 · Hyundai exterior imagery' : 'Alexander-93 · CC BY-SA 4.0 · colour unverified'}</span></div></div>
      {!xray && manufacturer && <div className="photo-angle-controls"><button aria-label="Previous exterior angle" onClick={() => setFrame(wrap(frame - 1))}><ChevronLeft size={16}/></button><select aria-label="Exterior angle" value={angles.some(a => a.frame === frame) ? frame : ''} onChange={event => setFrame(+event.target.value)}><option value="" disabled>View {String(frame).padStart(2, '0')} / 36</option>{angles.map(angle => <option key={angle.frame} value={angle.frame}>{angle.name}</option>)}</select><button aria-label="Next exterior angle" onClick={() => setFrame(wrap(frame + 1))}><ChevronRight size={16}/></button></div>}
      {registered && <label className="body-opacity">Shell visibility <input aria-label="Photo shell visibility" type="range" min="5" max="70" value={opacity} onChange={event => setOpacity(+event.target.value)}/></label>}
      {!xray && <button className="photo-reveal" onClick={onReveal}>Reveal drivetrain <ArrowUpRight size={12}/></button>}
      <button className="photo-upload" aria-label="Use a photo of my car" title="Use a photo of your own car" onClick={() => picker.current?.click()}><Upload size={14}/><span>My car</span></button>
      {ownPhoto && <button className="photo-upload" aria-label="Restore reference photo" title="Restore reference photo" onClick={() => { setOwnPhoto(null); setError(''); }}><RotateCcw size={14}/></button>}
      <input ref={picker} type="file" hidden aria-label="Vehicle photo file" accept="image/jpeg,image/png,image/webp" onChange={event => {
        const file = event.target.files?.[0]; if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) { setError('Choose a JPEG, PNG or WebP photo smaller than 20 MB.'); event.target.value = ''; return; }
        setOwnPhoto(URL.createObjectURL(file)); setLoaded(false); setError(''); event.target.value = '';
      }}/>
    </div>
    <div className="photo-credit">{manufacturer ? <><a href={manufacturerPage} target="_blank" rel="noreferrer">Hyundai reference</a><span>US SEL Sport shown · Canadian Trend wheels and equipment differ</span></> : ownPhoto ? <span>Your photo is viewed locally and is never uploaded.</span> : <><a href={commonsPage} target="_blank" rel="noreferrer">Photo: Alexander-93</a><a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a><span>Regional trim reference</span></>}</div>
    {xray && <span className="photo-registration-note">{registered ? 'Aligned side cutaway · internal placement is representative' : 'Photo reference · free 3D inspection'}</span>}
    {error && <div className="photo-error" role="alert">{error}</div>}
  </div>;
}
