// Cursor gravity field — cards within RADIUS px are gently pulled toward the cursor.
// Uses the CSS `translate` property (distinct from `transform`) so it composes
// cleanly with the card's 3-D tilt transform without any conflicts.

const RADIUS   = 220;   // attraction range in pixels
const STRENGTH = 5.5;   // max pull distance in px (at closest point)
const LERP     = 0.10;  // smoothing factor — lower = more sluggish

let _mx      = -9999;
let _my      = -9999;
let _running = false;

type Vec2 = { x: number; y: number };
const _offsets = new WeakMap<HTMLElement, Vec2>();

export function initGravityField(): void {
    if (_running || typeof window === 'undefined') return;
    // Only run on fine-pointer (mouse) devices — gravity is meaningless on touch
    if (window.matchMedia('(pointer: coarse)').matches) return;
    _running = true;

    window.addEventListener('mousemove', e => { _mx = e.clientX; _my = e.clientY; }, { passive: true });

    function tick() {
        requestAnimationFrame(tick);

        const cards = document.querySelectorAll<HTMLElement>('.sticky-note');
        cards.forEach(el => {
            const rect = el.getBoundingClientRect();
            const cx   = rect.left + rect.width  / 2;
            const cy   = rect.top  + rect.height / 2;
            const dx   = _mx - cx;
            const dy   = _my - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let tx = 0, ty = 0;
            if (dist > 0 && dist < RADIUS) {
                // Quadratic falloff — nearest cards feel strongest pull
                const s = Math.pow(1 - dist / RADIUS, 2) * STRENGTH;
                tx = (dx / dist) * s;
                ty = (dy / dist) * s;
            }

            const prev = _offsets.get(el) ?? { x: 0, y: 0 };
            const nx = prev.x + (tx - prev.x) * LERP;
            const ny = prev.y + (ty - prev.y) * LERP;

            // Skip DOM write when nothing is moving (saves paint cost)
            if (Math.abs(nx - prev.x) < 0.008 && Math.abs(ny - prev.y) < 0.008 &&
                Math.abs(nx) < 0.01  && Math.abs(ny) < 0.01) return;

            _offsets.set(el, { x: nx, y: ny });
            el.style.translate = `${nx.toFixed(2)}px ${ny.toFixed(2)}px`;
        });
    }
    tick();
}
