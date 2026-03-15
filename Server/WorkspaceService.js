const fs = require('fs');
const path = require('path');

// Directories/files to skip when reading directory trees
const IGNORED = new Set([
    'node_modules', '.git', '.DS_Store', '__pycache__',
    '.idea', '.vscode', 'dist', 'build', '.next', 'coverage',
]);

/**
 * Validate that `target` is inside `root` to prevent directory traversal.
 */
function isPathSafe(root, target) {
    const resolved = path.resolve(target);
    const resolvedRoot = path.resolve(root);
    return resolved.startsWith(resolvedRoot + path.sep) || resolved === resolvedRoot;
}

/**
 * Read a directory and return its contents (non-recursive, for lazy loading).
 * Returns array of { name, type: 'file'|'directory', path }
 */
function readDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        throw new Error(`Directory not found: ${dirPath}`);
    }

    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) {
        throw new Error(`Not a directory: ${dirPath}`);
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const result = [];

    for (const entry of entries) {
        if (IGNORED.has(entry.name)) continue;
        // Skip hidden files starting with . (except .env)
        if (entry.name.startsWith('.') && entry.name !== '.env' && entry.name !== '.gitignore') continue;

        result.push({
            name: entry.name,
            type: entry.isDirectory() ? 'directory' : 'file',
            path: path.join(dirPath, entry.name),
        });
    }

    // Sort: directories first, then files, alphabetically
    result.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
    });

    return result;
}

/**
 * Read file contents as UTF-8 string.
 */
function readFile(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Create a new file with optional content.
 */
function createFile(filePath, content = '') {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Create a new folder.
 */
function createFolder(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Rename a file or folder.
 */
function renamePath(oldPath, newPath) {
    if (!fs.existsSync(oldPath)) {
        throw new Error(`Not found: ${oldPath}`);
    }
    fs.renameSync(oldPath, newPath);
}

/**
 * Delete a file or folder (recursive).
 */
function deletePath(targetPath) {
    if (!fs.existsSync(targetPath)) {
        throw new Error(`Not found: ${targetPath}`);
    }
    fs.rmSync(targetPath, { recursive: true, force: true });
}

/**
 * Get Git branch name (optional, best-effort).
 */
function getGitBranch(workspacePath) {
    try {
        const headFile = path.join(workspacePath, '.git', 'HEAD');
        if (fs.existsSync(headFile)) {
            const content = fs.readFileSync(headFile, 'utf-8').trim();
            if (content.startsWith('ref: refs/heads/')) {
                return content.replace('ref: refs/heads/', '');
            }
            return content.substring(0, 7); // Detached HEAD, show short hash
        }
    } catch (e) {
        // ignore
    }
    return null;
}

module.exports = {
    readDirectory,
    readFile,
    createFile,
    createFolder,
    renamePath,
    deletePath,
    isPathSafe,
    getGitBranch,
};
