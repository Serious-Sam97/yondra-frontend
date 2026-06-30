'use client'

import { useEffect, useRef } from 'react';

// Splash particles — module-level so Board.tsx can trigger them via triggerInkSplash()
interface Particle { x: number; y: number; vx: number; vy: number; life: number; r: number }
const _particles: Particle[] = [];

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

        let raf: number;
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

            raf = requestAnimationFrame(tick);
        };
        tick();

        return () => {
            cancelAnimationFrame(raf);
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
