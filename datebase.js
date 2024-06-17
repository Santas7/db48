const { Pool } = require('pg');

const connectionString = 'postgres://users_tua0_user:KLByIOknXOtSWNdfywncaqaiui0clnyl@dpg-cpntl688fa8c73b75pl0-a.oregon-postgres.render.com/users_tua0';

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false,
    },
});

pool.connect((err) => {
    if (err) {
        console.error('Ошибка при подключении к базе данных', err.message);
        throw err;
    } else {
        console.log('Подключение к базе данных успешно установлено');
        pool.query(`
            CREATE TABLE IF NOT EXISTS groups (
                id SERIAL PRIMARY KEY,
                group_name TEXT,
                creator TEXT
            );
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                phone_number TEXT UNIQUE,
                username TEXT,
                admin_status INTEGER DEFAULT 0,
                city TEXT,
                lang TEXT,
                code TEXT,
                attempts INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                text TEXT,
                date TEXT,
                creator TEXT,
                recipient TEXT,
                success INTEGER,
                group_id INTEGER,
                FOREIGN KEY(group_id) REFERENCES groups(id)
            );
            CREATE TABLE IF NOT EXISTS groupsUsers (
                id SERIAL PRIMARY KEY,
                group_name TEXT,
                group_id INTEGER,
                group_creator TEXT,
                username TEXT
            );
        `, (err) => {
            if (err) {
                console.error('Ошибка при создании таблиц', err.message);
            } else {
                console.log('Таблицы успешно созданы');
            }
        });
    }
});

const addUser = (chatId, phone_number, username) => {
    pool.query(`INSERT INTO users (id, phone_number, username) VALUES ($1, $2, $3)`, [chatId, phone_number, username], (err) => {
        if (err) {
            console.error('Ошибка при добавлении пользователя:', err.message);
        } else {
            console.log('Пользователь успешно добавлен в базу данных');
        }
    });
};

const getChatID = (phoneNumber) => {
    return new Promise((resolve, reject) => {
        pool.query(`SELECT id FROM users WHERE phone_number = $1`, [phoneNumber], (err, res) => {
            if (err) {
                console.error('Ошибка при выполнении запроса:', err.message);
                reject(err);
            } else {
                resolve(res.rows[0]);
            }
        });
    });
};

const updateUser = (phoneNumber, code) => {
    return new Promise((resolve, reject) => {
        pool.query(`UPDATE users SET code = $1 WHERE phone_number = $2`, [code, phoneNumber], (err) => {
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
    pool.query(`INSERT INTO tasks (text, date, creator, recipient, group_id) VALUES ($1, $2, $3, $4, $5)`,
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
        pool.query(`SELECT username FROM users`, [], (err, res) => {
            if (err) {
                console.error('Ошибка при получении пользователей:', err.message);
                reject(err);
            } else {
                resolve(res.rows);
            }
        });
    });
};

const deleteTask = (taskId) => {
    pool.query(`DELETE FROM tasks WHERE id = $1`, [taskId], (err) => {
        if (err) {
            console.error('Ошибка при удалении задачи:', err.message);
        } else {
            console.log('Задача успешно удалена из базы данных');
        }
    });
};

const updateTask = (taskId, text, date, creator, recipient, success, group_id) => {
    pool.query(
        `UPDATE tasks SET text = $1, date = $2, creator = $3, recipient = $4, success = $5, group_id = $6 WHERE id = $7`,
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
        pool.query(`SELECT * FROM tasks WHERE recipient = $1`, [to], (err, res) => {
            if (err) {
                console.error('Ошибка при получении задач:', err.message);
                reject(err);
            } else {
                resolve(res.rows);
            }
        });
    });
};

const addGroup = (group_name, creator) => {
    pool.query(`INSERT INTO groups (group_name, creator) VALUES ($1, $2)`, [group_name, creator], (err) => {
        if (err) {
            console.error('Ошибка при добавлении группы:', err.message);
        } else {
            console.log('Группа успешно добавлена в базу данных');
        }
    });
};

const moveTaskToNextDay = (task, currentDate) => {
    const [day, month, year] = task.date.split('.');
    const nextDate = new Date(Number(year), Number(month) - 1, Number(day));
    nextDate.setDate(nextDate.getDate() + 1);
    const formattedNextDate = nextDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
    updateTask(task.id, task.text, formattedNextDate, task.creator, task.recipient, task.group_id);
};

const getTaskById = (taskId) => {
    return new Promise((resolve, reject) => {
        pool.query(`SELECT * FROM tasks WHERE id = $1`, [taskId], (err, res) => {
            if (err) {
                console.error('Ошибка при получении задачи по ID:', err.message);
                reject(err);
            } else {
                resolve(res.rows[0]);
            }
        });
    });
};

const deleteGroup = (groupId) => {
    pool.query(`DELETE FROM groups WHERE id = $1`, [groupId], (err) => {
        if (err) {
            console.error('Ошибка при удалении группы:', err.message);
        } else {
            console.log('Группа успешно удалена из базы данных');
        }
    });
};

const getAllTasksInUsers = (user) => {
    return new Promise((resolve, reject) => {
        pool.query(`SELECT * FROM tasks WHERE creator = $1`, [user], (err, res) => {
            if (err) {
                console.error('Ошибка при получении задач в группе:', err.message);
                reject(err);
            } else {
                console.log("Tasks fetched successfully for user:", res.rows);
                resolve(res.rows);
            }
        });
    });
};

const getAllGroupsByUsername = (username) => {
    return new Promise((resolve, reject) => {
        pool.query(`SELECT * FROM groups WHERE creator = $1`, [username], (err, res) => {
            if (err) {
                console.error('Ошибка при получении групп по имени пользователя:', err.message);
                reject(err);
            } else {
                resolve(res.rows);
            }
        });
    });
};

const checkUser = (username) => {
    return new Promise((resolve, reject) => {
        pool.query('SELECT * FROM users WHERE username = $1', [username], (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res.rows[0]);
            }
        });
    });
};

