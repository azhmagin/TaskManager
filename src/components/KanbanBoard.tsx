import { TodoItem } from './TodoItem';
import type { Todo, TodoStatus } from '../types/todo';
import type { User } from '../types/user';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';

interface KanbanBoardProps {
    todos: Todo[];
    onStatusChange: (id: string, status: TodoStatus) => void;
    onDelete: (id: string) => void;
    onEdit: (id: string, newText: string) => void;
    users: User[];
}

export function KanbanBoard({ todos, onStatusChange, onDelete, onEdit, users }: KanbanBoardProps) {
    const columns: { id: TodoStatus; label: string; bg: string; text: string; border: string }[] = [
        { id: 'todo', label: 'Надо сделать', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
        { id: 'in-progress', label: 'В работе', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
        { id: 'awaiting-approval', label: 'На согласовании', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
        { id: 'on-hold', label: 'На паузе', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
        { id: 'done', label: 'Готово', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    ];

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;

        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        const newStatus = destination.droppableId as TodoStatus;
        onStatusChange(draggableId, newStatus);
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mt-8">
                {columns.map((col) => {
                    // Sort by createdAt desc (newest first) to maintain stable order
                    const colTodos = todos
                        .filter(t => t.status === col.id)
                        .sort((a, b) => b.createdAt - a.createdAt);

                    return (
                        <div key={col.id} className={`flex flex-col gap-3 p-2 rounded-2xl ${col.bg} border ${col.border}`}>
                            <div className="flex items-center justify-between px-2 py-1">
                                <h3 className={`font-bold text-xs uppercase tracking-wider ${col.text}`}>{col.label}</h3>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/50 backdrop-blur-sm shadow-sm ${col.text}`}>
                                    {colTodos.length}
                                </span>
                            </div>

                            <Droppable droppableId={col.id}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`flex-1 space-y-3 min-h-[150px] transition-colors rounded-xl ${snapshot.isDraggingOver ? 'bg-white/40 ring-2 ring-indigo-400/30' : ''
                                            }`}
                                    >
                                        {colTodos.map((todo, index) => (
                                            <Draggable key={todo.id} draggableId={todo.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        style={{
                                                            ...provided.draggableProps.style,
                                                            opacity: snapshot.isDragging ? 0.8 : 1,
                                                        }}
                                                    >
                                                        <TodoItem
                                                            todo={todo}
                                                            onStatusChange={onStatusChange}
                                                            onDelete={onDelete}
                                                            onEdit={onEdit}
                                                            viewMode="board"
                                                            users={users}
                                                        />
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    );
                })}
            </div>
        </DragDropContext>
    );
}
