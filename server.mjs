const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const {
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
} = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(cors());

app.post('/addUser', async (req, res) => {
    const { chatId, phoneNumber, username } = req.body;
    try {
        await addUser(chatId, phoneNumber, username);
        res.status(200).send('User added successfully');
    } catch (err) {
        res.status(500).send('Error adding user');
    }
});

app.post('/addTask', async (req, res) => {
    const { text, date, creator, recipient, group_id } = req.body;
    try {
        await addTask(text, date, creator, recipient, group_id);
        res.status(200).send('Task added successfully');
    } catch (err) {
        res.status(500).send('Error adding task');
    }
});

app.get('/getAllUsers', async (req, res) => {
    try {
        const users = await getAllUsers();
        res.status(200).json(users);
    } catch (err) {
        res.status(500).send('Error fetching users');
    }
});

app.post('/deleteTask', async (req, res) => {
    const { taskId } = req.body;
    try {
        await deleteTask(taskId);
        res.status(200).send('Task deleted successfully');
    } catch (err) {
        res.status(500).send('Error deleting task');
    }
});

app.post('/updateTask', async (req, res) => {
    const { taskId, text, date, creator, recipient, success, group_id } = req.body;
    try {
        await updateTask(taskId, text, date, creator, recipient, success, group_id);
        res.status(200).send('Task updated successfully');
    } catch (err) {
        res.status(500).send('Error updating task');
    }
});

app.post('/getAllTasksByTo', async (req, res) => {
    const { recipient } = req.body;
    try {
        const tasks = await getAllTasksByTo(recipient);
        res.status(200).json(tasks);
    } catch (err) {
        res.status(500).send('Error fetching tasks');
    }
});

app.post('/addGroup', async (req, res) => {
    const { group_name, creator } = req.body;
    try {
        await addGroup(group_name, creator);
        res.status(200).send('Group added successfully');
    } catch (err) {
        res.status(500).send('Error adding group');
    }
});

app.post('/deleteGroup', async (req, res) => {
    const { groupId } = req.body;
    try {
        await deleteGroup(groupId);
        res.status(200).send('Group deleted successfully');
    } catch (err) {
        res.status(500).send('Error deleting group');
    }
});

app.post('/moveTaskToNextDay', async (req, res) => {
    const { taskId, currentDate } = req.body;
    try {
        const task = await getTaskById(taskId);
        await moveTaskToNextDay(task, currentDate);
        res.status(200).send('Task moved to next day successfully');
    } catch (err) {
        res.status(500).send('Error moving task to next day');
    }
});

app.post('/getAllTasksInUsers', async (req, res) => {
    const { user } = req.body;
    try {
        const tasks = await getAllTasksInUsers(user);
        res.status(200).json(tasks);
    } catch (err) {
        res.status(500).send('Error fetching tasks for user');
    }
});

app.post('/getAllGroupsByUsername', async (req, res) => {
    const { username } = req.body;
    try {
        const groups = await getAllGroupsByUsername(username);
        res.status(200).json(groups);
    } catch (err) {
        res.status(500).send('Error fetching groups by username');
    }
});

app.post('/checkUser', async (req, res) => {
    const { username } = req.body;
    try {
        const user = await checkUser(username);
        res.status(200).json(user);
    } catch (err) {
        res.status(500).send('Error checking user');
    }
});

app.post('/getUserByPhoneNumber', async (req, res) => {
    const { phoneNumber } = req.body;
    try {
        const user = await getUserByPhoneNumber(phoneNumber);
        res.status(200).json(user);
    } catch (err) {
        res.status(500).send('Error fetching user by phone number');
    }
});

app.post('/getUserByChatId', async (req, res) => {
    const { chatId } = req.body;
    try {
        const user = await getUserByChatId(chatId);
        res.status(200).json(user);
    } catch (err) {
        res.status(500).send('Error fetching user by chat ID');
    }
});

app.post('/getAllTasksInGroup', async (req, res) => {
    const { group_id } = req.body;
    try {
        const tasks = await getAllTasksInGroup(group_id);
        res.status(200).json(tasks);
    } catch (err) {
        res.status(500).send('Error fetching tasks in group');
    }
});

app.post('/addUserToGroup', async (req, res) => {
    const { group_id, username } = req.body;
    try {
        await addUserToGroup(group_id, username);
        res.status(200).send('User added to group successfully');
    } catch (err) {
        res.status(500).send('Error adding user to group');
    }
});

app.post('/deleteUserFromGroup', async (req, res) => {
    const { group_id, username } = req.body;
    try {
        await deleteUserFromGroup(group_id, username);
        res.status(200).send('User removed from group successfully');
    } catch (err) {
        res.status(500).send('Error removing user from group');
    }
});

app.post('/getAllUsersInGroup', async (req, res) => {
    const { group_id } = req.body;
    try {
        const users = await getAllUsersInGroup(group_id);
        res.status(200).json(users);
    } catch (err) {
        res.status(500).send('Error fetching users in group');
    }
});

app.post('/getUserByUsername', async (req, res) => {
    const { username } = req.body;
    try {
        const user = await getUserByUsername(username);
        res.status(200).json(user);
    } catch (err) {
        res.status(500).send('Error fetching user by username');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
