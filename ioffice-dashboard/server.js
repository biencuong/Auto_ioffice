const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ===================== PATHS =====================
const WORKSPACE = path.join(__dirname, '..');
const MEMORY_DIR = path.join(WORKSPACE, 'memory', 'ioffice');
const SKILL_DIR = path.join(WORKSPACE, 'skills', 'ioffice-agent');
const PROMPTS_FILE = path.join(SKILL_DIR, 'data', 'prompts.json');
const LEGACY_TASK_DB = path.join(WORKSPACE, 'skills', 'hbs-task-tracker', 'scripts', 'data', 'task_db.json');
const TASK_DB = process.env.IOFFICE_TASK_DB || (fs.existsSync(LEGACY_TASK_DB)
    ? LEGACY_TASK_DB
    : path.join(MEMORY_DIR, 'tasks', 'task_db.json'));
const BACKEND_CONFIG = path.join(WORKSPACE, '..', '..', 'backend', 'config.json');
const QWENPAW_BASE_URL = process.env.QWENPAW_BASE_URL || 'http://127.0.0.1:8088';
const APPROVAL_DB = path.join(MEMORY_DIR, 'approvals', 'proposals.json');

const IOFFICE_AGENTS = [
    {
        id: 'ioffice-orchestrator',
        name: 'Điều phối',
        role: 'Điều phối',
        model: 'pro',
        description: 'Nhận lệnh tiếng Việt, chia việc cho các agent con, tổng hợp báo cáo và yêu cầu duyệt trước thao tác rủi ro.'
    },
    {
        id: 'ioffice-browser',
        name: 'Trình duyệt iOffice',
        role: 'Tương tác iOffice',
        model: 'flash',
        description: 'Dùng trình duyệt AI để đọc iOffice, tải văn bản, thao tác form và chuẩn bị bước submit sau khi được duyệt.'
    },
    {
        id: 'ioffice-document',
        name: 'Văn bản',
        role: 'Đọc và soạn văn bản',
        model: 'flash',
        description: 'Đọc PDF/DOCX, trích xuất thông tin, soạn dự thảo, kiểm tra căn cứ và thể thức văn bản.'
    },
    {
        id: 'ioffice-memory-task',
        name: 'Bộ nhớ và công việc',
        role: 'Bộ nhớ và nhắc việc',
        model: 'flash-lite',
        description: 'Lưu nhật ký, quản lý hồ sơ xử lý, lịch việc, trạng thái duyệt và nhắc việc.'
    }
];

// ===================== HELPERS =====================
function readJSON(filePath, defaultVal = {}) {
    try {
        if (!fs.existsSync(filePath)) return defaultVal;
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch { return defaultVal; }
}

function writeJSON(filePath, data) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
}

function readDirFiles(dirPath, ext = '') {
    try {
        if (!fs.existsSync(dirPath)) return [];
        return fs.readdirSync(dirPath)
            .filter(f => !ext || f.endsWith(ext))
            .map(f => ({
                name: f,
                path: path.join(dirPath, f),
                modified: fs.statSync(path.join(dirPath, f)).mtime
            }))
            .sort((a, b) => b.modified - a.modified);
    } catch { return []; }
}

function readFileContent(filePath) {
    try {
        if (!fs.existsSync(filePath)) return '';
        return fs.readFileSync(filePath, 'utf8');
    } catch { return ''; }
}

async function fetchText(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 45000);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        const text = await response.text();
        return { ok: response.ok, status: response.status, text };
    } finally {
        clearTimeout(timeout);
    }
}

async function fetchJSON(url, options = {}) {
    const result = await fetchText(url, options);
    if (!result.ok) {
        throw new Error(`${result.status}: ${result.text.substring(0, 200)}`);
    }
    return result.text ? JSON.parse(result.text) : {};
}

function extractSseText(sseText) {
    const events = [];
    const chunks = [];

    for (const rawLine of sseText.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;

        try {
            const event = JSON.parse(payload);
            events.push(event);
            for (const item of event.output || []) {
                if (item.role !== 'assistant') continue;
                for (const content of item.content || []) {
                    if (content.type === 'text' && content.text) chunks.push(content.text);
                }
            }
        } catch {
            events.push({ parse_error: true, payload });
        }
    }

    return {
        text: chunks.join(''),
        events,
        status: events.length ? events[events.length - 1].status : 'unknown',
        session_id: events.findLast?.(e => e.session_id)?.session_id || null
    };
}

