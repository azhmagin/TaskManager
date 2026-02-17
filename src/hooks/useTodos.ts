import { useState, useEffect } from 'react';
import type { Todo, FilterType, TodoStatus } from '../types/todo';
import type { User } from '../types/user';

export function useTodos() {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [filter, setFilter] = useState<FilterType>('all');

    // Fetch todos and users on load and start polling
    useEffect(() => {
        const fetchTodos = () => {
            fetch('/api/todos')
                .then(res => res.json())
                .then(data => setTodos(data))
                .catch(err => console.error("Failed to fetch todos:", err));
        };

        const fetchUsers = () => {
            fetch('/api/users')
                .then(res => res.json())
                .then(data => setUsers(data))
                .catch(err => console.error("Failed to fetch users:", err));
        };

        fetchTodos();
        fetchUsers();

        const interval = setInterval(() => {
            fetchTodos();
            fetchUsers();
        }, 5000); // Poll every 5 seconds

        return () => clearInterval(interval);
    }, []);

    const fetchUsers = () => {
        fetch('/api/users')
            .then(res => res.json())
            .then(data => setUsers(data))
            .catch(err => console.error("Failed to fetch users:", err));
    };

    const addTodo = (text: string, dueDate?: number, author?: string, assignee?: string) => {
        const newTodo: Todo = {
            id: crypto.randomUUID(),
            text,
            status: 'todo',
            createdAt: Date.now(),
            dueDate,
            author,
            assignee
        };

        // Optimistic update
        setTodos((prev) => [newTodo, ...prev]);

        fetch('/api/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTodo)
        }).catch(err => {
            console.error("Failed to add todo:", err);
            // Rollback on error could be added here
        });
    };

    const updateStatus = (id: string, status: TodoStatus) => {
        // Optimistic update
        setTodos((prev) =>
            prev.map((todo) =>
                todo.id === id ? { ...todo, status } : todo
            )
        );

        fetch(`/api/todos/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        }).catch(err => console.error("Failed to update status:", err));
    };

    const toggleTodo = (id: string) => {
        const todo = todos.find(t => t.id === id);
        if (!todo) return;
        const newStatus = todo.status === 'done' ? 'todo' : 'done';
        updateStatus(id, newStatus);
    };

    const deleteTodo = (id: string) => {
        setTodos((prev) => prev.filter((todo) => todo.id !== id));
        fetch(`/api/todos/${id}`, { method: 'DELETE' })
            .catch(err => console.error("Failed to delete todo:", err));
    };

    const editTodo = (id: string, newText: string, author?: string, assignee?: string) => {
        setTodos((prev) =>
            prev.map((todo) => (todo.id === id ? { ...todo, text: newText, author, assignee } : todo))
        );

        fetch(`/api/todos/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: newText, author, assignee })
        }).catch(err => console.error("Failed to edit todo:", err));
    };

    const clearCompleted = () => {
        const completedIds = todos.filter(t => t.status === 'done').map(t => t.id);
        setTodos((prev) => prev.filter((todo) => todo.status !== 'done'));

        // Delete each (or add bulk delete API)
        completedIds.forEach(id => {
            fetch(`/api/todos/${id}`, { method: 'DELETE' })
                .catch(err => console.error("Failed to delete completed todo:", err));
        });
    }

    const filteredTodos = todos.filter((todo) => {
        if (filter === 'active') return todo.status !== 'done';
        if (filter === 'completed') return todo.status === 'done';
        return true;
    });

    const stats = {
        total: todos.length,
        active: todos.filter(t => t.status !== 'done').length,
        completed: todos.filter(t => t.status === 'done').length
    }

    return {
        todos: filteredTodos,
        users,
        addTodo,
        updateStatus,
        toggleTodo,
        deleteTodo,
        editTodo,
        clearCompleted,
        filter,
        setFilter,
        stats,
        fetchUsers
    };
}
