import express from 'express';
import cors from 'cors';
import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Root path of the project (parent of kanban-board)
const ROOT_DIR = join(__dirname, '..');
const KANBAN_DIR = join(ROOT_DIR, '.kanban');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(__dirname));

app.get('/api/tasks', (req, res) => {
  const customDir = req.query.dir;
  let targetDir = customDir ? customDir : KANBAN_DIR;

  // Auto-detect .kanban subdirectory if it exists in the provided path
  if (existsSync(targetDir)) {
    const subKanban = join(targetDir, '.kanban');
    if (existsSync(subKanban) && statSync(subKanban).isDirectory()) {
      targetDir = subKanban;
    }
  }

  if (!existsSync(targetDir)) {
    return res.json({ 
      tasks: [], 
      error: 'Directory not found', 
      path: targetDir,
      isDefault: !customDir 
    });
  }

  try {
    const files = readdirSync(targetDir);
    const tasksData = [];

    // Read main tasks
    for (const file of files) {
      if (file !== 'index.json' && file.endsWith('.json')) {
        const filePath = join(targetDir, file);
        try {
          const fileContent = readFileSync(filePath, 'utf8');
          const task = JSON.parse(fileContent);
          task.triggers = []; // Initialize triggers array
          tasksData.push(task);
        } catch (err) {
          console.error(`Error reading or parsing file ${file}:`, err);
        }
      }
    }

    // Read triggers
    const readTriggersFromDir = (triggersDir) => {
      if (existsSync(triggersDir)) {
        const triggerFiles = readdirSync(triggersDir);
        for (const tFile of triggerFiles) {
          if (tFile.endsWith('.json')) {
            try {
              const tContent = readFileSync(join(triggersDir, tFile), 'utf8');
              const trigger = JSON.parse(tContent);
              
              if (trigger.taskId) {
                const targetTask = tasksData.find(t => t.id === trigger.taskId);
                if (targetTask) {
                  targetTask.triggers.push(trigger);
                }
              }
            } catch (err) {
              // Ignore invalid trigger files
            }
          }
        }
      }
    };

    readTriggersFromDir(join(targetDir, 'triggers'));
    readTriggersFromDir(join(targetDir, 'triggers', 'processed'));

    // Sort triggers by createdAt descending
    tasksData.forEach(task => {
      task.triggers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    });

    res.json({ tasks: tasksData });
  } catch (err) {
    console.error('Error reading .kanban directory:', err);
    res.status(500).json({ error: 'Internal server error while reading tasks' });
  }
});

app.get('/api/browse', async (req, res) => {
  try {
    // macOS specific folder picker using osascript
    const command = `osascript -e 'POSIX path of (choose folder with prompt "Select Kanban Folder")'`;
    const { stdout } = await execAsync(command);
    
    // Clean up trailing newline and return
    const path = stdout.trim();
    res.json({ path });
  } catch (err) {
    // If user cancels (non-zero exit code), just return null path
    res.json({ path: null });
  }
});

function startServer(port) {
  app.listen(port, () => {
    console.log(`Kanban Board Server running at http://localhost:${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is busy, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error(err);
    }
  });
}

startServer(PORT);
