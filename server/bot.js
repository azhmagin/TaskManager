const TelegramBot = require('node-telegram-bot-api');
const { readTodos, writeTodos, readUsers, writeUsers, getUserBySystemName } = require('./db');
require('dotenv').config();

// Memory for tracking users waiting for input
const userWaitingForReport = new Map();
const userWaitingForName = new Map();
const userWaitingForPosition = new Map();

// Helper to send rich notifications to MS Teams
async function sendToTeams(title, message, color = "7467ef") {
    const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
    if (!webhookUrl || webhookUrl === 'your_webhook_url_here' || webhookUrl === '') {
        // console.log('Skipping Teams notification: TEAMS_WEBHOOK_URL not set');
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
            bot.sendMessage(chatId, `👋 Привет, ${user.name}! Вы уже зарегистрированы в системе.`);
        } else {
            userWaitingForName.set(tgId, { chat_id: chatId, username: msg.from.username });
            bot.sendMessage(chatId, `👋 Добро пожаловать! Как вас зовут? Этим именем вы будете подписаны в системе.`);
        }
    });

    // Handle Messages (Registration & Reports)
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const text = msg.text;

        // Skip commands
        if (text && text.startsWith('/')) return;

        // Flow 1: Registration (Name)
        if (userWaitingForName.has(userId)) {
            const tempUser = userWaitingForName.get(userId);
            userWaitingForName.delete(userId);

            // Move to position step
            userWaitingForPosition.set(userId, { ...tempUser, name: text.trim() });
            bot.sendMessage(chatId, `Принято, *${text.trim()}*! Теперь укажите вашу должность (например, Директор, Аналитик):`, { parse_mode: 'Markdown' });
            return;
        }

        // Flow 1.1: Registration (Position)
        if (userWaitingForPosition.has(userId)) {
            const tempUser = userWaitingForPosition.get(userId);
            userWaitingForPosition.delete(userId);

            const users = await readUsers();
            const newUser = {
                id: `u_${Date.now()}`,
                name: tempUser.name,
                position: text.trim(),
                telegramId: userId,
                telegramUsername: tempUser.username ? `@${tempUser.username}` : undefined
            };

            users.push(newUser);
            await writeUsers(users);

            bot.sendMessage(chatId, `✅ Регистрация завершена!\n*${newUser.name}* (${newUser.position})\nТеперь вы можете работать с задачами.`, { parse_mode: 'Markdown' });
            return;
        }

        // Flow 2: Task Reports
        if (userWaitingForReport.has(userId)) {
            const todoIdPrefix = userWaitingForReport.get(userId);
            userWaitingForReport.delete(userId);

            const todos = await readTodos();
            const index = todos.findIndex(t => t.id.startsWith(todoIdPrefix));

            if (index !== -1) {
                const todo = todos[index];
                todo.report = text;
                todo.status = 'awaiting-approval';
                await writeTodos(todos);

                bot.sendMessage(chatId, `✅ Отчет принят! Задача "${todo.text}" отправлена на согласование автору.`);

                // Notify Author with Approve/Reject buttons
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
        }
    });

    // Handle Callback Queries (Buttons)
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;
        try {
            const data = JSON.parse(query.data);
            const user = query.from.first_name + (query.from.last_name ? ` ${query.from.last_name}` : '');
            const username = query.from.username ? `@${query.from.username}` : user;

            const todos = await readTodos();
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
                // Check if task already has a specific assignee and it's not the one clicking
                if (todo.assignee && todo.assignee !== 'Unassigned' && todo.assignee !== displayName && todo.assignee !== username) {
                    bot.answerCallbackQuery(query.id, { text: `Задача уже закреплена за ${todo.assignee}` });
                    return;
                }

                todo.assignee = displayName;
                todo.status = 'in-progress';
                updated = true;
                replyText = `👷 ${displayName} взял задачу в работу: *${todo.text}*`;

                // Notify Author in DM
                const authorUser = await getUserBySystemName(todo.author);
                if (authorUser && authorUser.telegramId) {
                    bot.sendMessage(authorUser.telegramId, `👷 *${displayName}* взял вашу задачу в работу: *${todo.text}*`, { parse_mode: 'Markdown' });
                }
            } else if (data.a === 'done') {
                // Check if it's the assignee
                if (todo.assignee !== displayName && todo.assignee !== username) {
                    bot.answerCallbackQuery(query.id, { text: 'Только исполнитель может завершить задачу' });
                    return;
                }

                // Ask for report
                userWaitingForReport.set(query.from.id, data.i);
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

                // Notify Assignee in DM
                const assigneeUser = await getUserBySystemName(todo.assignee);
                if (assigneeUser && assigneeUser.telegramId) {
                    bot.sendMessage(assigneeUser.telegramId, `✅ Автор одобрил вашу задачу: *${todo.text}*`, { parse_mode: 'Markdown' });
                }
            } else if (data.a === 'rejt') {
                todo.status = 'in-progress';
                updated = true;
                replyText = `❌ Автор вернул задачу: *${todo.text}* на доработку.`;

                // Notify Assignee in DM
                const assigneeUser = await getUserBySystemName(todo.assignee);
                if (assigneeUser && assigneeUser.telegramId) {
                    bot.sendMessage(assigneeUser.telegramId, `❌ Автор вернул задачу: *${todo.text}* на доработку.`, { parse_mode: 'Markdown' });
                }
            } else if (data.a === 'dlg') {
                if (todo.assignee !== displayName && todo.assignee !== username) {
                    bot.answerCallbackQuery(query.id, { text: 'Только исполнитель может делегировать задачу' });
                    return;
                }

                // Fetch users to show delegation list
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

                // Create sub-task
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

                // Notify original author/root author if needed
                const rootTodo = todos.find(t => t.id === (todo.rootId || todo.id));
                if (rootTodo && rootTodo.author !== displayName) {
                    const rootAuthor = await getUserBySystemName(rootTodo.author);
                    if (rootAuthor && rootAuthor.telegramId) {
                        bot.sendMessage(rootAuthor.telegramId, `📢 Ваша задача "${rootTodo.text}" была делегирована далее пользователем ${displayName} человеку по имени ${targetUser.name}.`, { parse_mode: 'Markdown' });
                    }
                }

                // Notify new assignee
                if (targetUser.telegramId) {
                    const buttons = getTaskButtons(subTask);
                    bot.sendMessage(targetUser.telegramId, `🆕 Вам делегирована задача: *${subTask.text}*\n👤 Автор: ${subTask.author} (${currentUser?.position || 'Сотрудник'})`, {
                        parse_mode: 'Markdown',
                        reply_markup: buttons ? { inline_keyboard: buttons } : undefined
                    });
                }

                // Teams Notification for Delegation
                sendToTeams(
                    "🔄 Задача делегирована",
                    `**Задача**: ${todo.text}\n**Кто делегировал**: ${displayName}\n**Кому**: ${targetUser.name}\n**Новая задача**: ${subTask.text}`,
                    "8b5cf6"
                );

                bot.answerCallbackQuery(query.id);
                updated = false; // already updated manually
            }

            if (updated) {
                await writeTodos(todos);
                bot.answerCallbackQuery(query.id, { text: 'Успешно!' });

                // Send status update message
                bot.sendMessage(chatId, replyText, { parse_mode: 'Markdown' });

                // Update original message to reflect changes
                const buttons = getTaskButtons(todo);
                const options = { chat_id: chatId, message_id: messageId };
                if (buttons) {
                    options.reply_markup = { inline_keyboard: buttons };
                }

                bot.editMessageReplyMarkup(options.reply_markup || { inline_keyboard: [] }, options)
                    .catch(err => console.log('Edit markup error (likely no change):', err.message));
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
