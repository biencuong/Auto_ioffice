// ============== iOffice Dashboard API Client ==============
const API = {
    base: '',
    
    async get(path) {
        const res = await fetch(`${this.base}${path}`);
        if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
        return res.json();
    },
    
    async post(path, body) {
        const res = await fetch(`${this.base}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`POST ${path}: ${res.status}`);
        return res.json();
    },
    
    async put(path, body) {
        const res = await fetch(`${this.base}${path}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`PUT ${path}: ${res.status}`);
        return res.json();
    },
    
    async del(path) {
        const res = await fetch(`${this.base}${path}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(`DELETE ${path}: ${res.status}`);
        return res.json();
    },
    
    // ========== DASHBOARD ==========
    getStats() { return this.get('/api/stats'); },
    getGeminiStatus() { return this.get('/api/gemini-status'); },
    getGeminiModels() { return this.get('/api/gemini-models'); },
    getQwenPawStatus() { return this.get('/api/qwenpaw/status'); },
    getQwenPawAgents() { return this.get('/api/qwenpaw/agents'); },
    chatWithAgent(agentId, message, sessionId) {
        return this.post('/api/qwenpaw/chat', { agentId, message, sessionId });
    },
    
    // ========== JOURNAL ==========
    getJournals(date) { return this.get(`/api/journal${date ? `?date=${date}` : ''}`); },
    saveJournal(date, content) { return this.post('/api/journal', { date, content }); },
    
    // ========== DOCUMENTS ==========
    getProcessedDocs() { return this.get('/api/processed'); },
    
    // ========== TECHNICAL ==========
    getTechnical() { return this.get('/api/technical'); },
    saveTechnical(name, content) { return this.put(`/api/technical/${name}`, { content }); },
    
    // ========== TASKS ==========
    getTasks(status = 'all') { return this.get(`/api/tasks?status=${status}`); },
    createTask(task) { return this.post('/api/tasks', task); },
    updateTask(id, data) { return this.put(`/api/tasks/${id}`, data); },
    deleteTask(id) { return this.del(`/api/tasks/${id}`); },

    // ========== APPROVALS ==========
    getActionProposals() { return this.get('/api/action-proposals'); },
    createActionProposal(proposal) { return this.post('/api/action-proposals', proposal); },
    updateActionProposal(id, data) { return this.put(`/api/action-proposals/${id}`, data); },
    
    // ========== PROMPTS ==========
    getPrompts() { return this.get('/api/prompts'); },
    createPrompt(prompt) { return this.post('/api/prompts', prompt); },
    updatePrompt(id, data) { return this.put(`/api/prompts/${id}`, data); },
    deletePrompt(id) { return this.del(`/api/prompts/${id}`); },
    
    // ========== CONFIG ==========
    getConfig() { return this.get('/api/config'); },
    saveConfig(config) { return this.put('/api/config', config); },
    
    // ========== LOGS ==========
    getLogs() { return this.get('/api/logs'); },
    
    // ========== MEMORY SEARCH ==========
    searchMemory(q) { return this.get(`/api/memory/search?q=${encodeURIComponent(q)}`); },
};
