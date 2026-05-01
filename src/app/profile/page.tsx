'use client'

import { fetchUser, updateProfile, updatePassword, logout } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const AVATAR_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107', '#00BCD4', '#E91E63']
const STRIPE_COLORS = ['#4CAF50', '#FFC107', '#FF9800', '#F44336', '#7B1FA2', '#1976D2']

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
                <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"/>
            </div>
        )
    }

    const color = avatarColor(user.id)

    return (
        <div className="min-h-screen px-4 py-6 md:px-8 md:py-10 max-w-2xl mx-auto">

            {/* Rainbow stripe */}
            <div className="flex gap-1 mb-6">
                {STRIPE_COLORS.map(c => (
                    <div key={c} style={{ backgroundColor: c }} className="h-1 flex-1 rounded-full"/>
                ))}
            </div>

            {/* Back */}
            <button
                onClick={() => router.push('/dashboard')}
                className="text-xs uppercase tracking-widest text-gray-500 hover:text-gray-300 mb-8 flex items-center gap-1 cursor-pointer transition-colors duration-150"
            >
                ← Back to boards
            </button>

            {/* Avatar + name */}
            <div className="flex items-center gap-5 mb-10">
                <div
                    style={{ backgroundColor: color, width: 72, height: 72, fontSize: 28 }}
                    className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg"
                >
                    {initials(user.name)}
                </div>
                <div>
                    <p className="text-2xl md:text-3xl font-bold text-white">{user.name}</p>
                    <p className="text-gray-500 text-sm mt-0.5">{user.email}</p>
                </div>
            </div>

            <div className="flex flex-col gap-6">

                {/* Personal info */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-5">
                    <p className="text-xs uppercase tracking-widest text-gray-500">Personal Info</p>

                    {profileFeedback && (
                        <div className={`text-sm px-4 py-2 rounded-lg border ${
                            profileFeedback.type === 'success'
                                ? 'bg-green-500/10 border-green-500/40 text-green-400'
                                : 'bg-red-500/10 border-red-500/40 text-red-400'
                        }`}>
                            {profileFeedback.message}
                        </div>
                    )}

                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Name</label>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="bg-gray-800 border border-gray-700 px-3 py-2.5 rounded-lg w-full text-white focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="bg-gray-800 border border-gray-700 px-3 py-2.5 rounded-lg w-full text-white focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleProfileSave}
                        disabled={profileLoading || (!name.trim() || !email.trim())}
                        className="self-end text-xs uppercase tracking-widest font-bold px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all duration-150"
                    >
                        {profileLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                {/* Change password */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-5">
                    <p className="text-xs uppercase tracking-widest text-gray-500">Change Password</p>

                    {passwordFeedback && (
                        <div className={`text-sm px-4 py-2 rounded-lg border ${
                            passwordFeedback.type === 'success'
                                ? 'bg-green-500/10 border-green-500/40 text-green-400'
                                : 'bg-red-500/10 border-red-500/40 text-red-400'
                        }`}>
                            {passwordFeedback.message}
                        </div>
                    )}

                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Current Password</label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                placeholder="••••••••"
                                className="bg-gray-800 border border-gray-700 px-3 py-2.5 rounded-lg w-full text-white focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                className="bg-gray-800 border border-gray-700 px-3 py-2.5 rounded-lg w-full text-white focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="bg-gray-800 border border-gray-700 px-3 py-2.5 rounded-lg w-full text-white focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handlePasswordSave}
                        disabled={passwordLoading || (!currentPassword || !newPassword || !confirmPassword)}
                        className="self-end text-xs uppercase tracking-widest font-bold px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all duration-150"
                    >
                        {passwordLoading ? 'Updating...' : 'Update Password'}
                    </button>
                </div>

                {/* Danger zone */}
                <div className="bg-gray-900 border border-red-900/40 rounded-2xl p-6 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Session</p>
                        <p className="text-sm text-gray-400">Sign out from your account on this device.</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-xs uppercase tracking-widest font-bold px-4 py-2.5 rounded-lg border border-red-700 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-600 cursor-pointer transition-all duration-150 flex-shrink-0"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    )
}
