export interface User {
    id: string;
    username: string; // Login username
    name: string;
    telegramId?: number;
    telegramUsername?: string;
    avatar?: string;
    position?: string;
}
