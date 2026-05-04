'use client'

import { useEffect, useRef } from 'react';

const N    = 8;
const K    = 0.28;
const DAMP = 0.58;
const COLOR = 'rgba(200,176,96,';

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

        const isCoarse = window.matchMedia('(pointer: coarse)').matches;

        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        window.addEventListener('resize', resize, { passive: true });

        const pts = Array.from({ length: N }, () => ({ x: -999, y: -999, vx: 0, vy: 0 }));
        let mx = -999, my = -999, hasMoved = false;

        let onMove: ((e: MouseEvent) => void) | undefined;
        if (!isCoarse) {
            onMove = (e: MouseEvent) => {
                mx = e.clientX; my = e.clientY;
                if (!hasMoved) {
                    pts.forEach(p => { p.x = mx; p.y = my; p.vx = 0; p.vy = 0; });
                    hasMoved = true;
                }
            };
            window.addEventListener('mousemove', onMove, { passive: true });
        }

        let raf: number;
        const tick = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Spring chain — desktop only
            if (!isCoarse && hasMoved) {
                pts[0].vx += (mx - pts[0].x) * K;
                pts[0].vy += (my - pts[0].y) * K;
                for (let i = 1; i < N; i++) {
                    pts[i].vx += (pts[i - 1].x - pts[i].x) * K;
                    pts[i].vy += (pts[i - 1].y - pts[i].y) * K;
                }
                pts.forEach(p => { p.vx *= DAMP; p.vy *= DAMP; p.x += p.vx; p.y += p.vy; });

                pts.forEach((p, i) => {
                    const t = 1 - i / N;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, t * 4.5, 0, Math.PI * 2);
                    ctx.fillStyle = `${COLOR}${(t * 0.42).toFixed(2)})`;
                    ctx.fill();
                });
            }

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
            if (onMove) window.removeEventListener('mousemove', onMove);
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
