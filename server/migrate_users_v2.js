const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const USERS_FILE = path.join(__dirname, 'data', 'users.json');

async function migrate() {
    try {
        const usersRaw = fs.readFileSync(USERS_FILE, 'utf8');
        const users = JSON.parse(usersRaw);

        const defaultPasswordHash = await bcrypt.hash('123456', 10);
        let updatedCount = 0;

        for (const user of users) {
            // Skip admin or users who already have a username (unless we want to force migrate them? 
            // The user said "login ... same as telegram". So we SHOULD overwrite username if they have telegram)
            // Let's protect "admin" specifically against username change if it doesn't have telegram.

            if (user.username === 'admin') continue;

            if (user.telegramUsername) {
                const newUsername = user.telegramUsername.replace('@', '');
                user.username = newUsername;
                user.password = defaultPasswordHash;
                user.mustChangePassword = true;
                updatedCount++;
                console.log(`Migrated ${user.name}: Login=${newUsername}, Password=123456, Flag=True`);
            } else {
                console.log(`Skipping ${user.name}: No Telegram Username`);
                // Fallback for users without telegram?
                if (!user.username) {
                    user.username = `user_${user.id.split('_')[1] || Date.now()}`;
                    user.password = defaultPasswordHash;
                    user.mustChangePassword = true;
                    updatedCount++;
                    console.log(`Fallback for ${user.name}: Login=${user.username}`);
                }
            }
        }

        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        console.log(`Migration complete. Updated ${updatedCount} users.`);

    } catch (e) {
        console.error('Migration failed:', e);
    }
}

migrate();
