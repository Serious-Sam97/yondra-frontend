// Global virtual light source — normalized 0-1 coords, updated by mouse position.
// Shared across all card instances so every card's shadow shifts together as
// if lit by a single overhead lamp the user moves with their cursor.
export let lightX = 0.35;
export let lightY = 0.22;

let _initialized = false;

export function initLight(): void {
    if (_initialized || typeof window === 'undefined') return;
    _initialized = true;
    window.addEventListener('mousemove', (e) => {
        lightX = e.clientX / window.innerWidth;
        lightY = e.clientY / window.innerHeight;
    }, { passive: true });
}

// Returns a box-shadow string derived from current light position.
// Cards call this on mouse-leave so every resting card shows a shadow
// that matches the shared light direction.
export function getLightShadow(intensity = 1): string {
    const sx = ((0.5 - lightX) * 14 * intensity).toFixed(1);
    const sy = ((0.22 - lightY) * 10 * intensity).toFixed(1);
    return `${sx}px ${sy}px 14px rgba(0,0,0,0.32), ${(+sx * 0.4).toFixed(1)}px ${(+sy * 0.4).toFixed(1)}px 5px rgba(0,0,0,0.16)`;
}
