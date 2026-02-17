import type { FilterType } from '../types/todo';
import { cn } from '../lib/utils';

interface FilterBarProps {
    currentFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
    stats: {
        total: number;
        active: number;
        completed: number;
    };
    onClearCompleted: () => void;
}

export function FilterBar({ currentFilter, onFilterChange, stats, onClearCompleted }: FilterBarProps) {
    const filters: { value: FilterType; label: string }[] = [
        { value: 'all', label: 'Все' },
        { value: 'active', label: 'Активные' },
        { value: 'completed', label: 'Завершенные' },
    ];

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 text-sm text-gray-500">
            <span>{stats.active} осталось</span>

            <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200/50 rounded-xl shadow-inner">
                {filters.map((filter) => (
                    <button
                        key={filter.value}
                        onClick={() => onFilterChange(filter.value)}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 relative",
                            currentFilter === filter.value
                                ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5"
                                : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                        )}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            <button
                onClick={onClearCompleted}
                className={cn(
                    "hover:text-gray-900 hover:underline transition-all",
                    stats.completed === 0 && "invisible"
                )}
            >
                Очистить завершенные
            </button>
        </div>
    );
}
