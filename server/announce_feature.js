const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const USERS_FILE = path.join(__dirname, 'data', 'users.json');

async function announce() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.error('No token found');
        process.exit(1);
    }

    const bot = new TelegramBot(token, { polling: false });

    try {
        const usersRaw = fs.readFileSync(USERS_FILE, 'utf8');
        const users = JSON.parse(usersRaw);

        const message = `🚀 *Новая функция!*\n\nТеперь вы можете создавать задачи прямо здесь, не заходя на сайт!\n\nПросто отправьте команду: /new\n\n1. Бот спросит текст задачи\n2. Предложит выбрать исполнителя\n3. Готово! Задача сразу попадет на доску.\n\nПопробуйте прямо сейчас! 👇`;

        console.log(`Sending to ${users.length} potential users...`);

        for (const user of users) {
            if (user.telegramId) {
                try {
                    await bot.sendMessage(user.telegramId, message, { parse_mode: 'Markdown' });
                    console.log(`✅ Sent to ${user.name} (${user.telegramId})`);
                } catch (e) {
                    console.error(`❌ Failed to send to ${user.name}: ${e.message}`);
                }
            }
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

announce();
