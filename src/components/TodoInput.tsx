import React, { useState } from 'react';
import { Plus, User as UserIcon, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import type { User } from '../types/user';

interface TodoInputProps {
    onAdd: (text: string, dueDate?: number, author?: string, assignee?: string) => void;
    users: User[];
}

export function TodoInput({ onAdd, users }: TodoInputProps) {
    const [text, setText] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [author, setAuthor] = useState('');
    const [assignee, setAssignee] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            onAdd(text.trim(), dueDate ? new Date(dueDate).getTime() : undefined, author.trim(), assignee.trim());
            setText('');
            setDueDate('');
            setAuthor('');
            setAssignee('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mb-8">
            <div className="group bg-white rounded-2xl shadow-sm border border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all duration-300">
                {/* Main Text Input */}
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Что нужно сделать?"
                    className="w-full px-5 pt-4 pb-2 text-lg bg-transparent border-none outline-none placeholder:text-slate-400 text-slate-800"
                />

                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-3 pb-3 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Date Picker */}
                        <div className="relative">
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className={cn(
                                    "pl-2 pr-1 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-medium text-slate-600 border border-transparent focus:border-indigo-500 focus:bg-white transition-all outline-none cursor-pointer",
                                    dueDate && "bg-indigo-50 text-indigo-600 border-indigo-200"
                                )}
                            />
                        </div>

                        <div className="w-px h-4 bg-slate-200 mx-1 hidden sm:block" />

                        {/* Author Select */}
                        <div className="relative group/select">
                            <select
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                className={cn(
                                    "pl-7 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-medium text-slate-600 border border-transparent focus:border-indigo-500 focus:bg-white transition-all outline-none appearance-none cursor-pointer min-w-[100px]",
                                    author && "bg-indigo-50 text-indigo-600 border-indigo-200"
                                )}
                            >
                                <option value="">Автор</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.name}>{u.name}</option>
                                ))}
                            </select>
                            <UserIcon className={cn("absolute left-2 top-2 text-slate-400 pointer-events-none transition-colors", author && "text-indigo-500")} size={12} />
                        </div>

                        {/* Assignee Select */}
                        <div className="relative group/select">
                            <select
                                value={assignee}
                                onChange={(e) => setAssignee(e.target.value)}
                                className={cn(
                                    "pl-7 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-medium text-slate-600 border border-transparent focus:border-indigo-500 focus:bg-white transition-all outline-none appearance-none cursor-pointer min-w-[120px]",
                                    assignee && "bg-indigo-50 text-indigo-600 border-indigo-200"
                                )}
                            >
                                <option value="">Исполнитель</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.name}>{u.name}</option>
                                ))}
                            </select>
                            <ShieldCheck className={cn("absolute left-2 top-2 text-slate-400 pointer-events-none transition-colors", assignee && "text-indigo-500")} size={12} />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={!text.trim()}
                        className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-600/20 active:scale-95 hover:shadow-lg hover:shadow-indigo-600/30 flex-shrink-0 ml-auto"
                    >
                        <Plus size={20} strokeWidth={3} />
                    </button>
                </div>
            </div>
        </form>
    );
}
