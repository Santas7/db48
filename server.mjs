import express from 'express';
import bodyParser from 'body-parser';
import TelegramBot from 'node-telegram-bot-api';
import crypto from 'crypto';
import cors from 'cors';
import clipboardy from 'clipboardy';
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
    const user = await getUserByChatId(chatId);
    const userCode = user.code; // Переименуем переменную
    clipboardy.writeSync(userCode);
    const message = `Ваш код подтверждения (уже скопирован в буфер): ${userCode}`;
    await bot.sendMessage(chatId, message);
};




app.post('/api/send-code', async (req, res) => {
    const { phoneNumber } = req.body;
    const code = generateCode();

    try {
        const user = await getChatID(phoneNumber);
        console.log(user)
        if (user) {
            const chatId = user.id;
            console.log(phoneNumber, chatId)
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

bot.onText(/\/task (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const taskDetails = match[1];

    // Регулярное выражение для разделения строки
    const regex = /^(\S+)\s+(\d{2}\.\d{2}\.\d{2})\s+(.+)$/;
    const matchResult = taskDetails.match(regex);

    if (matchResult) {
        const [, assignedUser, taskDate, taskDescription] = matchResult;

        addTask(taskDescription, taskDate, msg.from.username, assignedUser, null);
        bot.sendMessage(chatId, `Задача добавлена: Ассигновано: ${assignedUser}, Дата: ${taskDate}, Описание: ${taskDescription}`);
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
        // Проверяем, есть ли пользователь с таким именем пользователя в базе данных
        const user = await checkUser(username);
        
        if (!user) {
            // Отправляем сообщение с запросом контакта и текстом, приглашающим поделиться номером телефона
            bot.sendMessage(chatId, 'Пожалуйста, поделитесь своим контактом, чтобы мы могли сохранить ваш номер телефона в базе данных.', {
                reply_markup: {
                    keyboard: [[{ text: 'Поделиться контактом', request_contact: true, request_location: false }]],
                    one_time_keyboard: true,
                    resize_keyboard: true
                }
            });
        } else {
            // Если пользователь уже существует, отправляем сообщение о том, что он уже добавлен
            bot.sendMessage(chatId, `Пользователь ${username} уже добавлен.`);
        }
    } catch (err) {
        console.error('Ошибка при добавлении пользователя:', err.message);
        bot.sendMessage(chatId, 'Произошла ошибка при добавлении пользователя.');
    }
});




bot.onText(/\/alltasks/, async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const [command, username] = text.split('@');

    // Убираем лишние пробелы и символы
    const cleanedUsername = username.trim();
    try {
        // Получаем все задачи для текущего пользователя
        const tasks = await getAllTasksByTo("@"+cleanedUsername);

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


bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const action = callbackQuery.data;

    switch(action) {
        case 'prev_date':
            const currentDate1 = new Date();
            currentDate1.setDate(currentDate1.getDate() - 1);
            const formattedDate1 = formatDate(currentDate1);

            getAllTasksByDate(formattedDate1)
                .then(tasks => {
                    if (tasks.length > 0) {
                        let message = `Задачи на ${formattedDate1}:\n`;
                        tasks.forEach(task => {
                            message += `Описание: ${task.text}\n`;
                        });
                        bot.sendMessage(chatId, message);
                    } else {
                        bot.sendMessage(chatId, `На ${formattedDate1} задач нет.`);
                    }
                })
                .catch(err => {
                    console.error('Ошибка при получении задач:', err.message);
                    bot.sendMessage(chatId, 'Произошла ошибка при получении задач.');
                });
            break;
        case 'next_date':
            const currentDate2 = new Date();
            currentDate2.setDate(currentDate2.getDate() + 1);
            const formattedDate2 = formatDate(currentDate2);

            getAllTasksByDate(formattedDate2)
                .then(tasks => {
                    if (tasks.length > 0) {
                        let message = `Задачи на ${formattedDate2}:\n`;
                        tasks.forEach(task => {
                            message += `Описание: ${task.text}\n`;
                        });
                        bot.sendMessage(chatId, message);
                    } else {
                        bot.sendMessage(chatId, `На ${formattedDate2} задач нет.`);
                    }
                })
                .catch(err => {
                    console.error('Ошибка при получении задач:', err.message);
                    bot.sendMessage(chatId, 'Произошла ошибка при получении задач.');
                });
            break;
    }
});

app.post('/api/verify-code', async (req, res) => {
    const { phoneNumber, code } = req.body;
    try {
        const user = await getUserByPhoneNumber(phoneNumber);
        console.log(user)
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

    // Добавляем пользователя в базу данных
    await addUser(chatId, phoneNumber, username);

    bot.sendMessage(chatId, 'Спасибо, ваш контакт сохранен.');
});

const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

app.post('/api/add-task', (req, res) => {
    const { text, date, creator, recipient, group_id } = req.body;
    addTask(text, date, creator, recipient, group_id);
    res.sendStatus(200);
});

app.delete('/api/delete-task/:taskId', (req, res) => {
    const taskId = req.params.taskId;
    deleteTask(taskId);
    res.sendStatus(200);
});


app.put('/api/update-task/:taskId', (req, res) => {
    const taskId = req.params.taskId;
    const { text, date, creator, recipient, success, group_id } = req.body;
    updateTask(taskId, text, date, creator, recipient, success,group_id);
    res.sendStatus(200);
});

app.put('/api/move-task-to-next-day/:taskId', async (req, res) => {
    const taskId = req.params.taskId;
    const currentDate = new Date(); // Получаем текущую дату
    try {
        const task = await getTaskById(taskId); // Получаем данные о задаче по её ID
        await moveTaskToNextDay(task, currentDate); // Передаем всю задачу целиком в функцию переноса на следующий день
        res.sendStatus(200);
    } catch (err) {
        console.error('Ошибка при переносе задачи на следующий день:', err.message);
        res.sendStatus(500);
    }
});


app.get('/api/tasks/:day/:month/:year/:username', (req, res) => {
    let { day, month, year, username } = req.params;

    // Добавляем ведущий ноль, если месяц или день однозначные
    month = month.padStart(2, '0');
    day = day.padStart(2, '0');

    // Форматируем дату в нужный формат
    const formattedDate = `${month}.${day}.${year.slice(-2)}`;
    console.log(formattedDate);
    console.log(username)
    getAllTasksByDateAndUsername(formattedDate, "@"+username)
        .then(tasks => res.status(200).json(tasks)) // Отправляем задачи в формате JSON
        .catch(err => res.status(500).json({ error: 'Ошибка при получении задач' }));
});


app.get('/api/get-all-users', async (req, res) => {
    try {
        const users = await getAllUsers();
        console.log(users);
        res.status(200).json(users);
    } catch (err) {
        console.error('Ошибка при получении пользователей:', err.message);
        res.status(500).json({ error: 'Произошла ошибка при получении пользователей.' });
    }
});

app.post('/api/add-group', (req, res) => {
    const { group_name, creator } = req.body;
    addGroup(group_name, creator);
    res.sendStatus(200);
});

app.get('/api/tasks-in-group/:groupId', (req, res) => {
    const groupId = req.params.groupId;
    getAllTasksInGroup(groupId)
        .then(tasks => res.status(200).json(tasks))
        .catch(err => res.status(500).json({ error: 'Ошибка при получении задач в группе' }));
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
        // Получаем все задачи для указанного пользователя
        const tasks = await getAllTasksByTo("@" + username);

        if (tasks.length > 0) {
            let message = `Задачи для ${username}:\n`;
            tasks.forEach(task => {
                message += `Дата: ${task.date}, Описание: ${task.text}\n`;
            });
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
