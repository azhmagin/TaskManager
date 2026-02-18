const TelegramBot = require('node-telegram-bot-api');
const { readTodos, writeTodos, readUsers, writeUsers, getUserBySystemName } = require('./db');
require('dotenv').config();

// Memory for tracking users waiting for input
// userState: Map<userId, { step: 'NAME'|'POSITION'|'REPORT'|'CREATE_TEXT', data: any }>
const userState = new Map();

// Helper to send rich notifications to MS Teams
async function sendToTeams(title, message, color = "7467ef") {
    const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
    if (!webhookUrl || webhookUrl === 'your_webhook_url_here' || webhookUrl === '') {
        return;
    }

    try {
        const payload = {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": color,
            "summary": title,
            "sections": [{
                "activityTitle": title,
                "text": message,
                "markdown": true
            }]
        };

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error('Teams Webhook Error:', await response.text());
        }
    } catch (error) {
        console.error('Teams Notification Failed:', error.message);
    }
}

function getTaskButtons(todo) {
    if (todo.status === 'done' || todo.status === 'awaiting-approval') return null;

    const buttons = [];

    // If task is not started, anyone can "Take" it (becomes assignee)
    if (todo.status === 'todo' || todo.status === 'on-hold') {
        buttons.push([{
            text: '🖐 Взять в работу',
            callback_data: JSON.stringify({ a: 'take', i: todo.id.substring(0, 8) })
        }]);
    }

    // If task is in progress, show "Done" button (only for current assignee)
    if (todo.status === 'in-progress') {
        buttons.push([{
            text: '✅ Отправить отчет',
            callback_data: JSON.stringify({ a: 'done', i: todo.id.substring(0, 8) })
        }]);

        // Add Delegate button
        buttons.push([{
            text: '👨‍💼 Делегировать',
            callback_data: JSON.stringify({ a: 'dlg', i: todo.id.substring(0, 8) })
        }]);
    }

    return buttons.length > 0 ? buttons : null;
}

let bot = null;

