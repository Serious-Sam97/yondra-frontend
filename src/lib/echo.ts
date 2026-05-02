import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

let echo: Echo | null = null;

export function getEcho(): Echo {
    if (echo) return echo;

    (window as any).Pusher = Pusher;

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
