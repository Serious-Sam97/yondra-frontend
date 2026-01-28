'use client'

import { apiFetch } from "./api";

async function getCSRF(){
    await apiFetch('/sanctum/csrf-cookie', {
        method: 'GET'
    })
}

export async function login(email: string, password: string) {
    await getCSRF()

    await apiFetch(`/login`, {
        method: 'POST',
        body: JSON.stringify({email, password})
    })

    localStorage.setItem('isLogged', 'true');

    return 
}

export async function fetchUser() {
    return await apiFetch(`/api/user`, {
        method: 'GET'
    })
}

export async function fetchBoards() {
    return await apiFetch(`/api/boards`, {
        method: 'GET'
    })
}

export async function logout() {
    localStorage.setItem('isLogged', 'false');

    await apiFetch('/logout', {
        method: 'POST'
    })
}