'use client'

import { apiFetch, clearAuth } from "./api";

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

export async function fetchUser(signal?: AbortSignal) {
    return await apiFetch(`/api/user`, { method: 'GET', signal });
}

export async function fetchBoards() {
    return await apiFetch(`/api/boards`, { method: 'GET' });
}

export async function updateProfile(data: { name: string; email: string }) {
    return await apiFetch('/api/user', { method: 'PUT', body: JSON.stringify(data) });
}

export async function updatePassword(data: { current_password: string; password: string; password_confirmation: string }) {
    return await apiFetch('/api/user/password', { method: 'PUT', body: JSON.stringify(data) });
}

export async function logout() {
    try {
        await apiFetch('/api/logout', { method: 'POST' });
    } catch {
        // The token may already be expired or revoked — clearing local state is what matters.
    } finally {
        clearAuth();
    }
}

export async function forgotPassword(email: string) {
    await apiFetch('/api/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
    });
}

export async function resetPassword(token: string, email: string, password: string, passwordConfirmation: string) {
    await apiFetch('/api/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, email, password, password_confirmation: passwordConfirmation })
    });
}
