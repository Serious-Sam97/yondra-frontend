'use client'

import { useEffect, useRef } from 'react';

// Splash particles — module-level so Board.tsx can trigger them via triggerInkSplash()
interface Particle { x: number; y: number; vx: number; vy: number; life: number; r: number }
const _particles: Particle[] = [];

// Set by the mounted SpringTrail instance; lets triggerInkSplash wake the loop on demand.
let _wake: (() => void) | null = null;

export function triggerInkSplash(cx: number, cy: number): void {
    const count = 18 + Math.floor(Math.random() * 10);
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 5.5;
        _particles.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2.5,
            life: 1,
            r: 1.5 + Math.random() * 3.5,
        });
    }
    _wake?.();
}

export function SpringTrail() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        window.addEventListener('resize', resize, { passive: true });

        // The loop only runs while particles are alive — idle costs nothing.
        let raf: number | null = null;
        const tick = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Ink splash particles — desktop + mobile
            for (let i = _particles.length - 1; i >= 0; i--) {
                const p = _particles[i];
                p.vy += 0.18;          // gravity
                p.vx *= 0.93;          // air resistance
                p.vy *= 0.93;
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.032;
                if (p.life <= 0) { _particles.splice(i, 1); continue; }
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(200,176,96,${(p.life * 0.75).toFixed(2)})`;
                ctx.fill();
            }

            raf = _particles.length > 0 ? requestAnimationFrame(tick) : null;
        };

        _wake = () => { if (raf === null) raf = requestAnimationFrame(tick); };
        _wake();

        return () => {
            if (raf !== null) cancelAnimationFrame(raf);
            _wake = null;
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{ position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 9999 }}
        />
    );
}
