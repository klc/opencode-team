import express from 'express';
import cors from 'cors';
import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Root path of the project (parent of kanban-board)
const ROOT_DIR = join(__dirname, '..');
const KANBAN_DIR = join(ROOT_DIR, '.kanban');

// Allowed root for path traversal protection — only paths under
// the user's home directory or the project root are permitted.
const HOME_DIR = process.env.HOME || process.env.USERPROFILE || ROOT_DIR;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(__dirname));

/**
 * Validate that a resolved path is safe to access.
 * Prevents path traversal attacks via ?dir=../../etc
 */
function isSafePath(targetPath) {
  const resolved = resolve(targetPath);
  // Allow paths under the user home directory or the project root
  const allowedRoots = [
    resolve(HOME_DIR),
    resolve(ROOT_DIR),
  ];
  return allowedRoots.some(root => resolved.startsWith(root + '/') || resolved === root);
}

app.get('/api/tasks', (req, res) => {
  const customDir = req.query.dir;
  let targetDir = customDir ? customDir : KANBAN_DIR;

  // Security: reject path traversal attempts
  if (customDir) {
    const resolvedCustom = resolve(customDir);
    if (!isSafePath(resolvedCustom)) {
      return res.status(403).json({
        error: 'Access denied: path is outside the allowed directory',
        path: customDir,
      });
    }
    targetDir = resolvedCustom;
  }

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
          task.triggers = [];
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
    const platform = process.platform;
    let command;

    if (platform === 'darwin') {
      // macOS
      command = `osascript -e 'POSIX path of (choose folder with prompt "Select Kanban Folder")'`;
    } else if (platform === 'linux') {
      // Linux — requires zenity (GNOME) or kdialog (KDE)
      command = `zenity --file-selection --directory --title="Select Kanban Folder" 2>/dev/null || kdialog --getexistingdirectory "$HOME" 2>/dev/null`;
    } else {
      // Windows or unsupported — fall back gracefully
      return res.json({ path: null, reason: 'Directory picker not supported on this platform. Enter the path manually.' });
    }

    const { stdout } = await execAsync(command);
    const path = stdout.trim();

    // Security: validate the selected path too
    if (path && !isSafePath(resolve(path))) {
      return res.status(403).json({ path: null, reason: 'Selected path is outside the allowed directory.' });
    }

    res.json({ path: path || null });
  } catch (err) {
    // User cancelled or tool not available
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
