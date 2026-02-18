import { useState } from 'react';
import type { User } from '../types/user';
import { LogIn, Key } from 'lucide-react';

interface LoginPageProps {
    onLogin: (user: User, token: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Check if user needs to change password
    const [mustChange, setMustChange] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [tempToken, setTempToken] = useState<string | null>(null);
    const [tempUser, setTempUser] = useState<User | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Login failed');
            }

            if (data.user.mustChangePassword) {
                setMustChange(true);
                setTempToken(data.token);
                setTempUser(data.user);
                setLoading(false);
                return;
            }

            onLogin(data.user, data.token);
        } catch (err: any) {
            setError(err.message);
        } finally {
            if (!mustChange) setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/change-password', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tempToken}`
                },
                body: JSON.stringify({ newPassword })
            });

            if (!res.ok) {
                throw new Error('Failed to change password');
            }

            // Success! Log the user in with updated user object
            if (tempUser && tempToken) {
                 const updatedUser = { ...tempUser, mustChangePassword: false };
                 onLogin(updatedUser, tempToken);
            }

        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    if (mustChange) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                    <div className="bg-amber-500 p-8 text-center">
                         <div className="mx-auto w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
                            <Key className="text-white w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Смена пароля</h2>
                        <p className="text-amber-100">Необходимо задать новый пароль</p>
                    </div>

                    <form onSubmit={handleChangePassword} className="p-8 space-y-6">
                         {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                             <label className="text-sm font-medium text-slate-700">Новый пароль</label>
                             <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                                placeholder="Минимум 6 символов"
                                minLength={6}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/30 disabled:opacity-50"
                        >
                            {loading ? 'Сохранение...' : 'Установить пароль'}
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            {/* Same login form as before... actually I should keep the container and just swap content or return different JSX */}
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="bg-indigo-600 p-8 text-center">
                    <div className="mx-auto w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
                        <LogIn className="text-white w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Вход в систему</h2>
                    <p className="text-indigo-100">Введите данные для доступа</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Имя пользователя</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            placeholder="admin"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Пароль</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Вход...' : 'Войти'}
                    </button>
                </form>

                <div className="p-4 bg-slate-50 text-center text-xs text-slate-400 border-t border-slate-100">
                    <p>По умолчанию: admin / admin</p>
                </div>
            </div>
        </div>
    );
}