async function getQwenPawAgents() {
    try {
        return await fetchJSON(`${QWENPAW_BASE_URL}/api/agents`, { timeoutMs: 8000 });
    } catch (apiError) {
        try {
            return await fetchJSON(`${QWENPAW_BASE_URL}/agents`, { timeoutMs: 8000 });
        } catch {
            throw apiError;
        }
    }
}

// ===================== API: DASHBOARD STATS =====================
app.get('/api/stats', (req, res) => {
    const journalDir = path.join(MEMORY_DIR, 'journal');
    const processedDir = path.join(MEMORY_DIR, 'processed');
    const technicalDir = path.join(MEMORY_DIR, 'technical');

    // Count processed docs
    let processedCount = 0, successCount = 0, errorCount = 0;
    try {
        if (fs.existsSync(processedDir)) {
            const walkDir = (d) => {
                const entries = fs.readdirSync(d, { withFileTypes: true });
                for (const e of entries) {
                    const fullPath = path.join(d, e.name);
                    if (e.isDirectory()) walkDir(fullPath);
                    else if (e.name.endsWith('.md')) {
                        processedCount++;
                        const content = fs.readFileSync(fullPath, 'utf8');
                        if (content.includes('success') || content.includes('thanh cong')) successCount++;
                        if (content.includes('error') || content.includes('loi') || content.includes('fail')) errorCount++;
                    }
                }
            };
            walkDir(processedDir);
        }
    } catch {}

    const journalFiles = readDirFiles(journalDir, '.md');
    const technicalFiles = readDirFiles(technicalDir, '.md');

    // Get Gemini quota status
    let geminiStatus = { ok: false, requests_ok: 0, requests_err: 0 };
    // We'll fetch this async from frontend

    res.json({
        stats: {
            totalProcessed: processedCount,
            successCount,
            errorCount,
            successRate: processedCount > 0 ? Math.round(successCount / processedCount * 100) : 0,
            journalDays: journalFiles.length,
            technicalDocs: technicalFiles.length,
            lastJournalDate: journalFiles.length > 0 ? journalFiles[0].name.replace('.md', '') : null
        },
        recentJournals: journalFiles.slice(0, 7).map(f => ({
            date: f.name.replace('.md', ''),
            modified: f.modified
        })),
        system: {
            memoryReady: fs.existsSync(MEMORY_DIR),
            skillReady: fs.existsSync(SKILL_DIR),
            taskDbReady: fs.existsSync(TASK_DB),
            backendConfig: fs.existsSync(BACKEND_CONFIG)
        }
    });
});

// ===================== API: QWENPAW RUNTIME =====================
app.get('/api/qwenpaw/status', async (req, res) => {
    try {
        const version = await fetchJSON(`${QWENPAW_BASE_URL}/api/version`, { timeoutMs: 5000 });
        res.json({
            ok: true,
            baseUrl: QWENPAW_BASE_URL,
            version: version.version || version,
            raw: version
        });
    } catch (e) {
        res.json({
            ok: false,
            baseUrl: QWENPAW_BASE_URL,
            error: e.message,
            hint: 'Start QwenPaw with: qwenpaw app'
        });
    }
});

app.get('/api/qwenpaw/agents', async (req, res) => {
    try {
        const runtimeAgents = await getQwenPawAgents();
        const list = Array.isArray(runtimeAgents) ? runtimeAgents : (runtimeAgents.agents || runtimeAgents.items || []);
        const normalized = IOFFICE_AGENTS.map(agent => {
            const runtime = list.find(item => item.id === agent.id || item.agent_id === agent.id || item.name === agent.name);
            return {
                ...agent,
                online: Boolean(runtime),
                runtime: runtime || null
            };
        });

        res.json({
            ok: true,
            baseUrl: QWENPAW_BASE_URL,
            agents: normalized,
            runtimeAgents: list
        });
    } catch (e) {
        res.json({
            ok: false,
            baseUrl: QWENPAW_BASE_URL,
            agents: IOFFICE_AGENTS.map(agent => ({ ...agent, online: false })),
            error: e.message
        });
    }
});

