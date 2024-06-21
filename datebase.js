const admin = require('firebase-admin');
const serviceAccount = require('./tasks-8e07f-firebase-adminsdk-8syf7-b9331f1604.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const addUser = async (chatId, phone_number, username) => {
    try {
        await db.collection('users').doc(chatId).set({
            id: chatId,
            phone_number: phone_number,
            username: username,
            admin_status: 0,
            city: '',
            lang: '',
            code: '',
            attempts: 0
        });
        console.log('Пользователь успешно добавлен в базу данных');
    } catch (err) {
        console.error('Ошибка при добавлении пользователя:', err.message);
    }
};

const getChatID = async (phoneNumber) => {
    try {
        const snapshot = await db.collection('users').where('phone_number', '==', phoneNumber).get();
        if (snapshot.empty) {
            console.log('No matching documents.');
            return null;
        }
        return snapshot.docs[0].data().id;
    } catch (err) {
        console.error('Ошибка при выполнении запроса:', err.message);
        throw err;
    }
};

const updateUser = async (phoneNumber, code) => {
    try {
        const snapshot = await db.collection('users').where('phone_number', '==', phoneNumber).get();
        if (!snapshot.empty) {
            const userRef = snapshot.docs[0].ref;
            await userRef.update({ code: code });
            console.log('Данные пользователя успешно обновлены');
        }
    } catch (err) {
        console.error('Ошибка при обновлении данных пользователя:', err.message);
        throw err;
    }
};

const addTask = async (text, date, creator, recipient, group_id) => {
    try {
        await db.collection('tasks').add({
            text: text,
            date: date,
            creator: creator,
            recipient: recipient,
            success: '',
            group_id: group_id
        });
        console.log('Задача успешно добавлена в базу данных');
    } catch (err) {
        console.error('Ошибка при добавлении задачи:', err.message);
    }
};

const getAllUsers = async () => {
    try {
        const snapshot = await db.collection('users').get();
        return snapshot.docs.map(doc => doc.data());
    } catch (err) {
        console.error('Ошибка при получении пользователей:', err.message);
        throw err;
    }
};

const deleteTask = async (taskId) => {
    try {
        await db.collection('tasks').doc(taskId).delete();
        console.log('Задача успешно удалена из базы данных');
    } catch (err) {
        console.error('Ошибка при удалении задачи:', err.message);
    }
};

const updateTask = async (taskId, text, date, creator, recipient, success, group_id) => {
    try {
        await db.collection('tasks').doc(taskId).update({
            text: text,
            date: date,
            creator: creator,
            recipient: recipient,
            success: success,
            group_id: group_id
        });
        console.log('Данные задачи успешно обновлены');
    } catch (err) {
        console.error('Ошибка при обновлении задачи:', err.message);
    }
};

const getAllTasksByTo = async (to) => {
    try {
        const snapshot = await db.collection('tasks').where('recipient', '==', to).get();
        return snapshot.docs.map(doc => doc.data());
    } catch (err) {
        console.error('Ошибка при получении задач:', err.message);
        throw err;
    }
};

const addGroup = async (group_name, creator) => {
    try {
        await db.collection('groups').add({
            group_name: group_name,
            creator: creator
        });
        console.log('Группа успешно добавлена в базу данных');
    } catch (err) {
        console.error('Ошибка при добавлении группы:', err.message);
    }
};

const moveTaskToNextDay = async (task) => {
    try {
        const [day, month, year] = task.date.split('.');
        const nextDate = new Date(Number(year), Number(month) - 1, Number(day));
        nextDate.setDate(nextDate.getDate() + 1);
        const formattedNextDate = nextDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
        await updateTask(task.id, task.text, formattedNextDate, task.creator, task.recipient, task.success, task.group_id);
    } catch (err) {
        console.error('Ошибка при перемещении задачи на следующий день:', err.message);
    }
};

const getTaskById = async (taskId) => {
    try {
        const doc = await db.collection('tasks').doc(taskId).get();
        if (!doc.exists) {
            console.log('No such document!');
            return null;
        }
        return doc.data();
    } catch (err) {
        console.error('Ошибка при получении задачи по ID:', err.message);
        throw err;
    }
};

const deleteGroup = async (groupId) => {
    try {
        await db.collection('groups').doc(groupId).delete();
        console.log('Группа успешно удалена из базы данных');
    } catch (err) {
        console.error('Ошибка при удалении группы:', err.message);
    }
};

const getAllTasksInUsers = async (user) => {
    try {
        const snapshot = await db.collection('tasks').where('creator', '==', user).get();
        return snapshot.docs.map(doc => doc.data());
    } catch (err) {
        console.error('Ошибка при получении задач в группе:', err.message);
        throw err;
    }
};

const getAllGroupsByUsername = async (username) => {
    try {
        const snapshot = await db.collection('groups').where('creator', '==', username).get();
        return snapshot.docs.map(doc => doc.data());
    } catch (err) {
        console.error('Ошибка при получении групп по имени пользователя:', err.message);
        throw err;
    }
};

const checkUser = async (username) => {
    try {
        const snapshot = await db.collection('users').where('username', '==', username).get();
        if (snapshot.empty) {
            return null;
        }
        return snapshot.docs[0].data();
    } catch (err) {
        console.error('Ошибка при проверке пользователя:', err.message);
        throw err;
    }
};

const getUserByPhoneNumber = async (phoneNumber) => {
    try {
        const snapshot = await db.collection('users').where('phone_number', '==', phoneNumber).get();
        if (snapshot.empty) {
            return null;
        }
        return snapshot.docs[0].data();
    } catch (err) {
        console.error('Ошибка при выполнении запроса:', err.message);
        throw err;
    }
};

const getUserByChatId = async (chatId) => {
    try {
        const doc = await db.collection('users').doc(chatId).get();
        if (!doc.exists) {
            console.log('No such document!');
            return null;
        }
        return doc.data();
    } catch (err) {
        console.error('Ошибка при выполнении запроса:', err.message);
        throw err;
    }
};

const getAllTasksInGroup = async (group_id) => {
    try {
        const snapshot = await db.collection('tasks').where('group_id', '==', group_id).get();
        return snapshot.docs.map(doc => doc.data());
    } catch (err) {
        console.error('Ошибка при получении задач в группе:', err.message);
        throw err;
    }
};

const addUserToGroup = async (group_name, group_id, group_creator, username) => {
    try {
        await db.collection('groupsUsers').add({
            group_name: group_name,
            group_id: group_id,
            group_creator: group_creator,
            username: username
        });
        console.log('Пользователь успешно добавлен в группу');
    } catch (err) {
        console.error('Ошибка при добавлении пользователя в группу:', err.message);
    }
};

const getGroupsByUsername = async (username) => {
    try {
        const snapshot = await db.collection('groupsUsers').where('username', '==', username).get();
        return snapshot.docs.map(doc => doc.data());
    } catch (err) {
        console.error('Ошибка при получении групп по имени пользователя:', err.message);
        throw err;
    }
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
    getGroupsByUsername
};
