import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

let echo: Echo<'reverb'> | null = null;

export function getEcho(): Echo<'reverb'> {
    if (echo) return echo;

    (window as Window & { Pusher?: typeof Pusher }).Pusher = Pusher;

    // TEMP DIAGNOSTIC: log pusher/reverb protocol traffic to the console.
    Pusher.logToConsole = true;

    echo = new Echo({
        broadcaster: 'reverb',
        key: process.env.NEXT_PUBLIC_REVERB_APP_KEY!,
        wsHost: process.env.NEXT_PUBLIC_REVERB_HOST!,
        wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080),
        wssPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080),
        forceTLS: (process.env.NEXT_PUBLIC_REVERB_SCHEME ?? 'http') === 'https',
        enabledTransports: ['ws', 'wss'],
        authEndpoint: `${process.env.NEXT_PUBLIC_API}/api/broadcasting/auth`,
        auth: {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
                Accept: 'application/json',
            },
        },
    });

    return echo;
}

export function disconnectEcho(): void {
    echo?.disconnect();
    echo = null;
}
