const express = require('express');
const cors = require('cors');
const path = require('path');
const { initBot, getTaskButtons, sendToTeams } = require('./bot');
const { readTodos, writeTodos, readUsers, writeUsers, getUserBySystemName } = require('./db');
require('dotenv').config();

const app = express();
const PORT = 3001;

// Init middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Init Telegram Bot
const bot = initBot();

// REST API
app.get('/api/todos', async (req, res) => {
    const todos = await readTodos();
    res.json(todos);
});

app.post('/api/todos', async (req, res) => {
    const newTodo = req.body;
    const todos = await readTodos();
    todos.unshift(newTodo);
    await writeTodos(todos);

    if (bot) {
        const buttons = getTaskButtons(newTodo);
        const options = { parse_mode: 'Markdown' };
        if (buttons) {
            options.reply_markup = { inline_keyboard: buttons };
        }

        let message = `🆕 Новая задача: *${newTodo.text}*`;
        if (newTodo.author) message += `\n👤 Автор: ${newTodo.author}`;
        if (newTodo.assignee) message += `\n🛠 Исполнитель: ${newTodo.assignee}`;

        const assigneeUser = await getUserBySystemName(newTodo.assignee);
        if (assigneeUser && assigneeUser.telegramId) {
            bot.sendMessage(assigneeUser.telegramId, message, options)
                .catch(err => console.error('Telegram Send Error:', err.message));
        }

        // Teams Notification
        sendToTeams(
            "🆕 Новое поручение",
            `**Задача**: ${newTodo.text}\n\n**Автор**: ${newTodo.author || '---'}\n**Исполнитель**: ${newTodo.assignee || '---'}`,
            "2563eb"
        );
    }
    res.json(newTodo);
});

app.patch('/api/todos/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const todos = await readTodos();
    const index = todos.findIndex(t => t.id === id);

    if (index !== -1) {
        const prevStatus = todos[index].status;
        todos[index] = { ...todos[index], ...updates };
        await writeTodos(todos);

        // Notify on status/assignee change
        if (bot && (updates.status || updates.assignee)) {
            const todo = todos[index];
            const statusEmoji = { 'todo': '📝', 'in-progress': '🚧', 'on-hold': '⏸️', 'done': '✅' };
            const statusTexts = { 'todo': 'Надо сделать', 'in-progress': 'В работе', 'on-hold': 'На паузе', 'done': 'Готово' };

            // Don't spam on awaiting-approval (it has its own notifications)
            if (updates.status !== 'awaiting-approval' && updates.status !== prevStatus) {
                let message = `${statusEmoji[todo.status] || '🔄'} Статус изменен: *${todo.text}*\n`;
                message += `Новый статус: *${statusTexts[todo.status] || todo.status.toUpperCase()}*`;
                if (todo.assignee) message += `\n🛠 Исполнитель: ${todo.assignee}`;

                // Notify both Author and Assignee
                const recipients = new Set();
                const authorUser = await getUserBySystemName(todo.author);
                const assigneeUser = await getUserBySystemName(todo.assignee);

                if (authorUser && authorUser.telegramId) recipients.add(authorUser.telegramId);
                if (assigneeUser && assigneeUser.telegramId) recipients.add(assigneeUser.telegramId);

                recipients.forEach(chatId => {
                    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
                        .catch(err => console.error('Telegram Notify Error:', err.message));
                });

                // Teams Notification
                const teamsColor = todo.status === 'done' ? "22c55e" : "eab308";
                sendToTeams(
                    `🔄 Изменение статуса: ${statusTexts[todo.status] || todo.status}`,
                    `**Задача**: ${todo.text}\n**Исполнитель**: ${todo.assignee || '---'}`,
                    teamsColor
                );
            }
        }

        res.json(todos[index]);
    } else {
        res.status(404).json({ error: 'Task not found' });
    }
});

app.delete('/api/todos/:id', async (req, res) => {
    const { id } = req.params;
    let todos = await readTodos();
    todos = todos.filter(t => t.id !== id);
    await writeTodos(todos);
    res.json({ success: true });
});

// Users API
app.get('/api/users', async (req, res) => {
    const users = await readUsers();
    res.json(users);
});

app.post('/api/users', async (req, res) => {
    const newUser = { id: `u_${Date.now()}`, ...req.body };
    const users = await readUsers();
    users.push(newUser);
    await writeUsers(users);
    res.json(newUser);
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const users = await readUsers();
    const index = users.findIndex(u => u.id === id);

    if (index !== -1) {
        users[index] = { ...users[index], ...updates };
        await writeUsers(users);
        res.json(users[index]);
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    let users = await readUsers();
    users = users.filter(u => u.id !== id);
    await writeUsers(users);
    res.json({ success: true });
});

// SPA Fallback
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
