'use client'

import { apiFetch } from "./api";

export async function register(name: string, email: string, password: string, passwordConfirmation: string) {
    const data = await apiFetch(`/api/register`, {
        method: 'POST',
        body: JSON.stringify({ name, email, password, password_confirmation: passwordConfirmation })
    });

    localStorage.setItem('token', data.token);
    localStorage.setItem('isLogged', 'true');
}

export async function login(email: string, password: string) {
    const data = await apiFetch(`/api/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });

    localStorage.setItem('token', data.token);
    localStorage.setItem('isLogged', 'true');
}

export async function fetchUser() {
    return await apiFetch(`/api/user`, { method: 'GET' });
}

export async function fetchBoards() {
    return await apiFetch(`/api/boards`, { method: 'GET' });
}

export async function logout() {
    await apiFetch('/api/logout', { method: 'POST' });
    localStorage.removeItem('token');
    localStorage.setItem('isLogged', 'false');
}
