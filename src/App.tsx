import { useState, useEffect } from 'react';
import { useTodos } from './hooks/useTodos';
import { TodoInput } from './components/TodoInput';
import { TodoItem } from './components/TodoItem';
import { FilterBar } from './components/FilterBar';
import { ViewToggle, type ViewType } from './components/ViewToggle';
import { KanbanBoard } from './components/KanbanBoard';
import { LayoutList, Settings, LogOut } from 'lucide-react';
import DelegationTree from './components/DelegationTree';
import { AdminPanel } from './components/AdminPanel';
import { LoginPage } from './components/LoginPage';
import { cn } from './lib/utils';
import type { User } from './types/user';

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('task_tracker_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const {
    todos,
    addTodo,
    updateStatus,
    deleteTodo,
    editTodo,
    clearCompleted,
    filter,
    setFilter,
    stats,
    users,
    fetchUsers
  } = useTodos();

  const [view, setView] = useState<ViewType>('list');
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  const handleLogin = (loggedInUser: User, token: string) => {
    localStorage.setItem('task_tracker_token', token);
    localStorage.setItem('task_tracker_user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('task_tracker_token');
    localStorage.removeItem('task_tracker_user');
    setUser(null);
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (view) {
      case 'list':
        return (
          <div className="space-y-1 min-h-[100px]">
            {todos.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                {filter === 'all'
                  ? "Нет задач. Добавьте новую задачу выше!"
                  : `Задачи с фильтром "${filter}" не найдены.`}
              </div>
            ) : (
              todos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onStatusChange={updateStatus}
                  onDelete={deleteTodo}
                  onEdit={editTodo}
                />
              ))
            )}
          </div>
        );
      case 'board':
        return (
          <KanbanBoard
            todos={todos}
            onStatusChange={updateStatus}
            onDelete={deleteTodo}
            onEdit={editTodo}
            users={users}
          />
        );
      case 'tree':
        return <DelegationTree todos={todos} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20">

      {/* Modern Glass Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg shadow-md shadow-indigo-200 text-white transform hover:scale-105 transition-transform duration-200">
              <LayoutList size={22} className="stroke-[2.5]" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              Система Поручений
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <ViewToggle currentView={view} onViewChange={setView} />
            <div className="h-6 w-px bg-slate-200" />

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAdmin(!showAdmin)}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  showAdmin
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                )}
                title="Админ панель"
              >
                <Settings size={20} />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
                title="Выйти"
              >
                <LogOut size={20} />
              </button>
            </div>

          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {showAdmin ? (
          <AdminPanel
            users={users}
            onUsersChange={fetchUsers}
            onClose={() => setShowAdmin(false)}
          />
        ) : (
          <>
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-1">
              <TodoInput onAdd={addTodo} users={users} />
            </section>

            {view === 'list' && (
              <section className="sticky top-20 z-40 bg-slate-50/95 backdrop-blur-sm py-2">
                <FilterBar
                  currentFilter={filter}
                  onFilterChange={setFilter}
                  stats={stats}
                  onClearCompleted={clearCompleted}
                />
              </section>
            )}

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {renderContent()}
            </div>
          </>
        )}
      </main>

      <footer className="mt-12 text-center text-slate-400 text-sm">
        <p>Система управления поручениями &copy; {new Date().getFullYear()}</p>
        <p className="text-xs mt-1 text-slate-300">Вход выполнен: {user.name} ({user.username})</p>
      </footer>
    </div >
  );
}

export default App;
