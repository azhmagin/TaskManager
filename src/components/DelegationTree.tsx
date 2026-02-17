import React from 'react';
import type { Todo } from '../types/todo';
import { Network, User as UserIcon, CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';

interface DelegationTreeProps {
    todos: Todo[];
}

const DelegationTree: React.FC<DelegationTreeProps> = ({ todos }) => {
    const [users, setUsers] = React.useState<any[]>([]);

    React.useEffect(() => {
        fetch('http://localhost:3001/api/users')
            .then(res => res.json())
            .then(data => setUsers(data))
            .catch(err => console.error('Failed to fetch users:', err));
    }, []);

    const getUserLabel = (name: string) => {
        if (!name) return 'Unassigned';
        const user = users.find(u => u.name === name);
        return user?.position ? `${name} (${user.position})` : name;
    };

    const rootTodos = todos.filter(t => !t.parentId);
    // ... rest of the component will use getUserLabel(name) ...

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'done': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'in-progress': return <Clock className="w-4 h-4 text-blue-500" />;
            case 'awaiting-approval': return <AlertCircle className="w-4 h-4 text-amber-500" />;
            default: return <Circle className="w-4 h-4 text-slate-300" />;
        }
    };

    const renderBranch = (parentId: string, depth: number = 0) => {
        const children = todos.filter(t => t.parentId === parentId);
        if (children.length === 0) return null;

        return (
            <div className="ml-6 mt-2 border-l border-slate-200 pl-4 space-y-4">
                {children.map(child => (
                    <div key={child.id} className="relative">
                        <div className="absolute -left-4 top-4 w-4 border-t border-slate-200" />
                        <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm transition-hover hover:border-blue-200">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-800">{child.text.replace('[Делегировано] ', '')}</h4>
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                            От: {getUserLabel(child.author || '')}
                                        </div>
                                        <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                        <div className="flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium border border-blue-100 shadow-sm">
                                            <UserIcon size={10} />
                                            Кому: {getUserLabel(child.assignee || '')}
                                        </div>
                                        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 ml-auto">
                                            {getStatusIcon(child.status)}
                                            {child.status}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {renderBranch(child.id, depth + 1)}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-4">
            {rootTodos.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <Network className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No delegation chains found</p>
                </div>
            ) : (
                rootTodos.map(root => (
                    <div key={root.id} className="bg-slate-50/50 rounded-xl p-4 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2 px-1">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                                <Network size={18} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">{root.text}</h3>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Коренное поручение</p>
                            </div>
                        </div>

                        <div className="mt-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm inline-block min-w-[320px] hover:border-indigo-200 transition-colors">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h4 className="text-base font-bold text-slate-900 mb-2">{root.text}</h4>
                                    <div className="flex flex-wrap items-center gap-3 mt-1">
                                        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                            Автор: {getUserLabel(root.author || '')}
                                        </div>
                                        <div className="flex items-center gap-1 text-[11px] bg-slate-50 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 shadow-sm">
                                            <UserIcon size={12} className="text-slate-400" />
                                            Ответственный: {getUserLabel(root.assignee || '')}
                                        </div>
                                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                            {getStatusIcon(root.status)}
                                            {root.status.toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {renderBranch(root.id)}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default DelegationTree;
