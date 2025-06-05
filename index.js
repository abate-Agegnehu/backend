const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const tasksFilePath = path.join(__dirname, 'tasks.json');

async function initializeTasksFile() {
    try {
        await fs.access(tasksFilePath);
    } catch {
        await fs.writeFile(tasksFilePath, JSON.stringify([], null, 2));
    }
}

async function readTasks() {
    const data = await fs.readFile(tasksFilePath, 'utf8');
    return JSON.parse(data);
}

async function writeTasks(tasks) {
    await fs.writeFile(tasksFilePath, JSON.stringify(tasks, null, 2));
}

app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await readTasks();
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Error reading tasks' });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const { title } = req.body;
        
        if (!title || title.trim() === '') {
            return res.status(400).json({ error: 'Title is required' });
        }

        const tasks = await readTasks();
        const newTask = {
            id: tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
            title,
            completed: false
        };
        
        tasks.push(newTask);
        await writeTasks(tasks);
        
        res.status(201).json(newTask);
    } catch (error) {
        res.status(500).json({ error: 'Error creating task' });
    }
});

app.patch('/api/tasks/:id', async (req, res) => {
    try {
        const taskId = parseInt(req.params.id);
        const { completed, title } = req.body;
        const tasks = await readTasks();
        
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        if (taskIndex === -1) {
            return res.status(404).json({ error: 'Task not found' });
        }

        tasks[taskIndex] = {
            ...tasks[taskIndex],
            ...(title !== undefined && { title }),
            ...(completed !== undefined && { completed })
        };

        await writeTasks(tasks);

        const updatedTasks = await readTasks();
        const updatedTask = updatedTasks.find(task => task.id === taskId);

        if (!updatedTask) {
            throw new Error('Failed to verify task update');
        }

        res.json({
            message: 'Task updated successfully',
            task: updatedTask
        });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Error updating task' });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const taskId = parseInt(req.params.id);
        const tasks = await readTasks();
        
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        if (taskIndex === -1) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        const deletedTask = tasks.splice(taskIndex, 1)[0];
        await writeTasks(tasks);
        
        res.json({
            message: 'Task deleted successfully',
            task: deletedTask
        });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting task' });
    }
});

initializeTasksFile().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}); 