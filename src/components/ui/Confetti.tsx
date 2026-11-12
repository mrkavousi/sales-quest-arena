import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from './motion';

const COLORS = ['#5b3df5', '#2ea8ff', '#ffc93c', '#2fbf71', '#ff6b8e', '#ff8f3d', '#ffffff'];

interface Particle {
  x: number; y: number; vx: number; vy: number;
  w: number; h: number; rot: number; vr: number;
  color: string; round: boolean; wobble: number;
}

interface ConfettiProps {
  /** Change the key (or this number) to fire another burst. */
  burst?: number;
  count?: number;
}

/** Lightweight canvas confetti — no library, ~1 kB, stops itself when finished. */
export function Confetti({ burst = 0, count = 150 }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || prefersReducedMotion()) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let width = window.innerWidth;
    let height = window.innerHeight;
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const spawn = (originX: number, angle: number, spread: number): Particle => {
      const dir = angle + rand(-spread, spread);
      const speed = rand(7, 17) * Math.min(1.3, Math.max(0.8, height / 800));
      return {
        x: originX, y: height * 0.42,
        vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed,
        w: rand(7, 13), h: rand(5, 9), rot: rand(0, Math.PI * 2), vr: rand(-0.25, 0.25),
        color: COLORS[Math.floor(Math.random() * COLORS.length)], round: Math.random() < 0.25, wobble: rand(0, Math.PI * 2),
      };
    };
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const side = i % 3;
      if (side === 0) particles.push(spawn(width * 0.5, -Math.PI / 2, 0.9));
      else if (side === 1) particles.push(spawn(width * 0.12, -Math.PI / 3, 0.5));
      else particles.push(spawn(width * 0.88, (-2 * Math.PI) / 3, 0.5));
    }

    let raf = 0;
    let last = performance.now();
    const started = last;
    const frame = (now: number) => {
      const dt = Math.min(2.5, (now - last) / 16.67);
      last = now;
      const age = now - started;
      ctx.clearRect(0, 0, width, height);
      let alive = 0;
      for (const p of particles) {
        p.vy += 0.32 * dt;
        p.vx *= Math.pow(0.985, dt);
        p.vy = Math.min(p.vy, 7.5);
        p.wobble += 0.12 * dt;
        p.x += (p.vx + Math.sin(p.wobble) * 0.9) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.y > height + 30) continue;
        alive++;
        ctx.save();
        ctx.globalAlpha = age > 3600 ? Math.max(0, 1 - (age - 3600) / 900) : 1;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.wobble));
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.h * 0.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      }
      if (alive > 0 && age < 4500) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, width, height);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      ctx.clearRect(0, 0, width, height);
    };
  }, [burst, count]);

  return <canvas ref={canvasRef} className="confetti" aria-hidden="true" />;
}
