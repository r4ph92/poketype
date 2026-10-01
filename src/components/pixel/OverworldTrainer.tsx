'use client';

import { useEffect, useRef } from 'react';
import type { TrainerAvatarId } from '@/assets/trainers';

export function OverworldTrainer({ avatar, scale = 3, facing = 'south' }: { avatar: TrainerAvatarId; scale?: 2 | 3 | 4; facing?: 'south' | 'east' }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const target = canvas.current;
    const context = target?.getContext('2d');
    if (!target || !context) return;
    let cancelled = false;
    const sheet = new Image();
    sheet.onload = () => {
      if (cancelled) return;
      const frame = document.createElement('canvas');
      frame.width = 16;
      frame.height = 32;
      const pixels = frame.getContext('2d');
      if (!pixels) return;
      pixels.drawImage(sheet, facing === 'east' ? 32 : 0, 0, 16, 32, 0, 0, 16, 32);
      const data = pixels.getImageData(0, 0, 16, 32);
      // The upper-left corner is the sheet's transparent palette color.
      const [red, green, blue] = data.data;
      for (let i = 0; i < data.data.length; i += 4) {
        if (data.data[i] === red && data.data[i + 1] === green && data.data[i + 2] === blue) data.data[i + 3] = 0;
      }
      pixels.putImageData(data, 0, 0);
      context.clearRect(0, 0, target.width, target.height);
      context.imageSmoothingEnabled = false;
      context.save();
      if (facing === 'east') { context.translate(target.width, 0); context.scale(-1, 1); }
      context.drawImage(frame, 0, 0, target.width, target.height);
      context.restore();
      target.dataset.ready = 'true';
    };
    target.dataset.ready = 'false';
    sheet.src = `/assets/sprites/trainers/overworld/${avatar}.png`;
    return () => { cancelled = true; };
  }, [avatar, facing, scale]);
  return <canvas ref={canvas} width={16 * scale} height={32 * scale} aria-hidden="true" data-trainer-avatar={avatar} className="pixelated shrink-0" />;
}