function initBot() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || token === 'your_bot_token_here') {
        console.log('Telegram Bot Token not set, bot disabled.');
        return null;
    }

    bot = new TelegramBot(token, { polling: true });

    // Handle /start
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const tgId = msg.from.id;

        const users = await readUsers();
        const user = users.find(u => u.telegramId === tgId);

        if (user) {
            bot.sendMessage(chatId, `👋 Привет, ${user.name}! Вы уже зарегистрированы.\n\nКоманды:\n/new - Создать новую задачу`);
        } else {
            userState.set(tgId, { step: 'NAME', chat_id: chatId, username: msg.from.username });
            bot.sendMessage(chatId, `👋 Добро пожаловать! Как вас зовут? Этим именем вы будете подписаны в системе.`);
        }
    });

    // Handle /new (Create Task)
    bot.onText(/\/new/, async (msg) => {
        const chatId = msg.chat.id;
        const tgId = msg.from.id;

        const users = await readUsers();
        const user = users.find(u => u.telegramId === tgId);

        if (!user) {
            bot.sendMessage(chatId, '⛔️ Сначала зарегистрируйтесь через /start');
            return;
        }

        userState.set(tgId, { step: 'CREATE_TEXT' });
        bot.sendMessage(chatId, '📝 Введите текст новой задачи:');
    });

    // Handle Messages (Registration, Reports, Task Creation)
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const text = msg.text;

        // Skip commands
        if (text && text.startsWith('/')) return;

        if (!userState.has(userId)) return;

        const state = userState.get(userId);

        // Flow 1: Registration (Name)
        if (state.step === 'NAME') {
            userState.set(userId, { ...state, step: 'POSITION', name: text.trim() });
            bot.sendMessage(chatId, `Принято, *${text.trim()}*! Теперь укажите вашу должность:`, { parse_mode: 'Markdown' });
            return;
        }

        // Flow 1.1: Registration (Position)
        if (state.step === 'POSITION') {
            userState.delete(userId);

            const users = await readUsers();
            const newUser = {
                id: `u_${Date.now()}`,
                name: state.name,
                position: text.trim(),
                telegramId: userId,
                telegramUsername: state.username ? `@${state.username}` : undefined
            };

            users.push(newUser);
            await writeUsers(users);

            bot.sendMessage(chatId, `✅ Регистрация завершена!\n*${newUser.name}* (${newUser.position})\nТеперь вы можете работать с задачами.`, { parse_mode: 'Markdown' });
            return;
        }

        // Flow 2: Task Reports
        if (state.step === 'REPORT') {
            // ... (Existing report logic, needs adaptation to new state structure)
            // Wait, I should preserve existing logic but adapted.
            // The previous logic stored just ID string in map. Now it's object.

            const todoIdPrefix = state.data; // Assumption: data holds the ID
            userState.delete(userId);

            const todos = await readTodos();
            const index = todos.findIndex(t => t.id.startsWith(todoIdPrefix));

            if (index !== -1) {
                const todo = todos[index];
                todo.report = text;
                todo.status = 'awaiting-approval';
                await writeTodos(todos);

                bot.sendMessage(chatId, `✅ Отчет принят! Задача "${todo.text}" отправлена на согласование.`);

                // Notify Author
                const authorUser = await getUserBySystemName(todo.author);
                if (authorUser && authorUser.telegramId) {
                    bot.sendMessage(authorUser.telegramId,
                        `🔔 *Задача на согласовании!*\nЗадача: *${todo.text}*\nИсполнитель: ${todo.assignee}\n\n📝 *Отчет:* ${text}`,
                        {
                            parse_mode: 'Markdown',
                            reply_markup: {
                                inline_keyboard: [
                                    [
                                        { text: '✅ Одобрить', callback_data: JSON.stringify({ a: 'appr', i: todo.id.substring(0, 8) }) },
                                        { text: '❌ Вернуть', callback_data: JSON.stringify({ a: 'rejt', i: todo.id.substring(0, 8) }) }
                                    ]
                                ]
                            }
                        }
                    );
                }
            }
            return;
        }

        // Flow 3: Create Task (Text Input)
        if (state.step === 'CREATE_TEXT') {
            const taskText = text.trim();
            userState.set(userId, { ...state, step: 'CREATE_ASSIGNEE', taskText });

            const users = await readUsers();
            // Filter out users without telegram ID? No, allow assigning to anyone.
            // But for buttons we need limit.

            const userButtons = users.map(u => ([{
                text: `${u.name} (${u.position || 'Сотрудник'})`,
                callback_data: JSON.stringify({ a: 'set_assignee', u: u.id })
            }]));

            // Add "Unassigned" option
            userButtons.unshift([{
                text: '🚫 Без исполнителя',
                callback_data: JSON.stringify({ a: 'set_assignee', u: 'unassigned' })
            }]);

            bot.sendMessage(chatId, `Задача: *${taskText}*\n\nВыберите исполнителя:`, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: userButtons }
            });
        }
    });

    // Handle Callback Queries
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;

        try {
            const data = JSON.parse(query.data);
            const tgId = query.from.id;

            if (data.a === 'set_assignee') {
                if (!userState.has(tgId)) {
                    // Check if it's an old keyboard
                    bot.answerCallbackQuery(query.id, { text: 'Сессия истекла. Начните заново командой /new' });
                    return;
                }

                const state = userState.get(tgId);
                if (state.step !== 'CREATE_ASSIGNEE') return;

                // Create Task
                const todos = await readTodos();
                const users = await readUsers();
                const creator = users.find(u => u.telegramId === tgId);

                let assigneeName = 'Unassigned';
                let assigneeUser = null;

                if (data.u !== 'unassigned') {
                    assigneeUser = users.find(u => u.id === data.u);
                    assigneeName = assigneeUser ? assigneeUser.name : 'Unassigned';
                }

                const newTodo = {
                    id: crypto.randomUUID(),
                    text: state.taskText,
                    status: 'todo',
                    priority: 'medium', // Default
                    author: creator ? creator.name : 'Telegram Bot',
                    assignee: assigneeName,
                    createdAt: Date.now()
                };

                todos.unshift(newTodo);
                await writeTodos(todos);
                userState.delete(tgId);

                bot.deleteMessage(chatId, messageId); // Remove keyboard
                bot.sendMessage(chatId, `✅ Задача создана!\n*${newTodo.text}*\n👤 Исполнитель: ${assigneeName}`, { parse_mode: 'Markdown' });

                // Notify Assignee
                if (assigneeUser && assigneeUser.telegramId) {
                    const buttons = getTaskButtons(newTodo);
                    bot.sendMessage(assigneeUser.telegramId, `🆕 Вам назначена задача: *${newTodo.text}*\n👤 Автор: ${newTodo.author}`, {
                        parse_mode: 'Markdown',
                        reply_markup: buttons ? { inline_keyboard: buttons } : undefined
                    });
                }

                // Teams notification
                sendToTeams(
                    "🆕 Новое поручение (Telegram)",
                    `**Задача**: ${newTodo.text}\n**Автор**: ${newTodo.author}\n**Исполнитель**: ${assigneeName}`,
                    "2563eb"
                );

                bot.answerCallbackQuery(query.id);
                return;
            }

            // ... Existing logic for other callbacks (take, done, appr, rejt, dlg) ...
            // We need to copy-paste the existing logic here or ensure it runs.
            // Since I'm replacing the whole file content block, I must preserve existing logic.
            // Let me merge existing logic below.

            const user = query.from.first_name + (query.from.last_name ? ` ${query.from.last_name}` : '');
            const username = query.from.username ? `@${query.from.username}` : user;

            const todos = await readTodos();

            // Note: data.i might be missing for set_assignee which we handled above.
            if (!data.i) return;

            const todoIndex = todos.findIndex(t => t.id.startsWith(data.i));

            if (todoIndex === -1) {
                bot.answerCallbackQuery(query.id, { text: 'Задача не найдена' });
                return;
            }

            const users = await readUsers();
            const currentUser = users.find(u => u.telegramId === query.from.id);
            const displayName = currentUser ? currentUser.name : username;

            const todo = todos[todoIndex];
            let updated = false;
            let replyText = '';

            if (data.a === 'take') {
                // ... (Same as before)
                if (todo.assignee && todo.assignee !== 'Unassigned' && todo.assignee !== displayName && todo.assignee !== username) {
                    bot.answerCallbackQuery(query.id, { text: `Задача уже закреплена за ${todo.assignee}` });
                    return;
                }

                todo.assignee = displayName;
                todo.status = 'in-progress';
                updated = true;
                replyText = `👷 ${displayName} взял задачу в работу: *${todo.text}*`;

                // Notify Author
                const authorUser = await getUserBySystemName(todo.author);
                if (authorUser && authorUser.telegramId) {
                    bot.sendMessage(authorUser.telegramId, `👷 *${displayName}* взял вашу задачу в работу: *${todo.text}*`, { parse_mode: 'Markdown' });
                }
            } else if (data.a === 'done') {
                if (todo.assignee !== displayName && todo.assignee !== username) {
                    bot.answerCallbackQuery(query.id, { text: 'Только исполнитель может завершить задачу' });
                    return;
                }

                userState.set(query.from.id, { step: 'REPORT', data: data.i }); // Set unified state
                bot.sendMessage(chatId, `📝 Пожалуйста, напишите краткий отчет о выполненной задаче: *${todo.text}*`, {
                    parse_mode: 'Markdown',
                    reply_markup: { force_reply: true }
                });
                bot.answerCallbackQuery(query.id, { text: 'Жду отчет...' });
                return;
            } else if (data.a === 'appr') {
                todo.status = 'done';
                updated = true;
                replyText = `✅ Автор одобрил задачу: *${todo.text}*`;

                const assigneeUser = await getUserBySystemName(todo.assignee);
                if (assigneeUser && assigneeUser.telegramId) {
                    bot.sendMessage(assigneeUser.telegramId, `✅ Автор одобрил вашу задачу: *${todo.text}*`, { parse_mode: 'Markdown' });
                }
            } else if (data.a === 'rejt') {
                todo.status = 'in-progress';
                updated = true;
                replyText = `❌ Автор вернул задачу: *${todo.text}* на доработку.`;

                const assigneeUser = await getUserBySystemName(todo.assignee);
                if (assigneeUser && assigneeUser.telegramId) {
                    bot.sendMessage(assigneeUser.telegramId, `❌ Автор вернул задачу: *${todo.text}* на доработку.`, { parse_mode: 'Markdown' });
                }
            } else if (data.a === 'dlg') {
                // ... Delegate logic ...
                // Code abbreviated for brevity, assuming standard logic implies copy-paste of previous delegate logic
                // I will include the full delegate logic to be safe
                if (todo.assignee !== displayName && todo.assignee !== username) {
                    bot.answerCallbackQuery(query.id, { text: 'Только исполнитель может делегировать задачу' });
                    return;
                }

                const allUsers = await readUsers();
                const availableUsers = allUsers.filter(u => u.name !== displayName);

                if (availableUsers.length === 0) {
                    bot.answerCallbackQuery(query.id, { text: 'Нет доступных пользователей для делегирования' });
                    return;
                }

                const userButtons = availableUsers.map(u => ([{
                    text: `${u.name} (${u.position || 'Сотрудник'})`,
                    callback_data: JSON.stringify({ a: 'dlg_to', i: data.i, u: u.id })
                }]));

                bot.sendMessage(chatId, `Выберите, кому делегировать задачу: *${todo.text}*`, {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: userButtons }
                });
                bot.answerCallbackQuery(query.id);
                return;
            } else if (data.a === 'dlg_to') {
                const targetUserId = data.u;
                const targetUser = (await readUsers()).find(u => u.id === targetUserId);

                if (!targetUser) {
                    bot.answerCallbackQuery(query.id, { text: 'Пользователь не найден' });
                    return;
                }

                const subTask = {
                    id: `t_${Date.now()}`,
                    text: `[Делегировано] ${todo.text}`,
                    status: 'todo',
                    createdAt: Date.now(),
                    author: displayName,
                    assignee: targetUser.name,
                    parentId: todo.id,
                    rootId: todo.rootId || todo.id
                };

                todos.push(subTask);
                await writeTodos(todos);

                bot.sendMessage(chatId, `✅ Задача успешно делегирована пользователю ${targetUser.name}`);

                if (targetUser.telegramId) {
                    const buttons = getTaskButtons(subTask);
                    bot.sendMessage(targetUser.telegramId, `🆕 Вам делегирована задача: *${subTask.text}*\n👤 Автор: ${subTask.author}`, {
                        parse_mode: 'Markdown',
                        reply_markup: buttons ? { inline_keyboard: buttons } : undefined
                    });
                }

                bot.answerCallbackQuery(query.id);
                updated = false;
            }

            if (updated) {
                await writeTodos(todos);
                bot.answerCallbackQuery(query.id, { text: 'Успешно!' });
                bot.sendMessage(chatId, replyText, { parse_mode: 'Markdown' });

                // Update keyboard
                const buttons = getTaskButtons(todo);
                const options = { chat_id: chatId, message_id: messageId };
                if (buttons) {
                    options.reply_markup = { inline_keyboard: buttons };
                }
                bot.editMessageReplyMarkup(options.reply_markup || { inline_keyboard: [] }, options)
                    .catch(() => { });
            }

        } catch (error) {
            console.error('Callback error:', error);
            bot.answerCallbackQuery(query.id, { text: 'Ошибка обработки' });
        }
    });

    console.log('Telegram Bot started in polling mode...');
    return bot;
}

module.exports = { initBot, getTaskButtons, sendToTeams };
