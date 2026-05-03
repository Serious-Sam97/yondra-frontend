// Global virtual light source — normalized 0-1 coords.
// Updated by mouse position on desktop, device orientation on mobile.
// Shared across all card instances so every shadow shifts together.
export let lightX = 0.35;
export let lightY = 0.22;

let _mouseInit = false;
let _gyroInit  = false;

export function initLight(): void {
    if (_mouseInit || typeof window === 'undefined') return;
    _mouseInit = true;
    window.addEventListener('mousemove', (e) => {
        lightX = e.clientX / window.innerWidth;
        lightY = e.clientY / window.innerHeight;
    }, { passive: true });
}

function startGyroListening(): void {
    window.addEventListener('deviceorientation', (e: DeviceOrientationEvent) => {
        // gamma: left-right tilt (-90…90°)  → lightX
        // beta:  front-back tilt (-180…180°) → lightY (phone typically held 30-90°)
        const gamma = e.gamma ?? 0;
        const beta  = e.beta  ?? 0;
        lightX = Math.max(0, Math.min(1, (gamma + 45) / 90));
        lightY = Math.max(0, Math.min(1, (beta  - 20) / 70));
    }, { passive: true });
}

// Call once at startup — auto-starts on Android, waits for permission gesture on iOS 13+
export function initGyroscope(): void {
    if (_gyroInit || typeof window === 'undefined') return;
    _gyroInit = true;
    if (typeof (DeviceOrientationEvent as any).requestPermission !== 'function') {
        startGyroListening();
    }
    // iOS 13+: startGyroListening() called later via requestGyroscopePermission()
}

// Must be called inside a user-gesture handler (e.g. onTouchStart) on iOS 13+
export function requestGyroscopePermission(): void {
    if (typeof window === 'undefined') return;
    if (typeof (DeviceOrientationEvent as any).requestPermission !== 'function') return;
    (DeviceOrientationEvent as any).requestPermission()
        .then((state: string) => { if (state === 'granted') startGyroListening(); })
        .catch(() => {});
}

// Returns a box-shadow string derived from current light position.
// Cards call this on mouse-leave so every resting card shows a shadow
// that matches the shared light direction.
export function getLightShadow(intensity = 1): string {
    const sx = ((0.5 - lightX) * 14 * intensity).toFixed(1);
    const sy = ((0.22 - lightY) * 10 * intensity).toFixed(1);
    return `${sx}px ${sy}px 14px rgba(0,0,0,0.32), ${(+sx * 0.4).toFixed(1)}px ${(+sy * 0.4).toFixed(1)}px 5px rgba(0,0,0,0.16)`;
}
