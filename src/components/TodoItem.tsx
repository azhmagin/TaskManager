
import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Edit2, Check, Calendar, Clock } from 'lucide-react';
import type { Todo, TodoStatus } from '../types/todo';
import type { User } from '../types/user';
import { cn } from '../lib/utils';

interface TodoItemProps {
    todo: Todo;
    onStatusChange: (id: string, status: TodoStatus) => void;
    onDelete: (id: string) => void;

    onEdit: (id: string, newText: string, author?: string, assignee?: string) => void;
    viewMode?: 'list' | 'board';
    users?: User[];
}

export function TodoItem({ todo, onStatusChange, onDelete, onEdit, viewMode = 'list', users = [] }: TodoItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(todo.text);
    const inputRef = useRef<HTMLInputElement>(null);

    const getUserLabel = (name: string) => {
        if (!name) return name;
        const user = users.find(u => u.name === name);
        return user?.position ? `${name} (${user.position})` : name;
    };

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (editText.trim()) {
            onEdit(todo.id, editText.trim(), todo.author, todo.assignee);
            setIsEditing(false);
        } else {
            setEditText(todo.text);
            setIsEditing(false);
        }
    };

    const handleCancel = () => {
        setEditText(todo.text);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') handleCancel();
    };

    const isOverdue = todo.dueDate && todo.dueDate < new Date().setHours(0, 0, 0, 0) && todo.status !== 'done';
    const isDueToday = todo.dueDate && new Date(todo.dueDate).toDateString() === new Date().toDateString() && todo.status !== 'done';

    const statusColors: Record<TodoStatus, string> = {
        'todo': 'bg-slate-100 text-slate-600 ring-slate-500/10',
        'in-progress': 'bg-blue-50 text-blue-700 ring-blue-700/10',
        'on-hold': 'bg-amber-50 text-amber-700 ring-amber-700/10',
        'awaiting-approval': 'bg-purple-50 text-purple-700 ring-purple-700/10',
        'done': 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
    };

    // Board View Layout
    if (viewMode === 'board') {
        return (
            <div
                className={cn(
                    "group relative p-3 mb-3 bg-white rounded-xl shadow-sm border transition-all hover:shadow-md flex flex-col gap-2",
                    todo.status === 'done' ? "bg-gray-50 opacity-75 border-gray-100" : "border-gray-100",
                    isOverdue && "border-red-200 bg-red-50/30"
                )}
            >
                <div className="flex justify-between items-start gap-3">
                    {isEditing ? (
                        <textarea
                            ref={inputRef as any}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleSave}
                            className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            rows={2}
                        />
                    ) : (
                        <span className={cn("text-slate-700 text-sm font-medium leading-relaxed", todo.status === 'done' && "line-through text-slate-400")}>
                            {todo.text}
                        </span>
                    )}

                    <div className="opacity-0 group-hover:opacity-100 transition-all absolute top-2 right-2 flex bg-white rounded-lg shadow-sm border border-slate-100 p-1 gap-1">
                        <button onClick={() => setIsEditing(true)} className="p-1 hover:bg-slate-50 rounded text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => onDelete(todo.id)} className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center mt-1">
                    {isOverdue && (
                        <span className="flex items-center gap-1 text-[10px] text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded">
                            <Clock size={10} />
                            Просрочено
                        </span>
                    )}
                    {isDueToday && (
                        <span className="flex items-center gap-1 text-[10px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded">
                            <Clock size={10} />
                            Сегодня
                        </span>
                    )}
                    {(todo.dueDate && !isOverdue && !isDueToday) && (
                        <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                            <Calendar size={10} />
                            {new Date(todo.dueDate).toLocaleDateString()}
                        </span>
                    )}
                    {todo.author && (
                        <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded" title="Автор">
                            👤 {getUserLabel(todo.author)}
                        </span>
                    )}
                    {todo.assignee && (
                        <span className="flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded" title="Исполнитель">
                            🛠 {getUserLabel(todo.assignee)}
                        </span>
                    )}
                </div>

                {todo.report && (
                    <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-100 text-[10px] text-gray-600 italic">
                        📝 {todo.report}
                    </div>
                )}

                <div className="flex items-center justify-between mt-1">
                    {/* Spacer/Date place holder if needed, or just justify-end */}
                    <div></div>

                    <div className="flex items-center gap-1">
                        <select
                            value={todo.status}
                            onChange={(e) => onStatusChange(todo.id, e.target.value as TodoStatus)}
                            className="text-[10px] bg-gray-50 border rounded p-0.5 max-w-[80px]"
                        >
                            <option value="todo">Надо</option>
                            <option value="in-progress">В работе</option>
                            <option value="awaiting-approval">Проверка</option>
                            <option value="on-hold">Пауза</option>
                            <option value="done">Готово</option>
                        </select>
                        <button
                            onClick={() => onStatusChange(todo.id, todo.status === 'done' ? 'todo' : 'done')}
                            className={cn(
                                "w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200",
                                todo.status === 'done'
                                    ? "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/30"
                                    : "border-slate-300 hover:border-emerald-500 text-transparent"
                            )}
                        >
                            <Check size={10} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // List View Layout (Original with fixes)
    return (
        <div
            className={cn(
                "group flex items-start gap-4 p-5 mb-3 bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/50 hover:shadow-md hover:ring-slate-300/80 transition-all duration-200",
                todo.status === 'done' ? "bg-slate-50/80 opacity-60" : "bg-white",
                isOverdue && "ring-red-200 bg-red-50/30"
            )}
        >
            <div className="pt-1">
                <button
                    onClick={() => onStatusChange(todo.id, todo.status === 'done' ? 'todo' : 'done')}
                    className={cn(
                        "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                        todo.status === 'done'
                            ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-110"
                            : "border-slate-300 hover:border-emerald-500 text-transparent hover:bg-emerald-50"
                    )}
                >
                    <Check size={14} strokeWidth={3} />
                </button>
            </div>

            <div className="flex flex-col flex-1 min-w-0 mr-2">
                {isEditing ? (
                    <div className="flex flex-col gap-2 w-full">
                        <input
                            ref={inputRef}
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full px-3 py-2 text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                        <div className="flex gap-2">
                            <select
                                value={todo.author || ''}
                                onChange={(e) => onEdit(todo.id, todo.text, e.target.value, todo.assignee)}
                                className="flex-1 text-[10px] p-1 bg-white border border-gray-200 rounded outline-none"
                            >
                                <option value="">👤 Автор</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.name}>{u.name}</option>
                                ))}
                            </select>
                            <select
                                value={todo.assignee || ''}
                                onChange={(e) => onEdit(todo.id, todo.text, todo.author, e.target.value)}
                                className="flex-1 text-[10px] p-1 bg-white border border-gray-200 rounded outline-none"
                            >
                                <option value="">🛠 Исполнитель</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.name}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 min-w-0 w-full">
                        <span
                            className={cn(
                                "flex-1 min-w-0 text-gray-800 text-lg transition-all truncate",
                                todo.status === 'done' && "text-gray-400 line-through decoration-gray-300"
                            )}
                        >
                            {todo.text}
                        </span>
                        {todo.status !== 'done' && todo.status !== 'todo' && (
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ring-1", statusColors[todo.status])}>
                                {todo.status === 'in-progress' ? 'В работе' : todo.status === 'on-hold' ? 'На паузе' : todo.status === 'awaiting-approval' ? 'На проверке' : todo.status}
                            </span>
                        )}
                    </div>
                )}

                {todo.report && (
                    <div className="mt-2 text-xs text-slate-500 italic pl-3 border-l-2 border-slate-200">
                        Отчет: {todo.report}
                    </div>
                )}

                <div className="flex flex-wrap gap-2 mt-2 items-center">
                    {todo.dueDate && todo.status !== 'done' && (
                        <div className={cn(
                            "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border",
                            isOverdue
                                ? "bg-red-50 text-red-600 border-red-100"
                                : isDueToday
                                    ? "bg-amber-50 text-amber-600 border-amber-100"
                                    : "bg-slate-50 text-slate-500 border-slate-100"
                        )}>
                            <Calendar size={13} className="opacity-70" />
                            <span>
                                {isOverdue ? "Просрочено " : isDueToday ? "Сегодня " : ""}
                                {new Date(todo.dueDate).toLocaleDateString()}
                            </span>
                        </div>
                    )}
                    {todo.author && (
                        <span className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md" title="Автор">
                            👤 {getUserLabel(todo.author)}
                        </span>
                    )}
                    {todo.assignee && (
                        <span className="flex items-center gap-1.5 text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-md" title="Исполнитель">
                            🛠 {getUserLabel(todo.assignee)}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 ml-2 opacity-0 group-hover:opacity-100 transition-opacity desktop:opacity-0 mobile:opacity-100">
                {!isEditing && (
                    <>
                        {/* Simple status cycler for quick access */}
                        <select
                            value={todo.status}
                            onChange={(e) => onStatusChange(todo.id, e.target.value as TodoStatus)}
                            className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none text-slate-600 hover:text-slate-900 transition-colors"
                        >
                            <option value="todo">Надо</option>
                            <option value="in-progress">В работе</option>
                            <option value="awaiting-approval">На проверке</option>
                            <option value="on-hold">Пауза</option>
                            <option value="done">Готово</option>
                        </select>

                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                        >
                            <Edit2 size={18} />
                        </button>
                        <button
                            onClick={() => onDelete(todo.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                        >
                            <Trash2 size={18} />
                        </button>
                    </>
                )}
            </div>
        </div >
    );
}

