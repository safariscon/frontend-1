import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AVATAR_VIEWPORT, clampAvatarOffset, coverScale, cropAvatarToFile } from '../lib/avatarCrop';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

export default function AvatarCropModal({ src, initialZoom = 1, initialOffset = { x: 0, y: 0 }, onCancel, onConfirm }) {
  const { language } = useLanguage();
  const imageRef = useRef(null);
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(initialZoom);
  const [offset, setOffset] = useState(initialOffset);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const viewport = Math.min(AVATAR_VIEWPORT, typeof window !== 'undefined' ? window.innerWidth - 48 : AVATAR_VIEWPORT);

  const applyOffset = (next, nextZoom = zoom) => {
    setOffset(clampAvatarOffset(next, natural.width, natural.height, viewport, nextZoom));
  };

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && !busy) onCancel?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const onWheel = (event) => {
      event.preventDefault();
      const delta = event.deltaY < 0 ? 0.08 : -0.08;
      setZoom((current) => {
        const value = Math.min(3, Math.max(1, current + delta));
        setOffset((currentOffset) => clampAvatarOffset(currentOffset, natural.width, natural.height, viewport, value));
        return value;
      });
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [natural.height, natural.width, viewport]);

  const displayed = useMemo(() => {
    const scale = coverScale(natural.width, natural.height, viewport) * zoom;
    return {
      width: natural.width * scale,
      height: natural.height * scale,
    };
  }, [natural.height, natural.width, viewport, zoom]);

  const startDrag = (event) => {
    if (event.button != null && event.button !== 0) return;
    event.preventDefault();
    const point = event.touches?.[0] || event;
    dragRef.current = {
      x: point.clientX,
      y: point.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveDrag = (event) => {
    if (!dragRef.current) return;
    const point = event.touches?.[0] || event;
    applyOffset({
      x: dragRef.current.originX + (point.clientX - dragRef.current.x),
      y: dragRef.current.originY + (point.clientY - dragRef.current.y),
    });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const changeZoom = (nextZoom) => {
    const value = Math.min(3, Math.max(1, Number(nextZoom) || 1));
    setZoom(value);
    applyOffset(offset, value);
  };

  const confirm = async () => {
    const image = imageRef.current;
    if (!image?.naturalWidth) return;
    setBusy(true);
    setError('');
    try {
      const file = await cropAvatarToFile(image, { zoom, offset, viewport });
      onConfirm?.({ file, zoom, offset });
    } catch (cropError) {
      setError(cropError.message || t('profilePage.cropFailed', language));
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{t('profilePage.photo', language)}</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">{t('profilePage.cropTitle', language)}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t('profilePage.cropLead', language)}</p>

        <div className="mt-4 flex flex-col items-center gap-4">
          <div
            ref={stageRef}
            className="relative touch-none overflow-hidden rounded-[2rem] bg-slate-950"
            style={{ width: viewport, height: viewport, cursor: 'grab' }}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {src ? (
              <img
                ref={imageRef}
                src={src}
                alt=""
                draggable={false}
                onLoad={(event) => {
                  const width = event.currentTarget.naturalWidth;
                  const height = event.currentTarget.naturalHeight;
                  setNatural({ width, height });
                  setOffset(clampAvatarOffset(initialOffset, width, height, viewport, zoom));
                }}
                className="absolute max-w-none select-none"
                style={{
                  width: displayed.width || 'auto',
                  height: displayed.height || 'auto',
                  left: '50%',
                  top: '50%',
                  opacity: natural.width ? 1 : 0,
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                }}
              />
            ) : null}
            <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgba(2,8,23,0.58)] ring-2 ring-white/90" />
            <div className="pointer-events-none absolute inset-0 rounded-full border border-white/40" />
          </div>

          <label className="w-full">
            <span className="text-sm font-semibold text-slate-700">{t('profilePage.zoom', language)}</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(event) => changeZoom(event.target.value)}
              className="mt-2 w-full accent-primary"
            />
          </label>
        </div>

        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" disabled={busy} onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-50">
            {t('profilePage.cropCancel', language)}
          </button>
          <button type="button" disabled={busy || !natural.width} onClick={confirm} className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
            {busy ? t('savingEllipsis', language) : t('profilePage.cropConfirm', language)}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
