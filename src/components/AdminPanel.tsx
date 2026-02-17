import React, { useState, useEffect } from 'react';
import { User as UserIcon, ShieldCheck, Trash2, Edit2, Plus, Save, X, Settings } from 'lucide-react';
import type { User } from '../types/user';
import { cn } from '../lib/utils';

interface AdminPanelProps {
    users: User[];
    onUsersChange: () => void;
    onClose: () => void;
}

export function AdminPanel({ users, onUsersChange, onClose }: AdminPanelProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form States
    const [formData, setFormData] = useState<Partial<User>>({
        name: '',
        position: '',
        telegramId: undefined,
        telegramUsername: ''
    });

    const handleEdit = (user: User) => {
        setEditingId(user.id);
        setFormData({
            name: user.name,
            position: user.position || '',
            telegramId: user.telegramId,
            telegramUsername: user.telegramUsername || ''
        });
        setIsAdding(false);
    };

    const handleSave = async () => {
        console.log('Saving user:', formData);
        if (!formData.name) {
            console.error('Missing name');
            return;
        }

        try {
            if (editingId) {
                console.log('Updating existing user:', editingId);
                await fetch(`http://localhost:3001/api/users/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
            } else {
                console.log('Creating new user');
                await fetch('http://localhost:3001/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
            }
            onUsersChange();
            resetForm();
        } catch (err) {
            console.error('Failed to save user:', err);
        }
    };

    const handleDelete = async (id: string) => {
        // Removed confirm for now to unblock interaction
        try {
            await fetch(`http://localhost:3001/api/users/${id}`, {
                method: 'DELETE'
            });
            onUsersChange();
        } catch (err) {
            console.error('Failed to delete user:', err);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setIsAdding(false);
        setFormData({ name: '', position: '', telegramId: undefined, telegramUsername: '' });
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <Settings size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Управление пользователями</h2>
                        <p className="text-sm text-slate-500">Добавление и редактирование сотрудников</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="p-6">
                {!isAdding && !editingId && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="mb-6 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-600/20 transition-all active:scale-95"
                    >
                        <Plus size={18} />
                        Добавить сотрудника
                    </button>
                )}

                {(isAdding || editingId) && (
                    <div className="mb-8 p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                        <h3 className="font-semibold text-slate-700 mb-2">
                            {editingId ? 'Редактировать сотрудника' : 'Новый сотрудник'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Имя</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm"
                                    placeholder="Иван Иванов"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Должность</label>
                                <input
                                    type="text"
                                    value={formData.position}
                                    onChange={e => setFormData({ ...formData, position: e.target.value })}
                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm"
                                    placeholder="Менеджер"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Telegram ID (для бота)</label>
                                <input
                                    type="number"
                                    value={formData.telegramId || ''}
                                    onChange={e => setFormData({ ...formData, telegramId: Number(e.target.value) })}
                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm"
                                    placeholder="123456789"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Username</label>
                                <input
                                    type="text"
                                    value={formData.telegramUsername}
                                    onChange={e => setFormData({ ...formData, telegramUsername: e.target.value })}
                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm"
                                    placeholder="@username"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors shadow-sm"
                            >
                                <Save size={16} />
                                Сохранить
                            </button>
                            <button
                                onClick={resetForm}
                                className="flex items-center gap-2 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm transition-colors"
                            >
                                <X size={16} />
                                Отмена
                            </button>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    {users.map((user) => (
                        <div
                            key={user.id}
                            className={cn(
                                "flex items-center justify-between p-3 rounded-xl border border-slate-100 transition-all hover:border-slate-300",
                                editingId === user.id ? "bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500/20" : "bg-white"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                    <UserIcon size={20} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 text-sm">{user.name}</h4>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded">
                                            <ShieldCheck size={10} />
                                            {user.position || 'Без должности'}
                                        </span>
                                        {user.telegramUsername && (
                                            <span className="text-indigo-500 font-medium">{user.telegramUsername}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {!editingId && (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleEdit(user)}
                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                        title="Редактировать"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(user.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Удалить"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
