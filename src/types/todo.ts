export type TodoStatus = 'todo' | 'in-progress' | 'on-hold' | 'awaiting-approval' | 'done';

export interface Todo {
    id: string;
    text: string;
    status: TodoStatus;
    createdAt: number;
    dueDate?: number;
    author?: string;
    assignee?: string;
    report?: string;
    parentId?: string;
    rootId?: string;
}

export type FilterType = 'all' | 'active' | 'completed';
