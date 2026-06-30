'use client'

import { fetchUser, updateProfile, updatePassword, logout } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const AVATAR_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107', '#00BCD4', '#E91E63']
const STRIPE_COLORS = ['#9aa67e', '#ffb000', '#ff5a4d', '#6fe0ff', '#9aa67e', '#ffb000']

function initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function avatarColor(id: number): string {
    return AVATAR_COLORS[id % AVATAR_COLORS.length]
}

type Feedback = { type: 'success' | 'error'; message: string } | null

export default function ProfilePage() {
    const router = useRouter()
    const [user, setUser] = useState<{ id: number; name: string; email: string } | null>(null)

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [profileFeedback, setProfileFeedback] = useState<Feedback>(null)
    const [profileLoading, setProfileLoading] = useState(false)

    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null)
    const [passwordLoading, setPasswordLoading] = useState(false)

    useEffect(() => {
        fetchUser()
            .then(u => {
                setUser(u)
                setName(u.name)
                setEmail(u.email)
            })
            .catch(() => router.push('/login'))
    }, [])

    const handleProfileSave = async () => {
        setProfileFeedback(null)
        setProfileLoading(true)
        try {
            const updated = await updateProfile({ name, email })
            setUser(updated)
            setProfileFeedback({ type: 'success', message: 'Profile updated successfully.' })
        } catch (e: any) {
            setProfileFeedback({ type: 'error', message: e.message ?? 'Failed to update profile.' })
        } finally {
            setProfileLoading(false)
        }
    }

    const handlePasswordSave = async () => {
        setPasswordFeedback(null)
        if (newPassword !== confirmPassword) {
            setPasswordFeedback({ type: 'error', message: 'Passwords do not match.' })
            return
        }
        setPasswordLoading(true)
        try {
            await updatePassword({ current_password: currentPassword, password: newPassword, password_confirmation: confirmPassword })
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
            setPasswordFeedback({ type: 'success', message: 'Password updated successfully.' })
        } catch (e: any) {
            setPasswordFeedback({ type: 'error', message: e.message ?? 'Failed to update password.' })
        } finally {
            setPasswordLoading(false)
        }
    }

    const handleLogout = async () => {
        await logout()
        router.push('/login')
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--cf-phosphor)', borderTopColor: 'transparent' }}/>
            </div>
        )
    }

    const color = avatarColor(user.id)

    return (
        <div className="min-h-screen px-4 py-6 md:px-8 md:py-10 max-w-2xl mx-auto">

            {/* LED status strip */}
            <div className="flex gap-1.5 mb-6">
                {STRIPE_COLORS.map((c, i) => (
                    <div key={i} style={{ backgroundColor: c, boxShadow: `0 0 6px ${c}` }} className="h-1.5 flex-1 rounded-sm"/>
                ))}
            </div>

            {/* Back */}
            <button
                onClick={() => router.push('/dashboard')}
                className="cf-label mb-8 flex items-center gap-1 cursor-pointer transition-colors duration-150"
                style={{ color: 'var(--cf-text-muted)' }}
            >
                ← Back to boards
            </button>

            {/* Avatar + name */}
            <div className="flex items-center gap-5 mb-10">
                <div
                    style={{ backgroundColor: color, width: 72, height: 72, fontSize: 28, border: '2px solid var(--cf-edge)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.35)' }}
                    className="rounded-2xl flex items-center justify-center text-white font-bold flex-shrink-0 cf-mono"
                >
                    {initials(user.name)}
                </div>
                <div>
                    <p className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--cf-text)' }}>{user.name}</p>
                    <p className="text-sm mt-0.5 cf-mono" style={{ color: 'var(--cf-text-muted)' }}>{user.email}</p>
                </div>
            </div>

            <div className="flex flex-col gap-6">

                {/* Personal info */}
                <div className="glass-panel p-6 flex flex-col gap-5">
                    <p className="cf-label" style={{ color: 'var(--cf-phosphor)' }}>Personal info</p>

                    {profileFeedback && (
                        profileFeedback.type === 'success' ? (
                            <div
                                className="text-sm px-4 py-2 rounded-xl cf-mono"
                                style={{ background: 'rgba(154,166,126,0.14)', border: '1px solid var(--cf-phosphor)', color: 'var(--cf-phosphor)' }}
                            >
                                {profileFeedback.message}
                            </div>
                        ) : (
                            <div
                                className="text-sm px-4 py-2 rounded-xl cf-mono"
                                style={{ background: 'rgba(255,90,77,0.16)', border: '1px solid var(--cf-red)', color: 'var(--cf-red)' }}
                            >
                                {profileFeedback.message}
                            </div>
                        )
                    )}

                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="cf-label block mb-2">Name</label>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="glass-input"
                            />
                        </div>
                        <div>
                            <label className="cf-label block mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="glass-input"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleProfileSave}
                        disabled={profileLoading || (!name.trim() || !email.trim())}
                        className="aero-btn aero-btn--cyan self-end px-5 py-2.5"
                    >
                        {profileLoading ? 'Saving…' : 'Save changes'}
                    </button>
                </div>

                {/* Change password */}
                <div className="glass-panel p-6 flex flex-col gap-5">
                    <p className="cf-label" style={{ color: 'var(--cf-phosphor)' }}>Change password</p>

                    {passwordFeedback && (
                        passwordFeedback.type === 'success' ? (
                            <div
                                className="text-sm px-4 py-2 rounded-xl cf-mono"
                                style={{ background: 'rgba(154,166,126,0.14)', border: '1px solid var(--cf-phosphor)', color: 'var(--cf-phosphor)' }}
                            >
                                {passwordFeedback.message}
                            </div>
                        ) : (
                            <div
                                className="text-sm px-4 py-2 rounded-xl cf-mono"
                                style={{ background: 'rgba(255,90,77,0.16)', border: '1px solid var(--cf-red)', color: 'var(--cf-red)' }}
                            >
                                {passwordFeedback.message}
                            </div>
                        )
                    )}

                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="cf-label block mb-2">Current password</label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                placeholder="••••••••"
                                className="glass-input"
                            />
                        </div>
                        <div>
                            <label className="cf-label block mb-2">New password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                className="glass-input"
                            />
                        </div>
                        <div>
                            <label className="cf-label block mb-2">Confirm new password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="glass-input"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handlePasswordSave}
                        disabled={passwordLoading || (!currentPassword || !newPassword || !confirmPassword)}
                        className="aero-btn aero-btn--cyan self-end px-5 py-2.5"
                    >
                        {passwordLoading ? 'Updating…' : 'Update password'}
                    </button>
                </div>

                {/* Danger zone */}
                <div className="glass-panel p-6 flex items-center justify-between gap-4">
                    <div>
                        <p className="cf-label mb-1" style={{ color: 'var(--cf-phosphor)' }}>Session</p>
                        <p className="text-sm cf-mono" style={{ color: 'var(--cf-text-muted)' }}>Sign out from your account on this device.</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="aero-btn aero-btn--magenta px-4 py-2.5 flex-shrink-0"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    )
}
