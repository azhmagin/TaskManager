import { List, Kanban, Network } from 'lucide-react';
import { cn } from '../lib/utils';

export type ViewType = 'list' | 'board' | 'tree';

interface ViewToggleProps {
    currentView: ViewType;
    onViewChange: (view: ViewType) => void;
}

export function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
    return (
        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200/50">
            <button
                onClick={() => onViewChange('list')}
                className={cn(
                    "px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 text-sm font-medium",
                    currentView === 'list'
                        ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5"
                        : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                )}
                title="Список"
            >
                <List size={16} strokeWidth={2.5} />
                <span className="hidden sm:inline">Список</span>
            </button>
            <div className="w-px bg-slate-200 my-1 mx-0.5" />
            <button
                onClick={() => onViewChange('board')}
                className={cn(
                    "px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 text-sm font-medium",
                    currentView === 'board'
                        ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5"
                        : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                )}
                title="Доска"
            >
                <Kanban size={16} strokeWidth={2.5} />
                <span className="hidden sm:inline">Доска</span>
            </button>
            <div className="w-px bg-slate-200 my-1 mx-0.5" />
            <button
                onClick={() => onViewChange('tree')}
                className={cn(
                    "px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 text-sm font-medium",
                    currentView === 'tree'
                        ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5"
                        : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                )}
                title="Дерево"
            >
                <Network size={16} strokeWidth={2.5} />
                <span className="hidden sm:inline">Дерево</span>
            </button>
        </div>
    );
}
