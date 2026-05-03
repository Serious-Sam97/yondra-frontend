'use client'

import { useEffect, useRef } from 'react';

const N       = 8;       // chain length
const K       = 0.28;    // spring stiffness
const DAMP    = 0.58;    // velocity damping
const COLOR   = 'rgba(200,176,96,';

export function SpringTrail() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        window.addEventListener('resize', resize);

        // Chain of spring points — each follows the one before it
        const pts = Array.from({ length: N }, () => ({
            x: window.innerWidth  / 2,
            y: window.innerHeight / 2,
            vx: 0, vy: 0,
        }));
        let mx = -999;
        let my = -999;
        let hasMoved = false;

        const onMove = (e: MouseEvent) => {
            mx = e.clientX;
            my = e.clientY;
            if (!hasMoved) {
                // Snap all points to cursor on first move — prevents initial center dot
                pts.forEach(p => { p.x = mx; p.y = my; p.vx = 0; p.vy = 0; });
                hasMoved = true;
            }
        };
        window.addEventListener('mousemove', onMove, { passive: true });

        let raf: number;
        const tick = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (!hasMoved) { raf = requestAnimationFrame(tick); return; }

            // Integrate spring chain
            pts[0].vx += (mx - pts[0].x) * K;
            pts[0].vy += (my - pts[0].y) * K;
            for (let i = 1; i < N; i++) {
                pts[i].vx += (pts[i - 1].x - pts[i].x) * K;
                pts[i].vy += (pts[i - 1].y - pts[i].y) * K;
            }
            pts.forEach(p => { p.vx *= DAMP; p.vy *= DAMP; p.x += p.vx; p.y += p.vy; });

            // Draw — front is large + opaque, tail is tiny + transparent
            pts.forEach((p, i) => {
                const t = 1 - i / N;
                ctx.beginPath();
                ctx.arc(p.x, p.y, t * 4.5, 0, Math.PI * 2);
                ctx.fillStyle = `${COLOR}${(t * 0.42).toFixed(2)})`;
                ctx.fill();
            });

            raf = requestAnimationFrame(tick);
        };
        tick();

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('mousemove', onMove);
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
