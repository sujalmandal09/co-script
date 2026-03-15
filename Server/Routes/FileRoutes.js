const express = require('express');
const path = require('path');
const os = require('os');
const ws = require('../WorkspaceService');

const router = express.Router();

// Current workspace root (server-side state)
let workspaceRoot = null;

// GET /api/workspace/status
router.get('/status', (req, res) => {
    res.json({
        workspaceRoot,
        hasWorkspace: !!workspaceRoot,
        gitBranch: workspaceRoot ? ws.getGitBranch(workspaceRoot) : null,
    });
});

// POST /api/workspace/open — set workspace root and return tree
router.post('/open', (req, res) => {
    const { folderPath } = req.body;
    if (!folderPath) {
        return res.status(400).json({ error: 'Missing folderPath' });
    }

    try {
        const tree = ws.readDirectory(folderPath);
        workspaceRoot = folderPath;
        const gitBranch = ws.getGitBranch(folderPath);
        res.json({ workspaceRoot, tree, gitBranch });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/workspace/tree?path= — read a subdirectory
router.get('/tree', (req, res) => {
    const dirPath = req.query.path;
    if (!dirPath) {
        return res.status(400).json({ error: 'Missing path query' });
    }
    if (workspaceRoot && !ws.isPathSafe(workspaceRoot, dirPath)) {
        return res.status(403).json({ error: 'Access denied: path outside workspace' });
    }

    try {
        const tree = ws.readDirectory(dirPath);
        res.json({ tree });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/workspace/read?path= — read file content
router.get('/read', (req, res) => {
    const filePath = req.query.path;
    if (!filePath) {
        return res.status(400).json({ error: 'Missing path query' });
    }
    if (workspaceRoot && !ws.isPathSafe(workspaceRoot, filePath)) {
        return res.status(403).json({ error: 'Access denied: path outside workspace' });
    }

    try {
        const content = ws.readFile(filePath);
        res.json({ content, path: filePath });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/workspace/create — create file or folder
router.post('/create', (req, res) => {
    const { targetPath, type, content } = req.body;
    if (!targetPath || !type) {
        return res.status(400).json({ error: 'Missing targetPath or type' });
    }
    if (workspaceRoot && !ws.isPathSafe(workspaceRoot, targetPath)) {
        return res.status(403).json({ error: 'Access denied: path outside workspace' });
    }

    try {
        if (type === 'file') {
            ws.createFile(targetPath, content || '');
        } else {
            ws.createFolder(targetPath);
        }
        res.json({ success: true, path: targetPath });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/workspace/rename
router.put('/rename', (req, res) => {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) {
        return res.status(400).json({ error: 'Missing oldPath or newPath' });
    }
    if (workspaceRoot && (!ws.isPathSafe(workspaceRoot, oldPath) || !ws.isPathSafe(workspaceRoot, newPath))) {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        ws.renamePath(oldPath, newPath);
        res.json({ success: true, oldPath, newPath });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/workspace/delete
router.delete('/delete', (req, res) => {
    const { targetPath } = req.body;
    if (!targetPath) {
        return res.status(400).json({ error: 'Missing targetPath' });
    }
    if (workspaceRoot && !ws.isPathSafe(workspaceRoot, targetPath)) {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        ws.deletePath(targetPath);
        res.json({ success: true, path: targetPath });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/workspace/save — save file content
router.post('/save', (req, res) => {
    const { filePath, content } = req.body;
    if (!filePath) {
        return res.status(400).json({ error: 'Missing filePath' });
    }
    if (workspaceRoot && !ws.isPathSafe(workspaceRoot, filePath)) {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        ws.createFile(filePath, content || '');
        res.json({ success: true, path: filePath });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/workspace/home — return user home directory for folder picker
router.get('/home', (req, res) => {
    res.json({ home: os.homedir() });
});

module.exports = router;