app.post('/api/qwenpaw/chat', async (req, res) => {
    const { agentId, message, sessionId, userId } = req.body || {};
    if (!agentId) return res.status(400).json({ error: 'Missing agentId' });
    if (!message || !message.trim()) return res.status(400).json({ error: 'Missing message' });

    const payload = {
        input: [
            {
                role: 'user',
                content: [{ type: 'text', text: message }]
            }
        ],
        session_id: sessionId || `ioffice-${agentId}`,
        user_id: userId || 'auto-ioffice-dashboard',
        channel: 'console'
    };

    try {
        const result = await fetchText(`${QWENPAW_BASE_URL}/api/console/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Agent-Id': agentId
            },
            body: JSON.stringify(payload),
            timeoutMs: 180000
        });

        if (!result.ok) {
            return res.status(result.status).json({ error: result.text.substring(0, 1000) });
        }

        const parsed = extractSseText(result.text);
        res.json({
            ok: true,
            agentId,
            sessionId: parsed.session_id || payload.session_id,
            status: parsed.status,
            text: parsed.text,
            events: parsed.events.slice(-20)
        });
    } catch (e) {
        res.status(502).json({
            ok: false,
            error: e.message,
            hint: 'Make sure QwenPaw is running and the agent exists.'
        });
    }
});

// ===================== API: APPROVAL GUARDRAIL =====================
app.get('/api/action-proposals', (req, res) => {
    const db = readJSON(APPROVAL_DB, { proposals: [] });
    res.json(db);
});

app.post('/api/action-proposals', (req, res) => {
    const db = readJSON(APPROVAL_DB, { proposals: [] });
    const proposal = {
        id: `proposal-${Date.now()}`,
        title: req.body.title || 'Tác vụ cần duyệt',
        action_type: req.body.action_type || 'manual_review',
        target: req.body.target || '',
        content: req.body.content || '',
        source_agent: req.body.source_agent || '',
        risk: req.body.risk || 'normal',
        status: 'pending',
        created_at: new Date().toISOString(),
        approved_at: null,
        approved_by: null
    };
    db.proposals = db.proposals || [];
    db.proposals.unshift(proposal);
    writeJSON(APPROVAL_DB, db);
    res.json({ status: 'ok', proposal });
});

app.put('/api/action-proposals/:id', (req, res) => {
    const db = readJSON(APPROVAL_DB, { proposals: [] });
    const idx = (db.proposals || []).findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Proposal not found' });

    const nextStatus = req.body.status;
    if (!['pending', 'approved', 'rejected', 'done'].includes(nextStatus)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    db.proposals[idx] = {
        ...db.proposals[idx],
        status: nextStatus,
        approved_at: nextStatus === 'approved' ? new Date().toISOString() : db.proposals[idx].approved_at,
        approved_by: nextStatus === 'approved' ? (req.body.approved_by || 'user') : db.proposals[idx].approved_by,
        updated_at: new Date().toISOString()
    };
    writeJSON(APPROVAL_DB, db);
    res.json({ status: 'ok', proposal: db.proposals[idx] });
});

// ===================== API: JOURNAL =====================
app.get('/api/journal', (req, res) => {
    const journalDir = path.join(MEMORY_DIR, 'journal');
    const date = req.query.date;
    
    if (date) {
        const filePath = path.join(journalDir, `${date}.md`);
        const content = readFileContent(filePath);
        const exists = fs.existsSync(filePath);
        return res.json({ date, content, exists });
    }
    
    const files = readDirFiles(journalDir, '.md');
    const journals = files.map(f => ({
        date: f.name.replace('.md', ''),
        modified: f.modified,
        preview: readFileContent(f.path).substring(0, 200) + '...'
    }));
    res.json({ journals });
});

app.post('/api/journal', (req, res) => {
    const { date, content } = req.body;
    if (!date) return res.status(400).json({ error: 'Missing date' });
    
    const journalDir = path.join(MEMORY_DIR, 'journal');
    if (!fs.existsSync(journalDir)) fs.mkdirSync(journalDir, { recursive: true });
    
    const filePath = path.join(journalDir, `${date}.md`);
    writeJSON.__proto__; //reset
    fs.writeFileSync(filePath, content || '', 'utf8');
    res.json({ status: 'ok', date, path: filePath });
});

// ===================== API: PROCESSED DOCUMENTS =====================
app.get('/api/processed', (req, res) => {
    const processedDir = path.join(MEMORY_DIR, 'processed');
    const docs = [];
    
    try {
        if (!fs.existsSync(processedDir)) return res.json({ docs: [] });
        
        const walkDir = (d, depth = 0) => {
            if (depth > 4) return;
            const entries = fs.readdirSync(d, { withFileTypes: true });
            for (const e of entries) {
                const fullPath = path.join(d, e.name);
                if (e.isDirectory()) walkDir(fullPath, depth + 1);
                else if (e.name.endsWith('.md')) {
                    const content = readFileContent(fullPath);
                    const relPath = path.relative(processedDir, fullPath);
                    
                    // Parse basic info from content
                    const lines = content.split('\n');
                    const files = [];
                    let inFileSection = false;
                    for (const line of lines) {
                        if (line.includes('|') && (line.includes('.doc') || line.includes('.docx'))) {
                            inFileSection = true;
                            const parts = line.split('|').map(p => p.trim());
                            if (parts.length >= 3) {
                                files.push({
                                    name: parts[1] || '',
                                    result: parts[3] || '',
                                    note: parts[4] || ''
                                });
                            }
                        }
                    }
                    
                    docs.push({
                        id: relPath.replace(/\\/g, '/').replace('.md', ''),
                        path: relPath,
                        name: e.name,
                        modified: fs.statSync(fullPath).mtime,
                        files: files.slice(0, 20),
                        preview: content.substring(0, 300)
                    });
                }
            }
        };
        walkDir(processedDir);
    } catch {}
    
    docs.sort((a, b) => b.modified - a.modified);
    res.json({ docs, total: docs.length });
});

// ===================== API: TECHNICAL KNOWLEDGE =====================
app.get('/api/technical', (req, res) => {
    const techDir = path.join(MEMORY_DIR, 'technical');
    const files = readDirFiles(techDir, '.md');
    
    const docs = files.map(f => ({
        name: f.name.replace('.md', ''),
        path: f.name,
        modified: f.modified,
        content: readFileContent(f.path)
    }));
    res.json({ docs });
});

app.put('/api/technical/:name', (req, res) => {
    const techDir = path.join(MEMORY_DIR, 'technical');
    const filePath = path.join(techDir, `${req.params.name}.md`);
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Missing content' });
    fs.writeFileSync(filePath, content, 'utf8');
    res.json({ status: 'ok' });
});

// ===================== API: TASKS (hbs-tracker) =====================
app.get('/api/tasks', (req, res) => {
    const db = readJSON(TASK_DB, { tasks: [] });
    const status = req.query.status || 'all';
    
    let tasks = db.tasks || [];
    if (status !== 'all') {
        tasks = tasks.filter(t => t.status === status);
    }
    
    // Add from memory journal if not in task db
    res.json({
        tasks,
        total: tasks.length,
        pending: (db.tasks || []).filter(t => t.status === 'pending' || t.status === 'acknowledged').length,
        completed: (db.tasks || []).filter(t => t.status === 'completed').length
    });
});

app.post('/api/tasks', (req, res) => {
    const db = readJSON(TASK_DB, { tasks: [] });
    const task = {
        id: `ioffice-${Date.now()}`,
        ...req.body,
        created_at: new Date().toISOString(),
        status: req.body.status || 'pending'
    };
    db.tasks = db.tasks || [];
    db.tasks.push(task);
    writeJSON(TASK_DB, db);
    res.json({ status: 'ok', task });
});

app.put('/api/tasks/:id', (req, res) => {
    const db = readJSON(TASK_DB, { tasks: [] });
    const idx = (db.tasks || []).findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Task not found' });
    db.tasks[idx] = { ...db.tasks[idx], ...req.body, updated_at: new Date().toISOString() };
    writeJSON(TASK_DB, db);
    res.json({ status: 'ok', task: db.tasks[idx] });
});

app.delete('/api/tasks/:id', (req, res) => {
    const db = readJSON(TASK_DB, { tasks: [] });
    db.tasks = (db.tasks || []).filter(t => t.id !== req.params.id);
    writeJSON(TASK_DB, db);
    res.json({ status: 'ok' });
});

// ===================== API: PROMPTS / TEMPLATES =====================
app.get('/api/prompts', (req, res) => {
    const prompts = readJSON(PROMPTS_FILE, { prompts: [] });
    res.json(prompts);
});

app.post('/api/prompts', (req, res) => {
    const db = readJSON(PROMPTS_FILE, { prompts: [] });
    const prompt = {
        id: `prompt-${Date.now()}`,
        ...req.body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    db.prompts = db.prompts || [];
    db.prompts.push(prompt);
    writeJSON(PROMPTS_FILE, db);
    res.json({ status: 'ok', prompt });
});

app.put('/api/prompts/:id', (req, res) => {
    const db = readJSON(PROMPTS_FILE, { prompts: [] });
    const idx = (db.prompts || []).findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Prompt not found' });
    db.prompts[idx] = { ...db.prompts[idx], ...req.body, updated_at: new Date().toISOString() };
    writeJSON(PROMPTS_FILE, db);
    res.json({ status: 'ok', prompt: db.prompts[idx] });
});

app.delete('/api/prompts/:id', (req, res) => {
    const db = readJSON(PROMPTS_FILE, { prompts: [] });
    db.prompts = (db.prompts || []).filter(p => p.id !== req.params.id);
    writeJSON(PROMPTS_FILE, db);
    res.json({ status: 'ok' });
});

// ===================== API: CONFIG =====================
app.get('/api/config', (req, res) => {
    const config = readJSON(BACKEND_CONFIG, {});
    // Hide password
    if (config.password) config.password = '••••••••';
    res.json(config);
});

app.put('/api/config', (req, res) => {
    writeJSON(BACKEND_CONFIG, req.body);
    res.json({ status: 'ok' });
});

// ===================== API: GEMINI BRIDGE STATUS =====================
app.get('/api/gemini-status', async (req, res) => {
    try {
        const http = require('http');
        const data = await new Promise((resolve, reject) => {
            http.get('http://127.0.0.1:8759/api/status', (resp) => {
                let body = '';
                resp.on('data', chunk => body += chunk);
                resp.on('end', () => resolve(JSON.parse(body)));
            }).on('error', reject);
        });
        res.json({ ok: true, ...data });
    } catch (e) {
        res.json({ ok: false, error: e.message });
    }
});

app.get('/api/gemini-models', async (req, res) => {
    try {
        const http = require('http');
        const data = await new Promise((resolve, reject) => {
            http.get('http://127.0.0.1:8759/v1/models', (resp) => {
                let body = '';
                resp.on('data', chunk => body += chunk);
                resp.on('end', () => resolve(JSON.parse(body)));
            }).on('error', reject);
        });
        res.json({ ok: true, models: data.data || [] });
    } catch (e) {
        res.json({ ok: false, error: e.message });
    }
});

// ===================== API: SYSTEM LOGS =====================
app.get('/api/logs', (req, res) => {
    const logFiles = [
        path.join(WORKSPACE, '..', '..', 'backend', 'current.log'),
        path.join(WORKSPACE, 'qwenpaw.log'),
    ];
    
    const logs = logFiles.filter(f => fs.existsSync(f)).map(f => ({
        path: f,
        name: path.basename(f),
        content: readFileContent(f).substring(0, 5000),
        size: fs.existsSync(f) ? fs.statSync(f).size : 0
    }));
    res.json({ logs });
});

// ===================== API: MEMORY SEARCH =====================
app.get('/api/memory/search', (req, res) => {
    const query = (req.query.q || '').toLowerCase();
    if (!query) return res.json({ results: [] });
    
    const results = [];
    const searchDir = (d, depth = 0) => {
        if (depth > 3) return;
        try {
            const entries = fs.readdirSync(d, { withFileTypes: true });
            for (const e of entries) {
                const fullPath = path.join(d, e.name);
                if (e.isDirectory()) searchDir(fullPath, depth + 1);
                else if (e.name.endsWith('.md')) {
                    const content = readFileContent(fullPath);
                    if (content.toLowerCase().includes(query)) {
                        const lines = content.split('\n');
                        const matchingLines = lines
                            .map((line, i) => line.toLowerCase().includes(query) ? { line: i + 1, text: line.trim() } : null)
                            .filter(Boolean)
                            .slice(0, 3);
                        results.push({
                            path: path.relative(MEMORY_DIR, fullPath),
                            name: e.name,
                            matches: matchingLines.length,
                            snippets: matchingLines
                        });
                    }
                }
            }
        } catch {}
    };
    
    if (fs.existsSync(MEMORY_DIR)) searchDir(MEMORY_DIR);
    res.json({ results: results.slice(0, 20) });
});

// ===================== START SERVER =====================
const PORT = process.env.PORT || 3456;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🏛️  iOffice Dashboard Server running at http://localhost:${PORT}`);
    console.log(`📁 Memory dir: ${MEMORY_DIR}`);
    console.log(`📋 Task DB: ${TASK_DB}`);
    console.log(`📝 Prompts file: ${PROMPTS_FILE}`);
});
