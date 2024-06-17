const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
        console.error('Ошибка при открытии базы данных', err.message);
        throw err;
    } else {
        console.log('Подключение к базе данных успешно установлено');
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            phone_number TEXT UNIQUE,
            username TEXT,
            admin_status INTEGER DEFAULT 0,
            city TEXT,
            lang TEXT,
            code TEXT,
            attempts INTEGER DEFAULT 0
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY,
            text TEXT,
            date TEXT,
            creator TEXT,
            recipient TEXT,
            success INTEGER,
            group_id INTEGER,
            FOREIGN KEY(group_id) REFERENCES groups(id)
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS groupsUsers (
            id INTEGER PRIMARY KEY,
            group_name TEXT,
            group_id INTEGER,
            group_creator TEXT,
            username TEXT
        )`);
  
        db.run(`CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY,
            group_name TEXT,
            creator TEXT
        )`);
    }
});

const addUser = (chatId, phone_number, username) => {
    db.run(`INSERT INTO users (id, phone_number, username) VALUES (?, ?, ?)`, [chatId, phone_number, username], (err) => {
        if (err) {
            console.error('Ошибка при добавлении пользователя:', err.message);
        } else {
            console.log('Пользователь успешно добавлен в базу данных');
        }
    });
};



const getChatID = (phoneNumber) => {
    return new Promise((resolve, reject) => {
        db.get(`SELECT id FROM users WHERE phone_number = ?`, [phoneNumber], (err, row) => {
            if (err) {
                console.error('Ошибка при выполнении запроса:', err.message);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};



const updateUser = (phoneNumber, code) => {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE users SET code = ? WHERE phone_number = ?`, [code, phoneNumber], (err) => {
            if (err) {
                console.error('Ошибка при обновлении данных пользователя:', err.message);
                reject(err);
            } else {
                console.log('Данные пользователя успешно обновлены');
                resolve();
            }
        });
    });
};

const addTask = (text, date, creator, to, group_id) => {
    db.run(`INSERT INTO tasks (text, date, creator, recipient, group_id) VALUES (?, ?, ?, ?, ?)`, 
           [text, date, creator, to, group_id], 
           (err) => {
        if (err) {
            console.error('Ошибка при добавлении задачи:', err.message);
        } else {
            console.log('Задача успешно добавлена в базу данных');
        }
    });
};
const getAllUsers = () => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT username FROM users`, [], (err, rows) => {
            if (err) {
                console.error('Ошибка при получении пользователей:', err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const deleteTask = (taskId) => {
    db.run(`DELETE FROM tasks WHERE id = ?`, [taskId], (err) => {
        if (err) {
            console.error('Ошибка при удалении задачи:', err.message);
        } else {
            console.log('Задача успешно удалена из базы данных');
        }
    });
};
const updateTask = (taskId, text, date, creator, recipient, success, group_id) => {
    db.run(
        `UPDATE tasks SET text = ?, date = ?, creator = ?, recipient = ?, success = ?, group_id = ? WHERE id = ?`,
        [text, date, creator, recipient, success, group_id, taskId],
        (err) => {
            if (err) {
                console.error('Ошибка при обновлении задачи:', err.message);
            } else {
                console.log('Данные задачи успешно обновлены');
            }
        }
    );
};

const getAllTasksByTo = (to) => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM tasks WHERE recipient = ?`, [to], (err, rows) => {
            if (err) {
                console.error('Ошибка при получении задач:', err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const addGroup = (group_name, creator) => {
    db.run(`INSERT INTO groups (group_name, creator) VALUES (?, ?)`, [group_name, creator], (err) => {
        if (err) {
            console.error('Ошибка при добавлении группы:', err.message);
        } else {
            console.log('Группа успешно добавлена в базу данных');
        }
    });
};


const moveTaskToNextDay = (task, currentDate) => {
    // Разбиваем строку даты на компоненты: день, месяц, год
    const [day, month, year] = task.date.split('.');
    
    // Создаем новый объект Date на основе компонентов даты задачи
    const nextDate = new Date(Number(year), Number(month) - 1, Number(day));
    nextDate.setDate(nextDate.getDate() + 1); // Увеличиваем текущую дату на 1 день

    // Форматируем новую дату в нужный формат
    const formattedNextDate = nextDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });

    // Обновляем дату задачи в базе данных, оставляя остальные данные без изменений
    updateTask(task.id, task.text, formattedNextDate, task.creator, task.recipient, task.group_id);
};


const getTaskById = (taskId) => {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM tasks WHERE id = ?`, [taskId], (err, row) => {
            if (err) {
                console.error('Ошибка при получении задачи по ID:', err.message);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};



const deleteGroup = (groupId) => {
    db.run(`DELETE FROM groups WHERE id = ?`, [groupId], (err) => {
        if (err) {
            console.error('Ошибка при удалении группы:', err.message);
        } else {
            console.log('Группа успешно удалена из базы данных');
        }
    });
};

const getAllTasksInUsers = (user) => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM tasks WHERE creator = ?`, [user], (err, rows) => {
            if (err) {
                console.error('Ошибка при получении задач в группе:', err.message);
                reject(err);
            } else {
                console.log("Tasks fetched successfully for user:", rows);
                resolve(rows);
            }
        });
    });
};


const getAllGroupsByUsername = (username) => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM groups WHERE creator = ?`, [username], (err, rows) => {
            if (err) {
                console.error('Ошибка при получении групп по имени пользователя:', err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const checkUser = (username) => {
    return new Promise((resolve, reject) => {
        // Выполняем запрос к базе данных для поиска пользователя по имени пользователя (username)
        db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
            if (err) {
                reject(err); // Если произошла ошибка, отклоняем обещание с ошибкой
            } else {
                resolve(row); // Возвращаем пользователя (или null, если не найден)
            }
        });
    });
};
const getUserByPhoneNumber = (phoneNumber) => {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM users WHERE phone_number = ?`, [phoneNumber], (err, row) => {
            if (err) {
                console.error('Ошибка при выполнении запроса:', err.message);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};
const getUserByChatId = (chatId) => {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM users WHERE id = ?`, [chatId], (err, row) => {
            if (err) {
                console.error('Ошибка при выполнении запроса:', err.message);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};
const getAllTasksByDate = (date) => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM tasks WHERE date = ?`, [date], (err, rows) => {
            if (err) {
                console.error('Ошибка при получении задач по дате:', err.message);
                reject(err);
            } else {
                console.log("данные по дате получены - успешно!")
                resolve(rows);
            }
        });
    });
};
const getAllTasksByDateAndUsername = (date, username) => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM tasks WHERE date = ? AND recipient = ?`, [date, username], (err, rows) => {
            if (err) {
                console.error('Ошибка при получении задач по дате и имени пользователя:', err.message);
                reject(err);
            } else {
                console.log("данные по дате и имени пользователя получены - успешно!")
                resolve(rows);
            }
        });
    });
};
module.exports = { addUser, getAllGroupsByUsername,getUserByChatId,getTaskById,moveTaskToNextDay, getAllUsers,getAllTasksByDateAndUsername,getAllTasksByDate, getUserByPhoneNumber,getAllTasksByDate,checkUser,getAllTasksByTo, getAllTasksInUsers, getChatID, updateUser, addTask, deleteTask, addGroup, deleteGroup, updateTask };
