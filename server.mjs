import express from 'express';
import bodyParser from 'body-parser';
import TelegramBot from 'node-telegram-bot-api';
import crypto from 'crypto';
import cors from 'cors';

import database from './datebase.js'; // Import the entire module

const {
    addUser, getTaskById, getUserByChatId, moveTaskToNextDay,
    getAllGroupsByUsername, getAllUsers, getAllTasksByDateAndUsername,
    getAllTasksByTo, getUserByPhoneNumber, getChatID, checkUser, updateUser,
    addTask, deleteTask, updateTask, getAllTasksByDate, addGroup, deleteGroup,
    getAllTasksInUsers
} = database;

const app = express();
app.use(bodyParser.json());
app.use(cors()); // Разрешить все CORS-запросы
const token = '7462393619:AAFEzTBkOKglJgqOJeeCVZtWZMUCwcK9VwE';
const bot = new TelegramBot(token, { polling: true });

const generateCode = () => crypto.randomBytes(6).toString('hex');

const sendTelegramCode = async (chatId, code) => {
    try {
        const user = await getUserByChatId(chatId);
        if (user) {
            const userCode = user.code; // Переименуем переменную

            const message = `Ваш код подтверждения (уже скопирован в буфер): ${userCode}`;
            await bot.sendMessage(chatId, message);
        } else {
            throw new Error('Пользователь не найден');
        }
    } catch (err) {
        console.error('Ошибка при отправке кода подтверждения:', err.message);
    }
};

app.post('/api/send-code', async (req, res) => {
    const { phoneNumber } = req.body;
    const code = generateCode();

    try {
        const user = await getChatID(phoneNumber);
        if (user) {
            const chatId = user.id;
            await updateUser(phoneNumber, code); // Wait for updateUser to complete
            await sendTelegramCode(chatId, code); // Wait for sendTelegramCode to complete
            res.sendStatus(200);
        } else {
            console.error('Пользователь с таким номером телефона не найден');
            res.sendStatus(404);
        }
    } catch (err) {
        console.error('Ошибка при выполнении запроса:', err.message);
        res.sendStatus(500);
    }
});

bot.onText(/\/task (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const taskDetails = match[1];

    const regex = /^(\S+)\s+(\d{2}\.\d{2}\.\d{2})\s+(.+)$/;
    const matchResult = taskDetails.match(regex);

    if (matchResult) {
        const [, assignedUser, taskDate, taskDescription] = matchResult;
        try {
            await addTask(taskDescription, taskDate, msg.from.username, assignedUser, null);
            bot.sendMessage(chatId, `Задача добавлена: Ассигновано: ${assignedUser}, Дата: ${taskDate}, Описание: ${taskDescription}`);
        } catch (err) {
            console.error('Ошибка при добавлении задачи:', err.message);
            bot.sendMessage(chatId, 'Произошла ошибка при добавлении задачи.');
        }
    } else {
        bot.sendMessage(chatId, 'Формат команды неверен. Используйте: /task <пользователь> <дд.мм.гг> <описание задачи>');
    }
});

bot.onText(/\/tasksfor (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const assignedUser = match[1];

    try {
        const tasks = await getAllTasksByTo(assignedUser);
        if (tasks.length > 0) {
            let message = `Задачи для ${assignedUser}:\n`;
            tasks.forEach(task => {
                message += `Дата: ${task.date}, Описание: ${task.text}\n`;
            });
            bot.sendMessage(chatId, message);
        } else {
            bot.sendMessage(chatId, `У пользователя ${assignedUser} нет задач.`);
        }
    } catch (err) {
        console.error('Ошибка при получении задач:', err.message);
        bot.sendMessage(chatId, 'Произошла ошибка при получении задач.');
    }
});

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;

    try {
        const user = await checkUser(username);
        if (!user) {
            bot.sendMessage(chatId, 'Пожалуйста, поделитесь своим контактом, чтобы мы могли сохранить ваш номер телефона в базе данных.', {
                reply_markup: {
                    keyboard: [[{ text: 'Поделиться контактом', request_contact: true, request_location: false }]],
                    one_time_keyboard: true,
                    resize_keyboard: true
                }
            });
        } else {
            bot.sendMessage(chatId, `Пользователь ${username} уже добавлен.`);
        }
    } catch (err) {
        console.error('Ошибка при проверке пользователя:', err.message);
        bot.sendMessage(chatId, 'Произошла ошибка при проверке пользователя.');
    }
});

bot.onText(/\/alltasks/, async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const [command, username] = text.split('@');

    const cleanedUsername = username.trim();
    try {
        const tasks = await getAllTasksByTo("@" + cleanedUsername);
        if (tasks.length > 0) {
            let message = `Ваши задачи:\n`;
            tasks.forEach(task => {
                message += `От кого: ${task.creator}\nДата: ${task.date}, Описание: ${task.text}\n\n`;
            });
            bot.sendMessage(chatId, message);
        } else {
            bot.sendMessage(chatId, `У вас нет задач.`);
        }
    } catch (err) {
        console.error('Ошибка при получении задач:', err.message);
        bot.sendMessage(chatId, 'Произошла ошибка при получении задач.');
    }
});

bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const action = callbackQuery.data;

    try {
        let currentDate = new Date();
        if (action === 'prev_date') {
            currentDate.setDate(currentDate.getDate() - 1);
        } else if (action === 'next_date') {
            currentDate.setDate(currentDate.getDate() + 1);
        }
        const formattedDate = formatDate(currentDate);
        const tasks = await getAllTasksByDate(formattedDate);
        if (tasks.length > 0) {
            let message = `Задачи на ${formattedDate}:\n`;
            tasks.forEach(task => {
                message += `Описание: ${task.text}\n`;
            });
            bot.sendMessage(chatId, message);
        } else {
            bot.sendMessage(chatId, `На ${formattedDate} задач нет.`);
        }
    } catch (err) {
        console.error('Ошибка при получении задач:', err.message);
        bot.sendMessage(chatId, 'Произошла ошибка при получении задач.');
    }
});

app.post('/api/verify-code', async (req, res) => {
    const { phoneNumber, code } = req.body;
    try {
        const user = await getUserByPhoneNumber(phoneNumber);
        if (user && user.code === code) {
            res.json({ success: true, user: user });
        } else {
            res.json({ success: false });
        }
    } catch (err) {
        console.error('Ошибка при получении пользователя из базы данных:', err.message);
        res.json({ success: false });
    }
});

bot.on('contact', async (msg) => {
    const chatId = msg.chat.id;
    const contact = msg.contact;
    const phoneNumber = contact.phone_number;
    const username = msg.from.username;

    try {
        await addUser(chatId, phoneNumber, username);
        bot.sendMessage(chatId, 'Спасибо, ваш контакт сохранен.');
    } catch (err) {
        console.error('Ошибка при добавлении контакта:', err.message);
        bot.sendMessage(chatId, 'Произошла ошибка при сохранении контакта.');
    }
});

const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

app.post('/api/add-task', async (req, res) => {
    const { text, date, creator, recipient, group_id } = req.body;
    try {
        await addTask(text, date, creator, recipient, group_id);
        res.sendStatus(200);
    } catch (err) {
        console.error('Ошибка при добавлении задачи:', err.message);
        res.sendStatus(500);
    }
});

app.delete('/api/delete-task/:taskId', async (req, res) => {
    const taskId = req.params.taskId;
    try {
        await deleteTask(taskId);
        res.sendStatus(200);
    } catch (err) {
        console.error('Ошибка при удалении задачи:', err.message);
        res.sendStatus(500);
    }
});

app.put('/api/update-task/:taskId', async (req, res) => {
    const taskId = req.params.taskId;
    const { text, date, creator, recipient, success, group_id } = req.body;
    try {
        await updateTask(taskId, text, date, creator, recipient, success, group_id);
        res.sendStatus(200);
    } catch (err) {
        console.error('Ошибка при обновлении задачи:', err.message);
        res.sendStatus(500);
    }
});

app.put('/api/move-task-to-next-day/:taskId', async (req, res) => {
    const taskId = req.params.taskId;
    const currentDate = new Date();
    try {
        const task = await getTaskById(taskId);
        await moveTaskToNextDay(task, currentDate);
        res.sendStatus(200);
    } catch (err) {
        console.error('Ошибка при переносе задачи на следующий день:', err.message);
        res.sendStatus(500);
    }
});

app.get('/api/tasks/:day/:month/:year/:username', async (req, res) => {
    let { day, month, year, username } = req.params;

    month = month.padStart(2, '0');
    day = day.padStart(2, '0');
    const formattedDate = `${month}.${day}.${year.slice(-2)}`;

    try {
        const tasks = await getAllTasksByDateAndUsername(formattedDate, "@" + username);
        res.status(200).json(tasks);
    } catch (err) {
        console.error('Ошибка при получении задач:', err.message);
        res.status(500).json({ error: 'Ошибка при получении задач' });
    }
});

app.get('/api/get-all-users', async (req, res) => {
    try {
        const users = await getAllUsers();
        res.status(200).json(users);
    } catch (err) {
        console.error('Ошибка при получении пользователей:', err.message);
        res.status(500).json({ error: 'Произошла ошибка при получении пользователей.' });
    }
});

app.post('/api/add-group', async (req, res) => {
    const { group_name, creator } = req.body;
    try {
        await addGroup(group_name, creator);
        res.sendStatus(200);
    } catch (err) {
        console.error('Ошибка при добавлении группы:', err.message);
        res.sendStatus(500);
    }
});

app.get('/api/tasks-in-group/:groupId', async (req, res) => {
    const groupId = req.params.groupId;
    try {
        const tasks = await getAllTasksInGroup(groupId);
        res.status(200).json(tasks);
    } catch (err) {
        console.error('Ошибка при получении задач в группе:', err.message);
        res.status(500).json({ error: 'Ошибка при получении задач в группе' });
    }
});

app.get('/api/groups/:username', async (req, res) => {
    const { username } = req.params;
    try {
        const groups = await getAllTasksInUsers(username);
        res.status(200).json(groups);
    } catch (err) {
        console.error('Ошибка при получении групп по имени пользователя:', err.message);
        res.status(500).json({ error: 'Произошла ошибка при получении групп' });
    }
});

app.get('/api/alltasks', async (req, res) => {
    const username = req.query.username;

    try {
        const tasks = await getAllTasksByTo("@" + username);
        if (tasks.length > 0) {
            res.status(200).json({ tasks: tasks });
        } else {
            res.status(200).json({ message: `У пользователя ${username} нет задач.` });
        }
    } catch (err) {
        console.error('Ошибка при получении задач:', err.message);
        res.status(500).json({ error: 'Произошла ошибка при получении задач.' });
    }
});

app.listen(3001, () => {
    console.log('Server running on port 3001');
});
