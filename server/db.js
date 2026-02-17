const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'todos.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

async function readTodos() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

async function writeTodos(todos) {
    await fs.writeFile(DATA_FILE, JSON.stringify(todos, null, 2));
}

async function readUsers() {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

async function writeUsers(users) {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

async function getUserBySystemName(name) {
    if (!name) return null;
    const users = await readUsers();
    return users.find(u => u.name === name);
}

module.exports = {
    readTodos,
    writeTodos,
    readUsers,
    writeUsers,
    getUserBySystemName
};