const getUserByPhoneNumber = (phoneNumber) => {
    return new Promise((resolve, reject) => {
        pool.query(`SELECT * FROM users WHERE phone_number = $1`, [phoneNumber], (err, res) => {
            if (err) {
                console.error('Ошибка при выполнении запроса:', err.message);
                reject(err);
            } else {
                resolve(res.rows[0]);
            }
        });
    });
};

const getUserByChatId = (chatId) => {
    return new Promise((resolve, reject) => {
        pool.query(`SELECT * FROM users WHERE id = $1`, [chatId], (err, res) => {
            if (err) {
                console.error('Ошибка при выполнении запроса:', err.message);
                reject(err);
            } else {
                resolve(res.rows[0]);
            }
        });
    });
};

const getAllTasksInGroup = (group_id) => {
    return new Promise((resolve, reject) => {
        pool.query(`SELECT * FROM tasks WHERE group_id = $1`, [group_id], (err, res) => {
            if (err) {
                console.error('Ошибка при получении задач в группе:', err.message);
                reject(err);
            } else {
                resolve(res.rows);
            }
        });
    });
};

const addUserToGroup = (group_id, username) => {
    pool.query(`INSERT INTO groupsUsers (group_id, username) VALUES ($1, $2)`, [group_id, username], (err) => {
        if (err) {
            console.error('Ошибка при добавлении пользователя в группу:', err.message);
        } else {
            console.log('Пользователь успешно добавлен в группу');
        }
    });
};

const deleteUserFromGroup = (group_id, username) => {
    pool.query(`DELETE FROM groupsUsers WHERE group_id = $1 AND username = $2`, [group_id, username], (err) => {
        if (err) {
            console.error('Ошибка при удалении пользователя из группы:', err.message);
        } else {
            console.log('Пользователь успешно удален из группы');
        }
    });
};

const getAllUsersInGroup = (group_id) => {
    return new Promise((resolve, reject) => {
        pool.query(`SELECT * FROM groupsUsers WHERE group_id = $1`, [group_id], (err, res) => {
            if (err) {
                console.error('Ошибка при получении пользователей в группе:', err.message);
                reject(err);
            } else {
                resolve(res.rows);
            }
        });
    });
};

const getUserByUsername = (username) => {
    return new Promise((resolve, reject) => {
        pool.query(`SELECT * FROM users WHERE username = $1`, [username], (err, res) => {
            if (err) {
                console.error('Ошибка при выполнении запроса:', err.message);
                reject(err);
            } else {
                resolve(res.rows[0]);
            }
        });
    });
};

module.exports = {
    addUser,
    getChatID,
    updateUser,
    addTask,
    getAllUsers,
    deleteTask,
    updateTask,
    getAllTasksByTo,
    addGroup,
    moveTaskToNextDay,
    getTaskById,
    deleteGroup,
    getAllTasksInUsers,
    getAllGroupsByUsername,
    checkUser,
    getUserByPhoneNumber,
    getUserByChatId,
    getAllTasksInGroup,
    addUserToGroup,
    deleteUserFromGroup,
    getAllUsersInGroup,
    getUserByUsername
};
