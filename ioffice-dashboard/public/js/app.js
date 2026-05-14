/* ===========================================================
   iOffice AI Agent Dashboard — App Engine
   Layout: Header + Drawer (phong cách xekhachhagiang Admin)
   =========================================================== */

const state = {
  currentPage: 'dashboard',
  tasks: [],
  prompts: [],
  docs: [],
  techDocs: [],
  journalDate: new Date().toISOString().split('T')[0],
  techDocName: '',
  configData: {},
  taskFilter: 'all',
  promptFilter: 'all'
};

/* ===================== INIT ===================== */
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initNavigation();
  initDrawer();
  initModalEscape();
  document.getElementById('todayDate').textContent = new Date().toLocaleDateString('vi-VN');
  loadDashboard();
  checkSystemStatus();
  setInterval(checkSystemStatus, 30000);
});

function initClock() {
  function tick() {
    const now = new Date();
    document.getElementById('clock').textContent = now.toLocaleTimeString('vi-VN', {
      hour: '2-digit', minute: '2-digit'
    });
  }
  tick();
  setInterval(tick, 10000);
}

function initDrawer() {
  const menuBtn = document.getElementById('menuToggle');
  const closeBtn = document.getElementById('drawerClose');
  const overlay = document.getElementById('drawerOverlay');
  const drawer = document.getElementById('drawer');

  function openDrawer() {
    drawer.classList.add('open');
    overlay.classList.add('open');
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
  }
  menuBtn.addEventListener('click', openDrawer);
  closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);
  window.closeDrawer = closeDrawer;
}

function initModalEscape() {
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

function initNavigation() {
  document.querySelectorAll('.drawer-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(item.dataset.page);
      window.closeDrawer();
    });
  });
}

/* ===================== NAVIGATION ===================== */
function navigateTo(page) {
  state.currentPage = page;

  document.querySelectorAll('.drawer-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.drawer-item[data-page="${page}"]`)?.classList.add('active');

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${page}`);
  if (target) {
    target.classList.add('active');
    target.style.animation = 'none';
    requestAnimationFrame(() => { target.style.animation = ''; });
  }

  const titles = {
    dashboard: '📊 Tổng quan',
    documents: '📄 Văn bản đã xử lý',
    journal: '📅 Nhật ký công việc',
    tasks: '✅ Quản lý công việc',
    prompts: '🤖 Quản lý Prompt',
    knowledge: '📚 Kiến thức kỹ thuật',
    agents: '👤 Trạng thái Agent',
    config: '⚙️ Cấu hình hệ thống',
    logs: '📋 Nhật ký hệ thống'
  };
  document.getElementById('pageTitle').textContent = titles[page] || page;

  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'documents': loadDocuments(); break;
    case 'journal': loadJournal(); break;
    case 'tasks': loadTasks(); break;
    case 'prompts': loadPrompts(); break;
    case 'knowledge': loadTechDocs(); break;
    case 'agents': loadAgents(); break;
    case 'config': loadConfig(); break;
    case 'logs': loadLogs(); break;
  }
}

function refreshCurrentPage() { navigateTo(state.currentPage); }

/* ===================== STATUS ===================== */
async function checkSystemStatus() {
  try {
    const stats = await API.getStats();
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    if (stats.system?.memoryReady && stats.system?.skillReady) {
      dot.className = 'status-dot ok';
      text.textContent = '✅ Hệ thống OK';
    } else {
      dot.className = 'status-dot error';
      text.textContent = '⚠️ Cần khởi tạo';
    }
  } catch {
    document.getElementById('statusDot').className = 'status-dot error';
    document.getElementById('statusText').textContent = '❌ Mất kết nối';
  }
}

/* ===================== TOAST ===================== */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const icons = { success: 'âœ…', error: 'âŒ', info: 'â„¹ï¸' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || 'â„¹ï¸'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ===================== MODAL ===================== */
function openModal(title, bodyHtml, footerHtml) {
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.remove('hidden');
  document.getElementById('modalTitle').textContent = title || '';
  document.getElementById('modalBody').innerHTML = bodyHtml || '';
  document.getElementById('modalFooter').innerHTML = footerHtml || '';
}
function closeModal() { document.getElementById('modalOverlay').classList.add('hidden'); }

/* ===================== DASHBOARD ===================== */
async function loadDashboard() {
  try {
    const data = await API.getStats();
    const s = data.stats || {};

    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card">
        <div class="stat-top">
          <span class="stat-label">📄 Đã xử lý</span>
          <span class="stat-icon" style="background:var(--brand-50);color:var(--brand-500)">📊</span>
        </div>
        <div class="stat-number count-up">${s.totalProcessed || 0}</div>
        <div class="stat-label" style="margin-top:2px;">tổng văn bản</div>
      </div>
      <div class="stat-card">
        <div class="stat-top">
          <span class="stat-label">✅ Thành công</span>
          <span class="stat-icon" style="background:var(--success-bg);color:var(--success)">âœ“</span>
        </div>
        <div class="stat-number count-up" style="color:var(--success)">${s.successCount || 0}</div>
        <div class="stat-label" style="margin-top:2px;">${s.successRate || 0}% tỉ lệ</div>
      </div>
      <div class="stat-card">
        <div class="stat-top">
          <span class="stat-label">❌ Lỗi</span>
          <span class="stat-icon" style="background:var(--danger-bg);color:var(--danger)">âœ•</span>
        </div>
        <div class="stat-number count-up" style="color:var(--danger)">${s.errorCount || 0}</div>
        <div class="stat-label" style="margin-top:2px;">cần xử lý</div>
      </div>
      <div class="stat-card">
        <div class="stat-top">
          <span class="stat-label">📚 Tài liệu</span>
          <span class="stat-icon" style="background:var(--accent-50);color:var(--accent-600)">📖</span>
        </div>
        <div class="stat-number count-up">${s.technicalDocs || 0}</div>
        <div class="stat-label" style="margin-top:2px;">kiến thức kỹ thuật</div>
      </div>
    `;

    // Gemini
    try {
      const gemini = await API.getGeminiStatus();
      document.getElementById('geminiStatusCard').innerHTML = `
        <div class="gemini-card">
          <div class="gemini-icon">🧠</div>
          <div class="gemini-info">
            <div class="label">Gemini Bridge</div>
            <div class="value">${gemini.available ? 'âœ… Online' : 'âŒ Offline'} Â· v${gemini.version || '?'}</div>
          </div>
          <div style="text-align:right">
            <div class="label">Requests</div>
            <div style="font-weight:600;font-size:14px;">${gemini.requests_ok || 0} OK / ${gemini.requests_err || 0} Lỗi</div>
          </div>
        </div>
      `;
    } catch {
      document.getElementById('geminiStatusCard').innerHTML = '<div class="empty-state"><div class="empty-icon">🔌</div><h4>Mất kết nối Gemini</h4></div>';
    }

    // Recent journal
    const journalEl = document.getElementById('recentJournal');
    if (data.recentJournals && data.recentJournals.length > 0) {
      journalEl.innerHTML = data.recentJournals.map(j =>
        `<div class="task-item" onclick="navigateTo('journal')" style="cursor:pointer">
          <span style="font-size:16px">📅</span>
          <div class="task-content">
            <div class="task-title">${j.date}</div>
            <div class="task-meta">
              <span class="task-tag" style="background:var(--brand-50);color:var(--brand-500)">${new Date(j.modified).toLocaleString('vi-VN')}</span>
            </div>
          </div>
        </div>`
      ).join('');
    } else {
      journalEl.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><h4>Chưa có nhật ký</h4><p>Hôm nay chưa ghi nhật ký công việc nào</p></div>';
    }
  } catch {
    document.getElementById('statsGrid').innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h4>Không thể tải dữ liệu</h4></div>';
  }
}

/* ===================== DOCUMENTS ===================== */
async function loadDocuments() {
  try {
    const data = await API.getProcessedDocs();
    state.docs = data.docs || [];
    renderDocuments(state.docs);
  } catch {
    document.getElementById('docList').innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><h4>Lỗi tải dữ liệu</h4></div>';
  }
}

function renderDocuments(docs) {
  const el = document.getElementById('docList');
  if (!docs || docs.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📄</div><h4>Chưa có văn bản nào</h4><p>Các văn bản đã xử lý sẽ hiển thị tại đây</p></div>';
    return;
  }
  el.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>#</th><th>Tên văn bản</th><th>Kết quả</th><th>Ngày</th><th></th></tr></thead>
        <tbody>
          ${docs.map((doc, i) => {
            const name = doc.files?.map(f => f.name).filter(Boolean).join(', ') || doc.name || 'N/A';
            const result = doc.files?.[0]?.result || doc.result || 'unknown';
            const badge = result.includes('success') || result.includes('âœ…') ? 'badge-success' :
                          result.includes('error') || result.includes('âŒ') ? 'badge-danger' : 'badge-default';
            const date = doc.modified ? new Date(doc.modified).toLocaleDateString('vi-VN') : 'N/A';
            return `<tr>
              <td>${i + 1}</td>
              <td style="font-weight:500">${name}</td>
              <td><span class="badge ${badge}">${result}</span></td>
              <td style="color:var(--text-secondary)">${date}</td>
              <td><button class="btn btn-xs btn-ghost">👁️</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function filterDocs() {
  const q = document.getElementById('docSearch').value.toLowerCase();
  const filtered = state.docs.filter(d =>
    (d.name || '').toLowerCase().includes(q) ||
    (d.files || []).some(f => (f.name || '').toLowerCase().includes(q))
  );
  renderDocuments(filtered);
}

/* ===================== JOURNAL ===================== */
async function loadJournal() {
  document.getElementById('journalDateLabel').textContent = state.journalDate;
  try {
    const data = await API.getJournals(state.journalDate);
    document.getElementById('journalEditor').value = data.content ||
      `# Nhật ký: ${state.journalDate}\n\n## Tổng quan\n- Đã xử lý: 0/0 file\n- Thành công: 0\n- Lỗi: 0\n\n## Chi tiết\nChưa có dữ liệu.\n`;
  } catch {
    document.getElementById('journalEditor').value = `// Không thể tải nhật ký cho ngày ${state.journalDate}`;
  }
}

function journalNav(delta) {
  const d = new Date(state.journalDate);
  d.setDate(d.getDate() + delta);
  state.journalDate = d.toISOString().split('T')[0];
  loadJournal();
}

function journalToday() {
  state.journalDate = new Date().toISOString().split('T')[0];
  loadJournal();
}

async function saveJournal() {
  try {
    await API.saveJournal(state.journalDate, document.getElementById('journalEditor').value);
    showToast('✅ Đã lưu nhật ký!', 'success');
  } catch { showToast('❌ Lỗi lưu nhật ký!', 'error'); }
}

/* ===================== TASKS ===================== */
async function loadTasks() {
  try {
    const data = await API.getTasks(state.taskFilter);
    state.tasks = data.tasks || [];
    renderTasks();
  } catch {
    document.getElementById('taskList').innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><h4>Lỗi tải công việc</h4></div>';
  }
}

function setTaskFilter(filter, btn) {
  state.taskFilter = filter;
  document.querySelectorAll('#page-tasks .filter-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  loadTasks();
}

function renderTasks() {
  const el = document.getElementById('taskList');
  const tasks = state.tasks;
  if (!tasks || tasks.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">✅</div><h4>Không có công việc</h4><p>Nhấn "+ Thêm" để tạo công việc mới</p></div>';
    return;
  }
  el.innerHTML = tasks.map(t => {
    const done = t.status === 'done' || t.status === 'completed';
    const pColor = t.priority === 'cao' ? '#dc2626' : t.priority === 'thap' ? '#94a3b8' : '#d97706';
    const sBadge = done ? 'badge-success' : t.status === 'in_progress' ? 'badge-info' : 'badge-default';
    const sLabel = done ? 'Hoàn thành' : t.status === 'in_progress' ? 'Đang làm' : 'Chưa làm';
    return `
      <div class="task-item">
        <input type="checkbox" class="task-check" ${done ? 'checked' : ''} onchange="updateTaskStatus('${t.id}', this.checked ? 'done' : 'pending')">
        <div class="task-content">
          <div class="task-title ${done ? 'done' : ''}">${t.title || ''}</div>
          <div class="task-meta">
            <span class="task-tag" style="background:${pColor}15;color:${pColor}">${t.priority || 'trung_binh'}</span>
            <span class="badge ${sBadge}">${sLabel}</span>
            ${t.deadline ? `<span class="task-tag" style="background:var(--bg);color:var(--text-secondary)">📅 ${new Date(t.deadline).toLocaleDateString('vi-VN')}</span>` : ''}
            ${t.module ? `<span class="task-tag" style="background:var(--brand-50);color:var(--brand-500)">${t.module}</span>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:4px">
          <button class="btn btn-xs btn-ghost" onclick="openTaskModal('${t.id}')">âœï¸</button>
          <button class="btn btn-xs btn-ghost" onclick="deleteTask('${t.id}')" style="color:var(--danger)">🗑️</button>
        </div>
      </div>`;
  }).join('');
}

async function updateTaskStatus(id, status) {
  try { await API.updateTask(id, { status }); loadTasks(); showToast('✅ Đã cập nhật!', 'success'); }
  catch { showToast('❌ Lỗi cập nhật!', 'error'); }
}

async function deleteTask(id) {
  if (!confirm('Xoá công việc này?')) return;
  try { await API.deleteTask(id); loadTasks(); showToast('🗑️ Đã xoá!', 'info'); }
  catch { showToast('❌ Lỗi xoá!', 'error'); }
}

function openTaskModal(id) {
  const existing = id ? state.tasks.find(t => t.id === id) : null;
  const edit = !!existing;
  openModal(edit ? '✏️ Sửa công việc' : '➕ Thêm công việc',
    `<input type="hidden" id="taskId" value="${existing?.id || ''}">
    <div class="form-group">
      <label class="form-label">Tiêu đề *</label>
      <input type="text" class="form-input" id="taskTitle" value="${existing?.title || ''}" placeholder="Nhập tiêu đề...">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group">
        <label class="form-label">Mức độ</label>
        <select class="form-select" id="taskPriority">
          <option value="thap" ${existing?.priority === 'thap' ? 'selected' : ''}>Thấp</option>
          <option value="trung_binh" ${!existing || existing?.priority === 'trung_binh' ? 'selected' : ''}>Trung bình</option>
          <option value="cao" ${existing?.priority === 'cao' ? 'selected' : ''}>Cao</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Hạn chót</label>
        <input type="date" class="form-input" id="taskDeadline" value="${existing?.deadline ? existing.deadline.split('T')[0] : ''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Module</label>
      <select class="form-select" id="taskModule">
        <option value="general" ${existing?.module === 'general' ? 'selected' : ''}>Chung</option>
        <option value="ioffice" ${existing?.module === 'ioffice' ? 'selected' : ''}>iOffice</option>
        <option value="document" ${existing?.module === 'document' ? 'selected' : ''}>Văn bản</option>
        <option value="system" ${existing?.module === 'system' ? 'selected' : ''}>Hệ thống</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Trạng thái</label>
      <select class="form-select" id="taskStatus">
        <option value="pending" ${!existing || existing?.status === 'pending' ? 'selected' : ''}>Chưa làm</option>
        <option value="in_progress" ${existing?.status === 'in_progress' ? 'selected' : ''}>Đang làm</option>
        <option value="done" ${existing?.status === 'done' || existing?.status === 'completed' ? 'selected' : ''}>Hoàn thành</option>
      </select>
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Huỷ</button>
     <button class="btn btn-primary" onclick="saveTask()">${edit ? '💾 Cập nhật' : '➕ Tạo mới'}</button>`
  );
}

async function saveTask() {
  const id = document.getElementById('taskId').value;
  const data = {
    title: document.getElementById('taskTitle').value.trim(),
    priority: document.getElementById('taskPriority').value,
    deadline: document.getElementById('taskDeadline').value,
    module: document.getElementById('taskModule').value,
    status: document.getElementById('taskStatus').value
  };
  if (!data.title) { showToast('⚠️ Nhập tiêu đề!', 'error'); return; }
  try {
    if (id) { await API.updateTask(id, data); showToast('✅ Đã cập nhật!', 'success'); }
    else { await API.createTask(data); showToast('✅ Đã tạo!', 'success'); }
    closeModal(); loadTasks();
  } catch { showToast('❌ Lỗi lưu!', 'error'); }
}

/* ===================== PROMPTS ===================== */
async function loadPrompts() {
  try {
    const data = await API.getPrompts();
    state.prompts = data.prompts || [];
    renderPrompts();
  } catch {
    document.getElementById('promptList').innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><h4>Lỗi tải prompts</h4></div>';
  }
}

function setPromptFilter(filter, btn) {
  state.promptFilter = filter;
  document.querySelectorAll('#page-prompts .filter-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderPrompts();
}

function renderPrompts() {
  const el = document.getElementById('promptList');
  const list = state.promptFilter === 'all' ? state.prompts : state.prompts.filter(p => p.agent === state.promptFilter);
  if (!list || list.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🤖</div><h4>Chưa có Prompt nào</h4><p>Nhấn "+ Thêm Prompt" để tạo</p></div>';
    return;
  }
  el.innerHTML = `<div class="prompt-list">${list.map(p =>
    `<div class="prompt-card" onclick="openPromptModal('${p.id}')">
      <div class="prompt-card-header">
        <h4>${p.name || ''}</h4>
        <span class="badge badge-accent">${p.agent || ''}</span>
      </div>
      <div class="prompt-desc">${p.description || ''}</div>
      <div class="prompt-preview">${(p.content || '').substring(0, 150)}${(p.content || '').length > 150 ? '...' : ''}</div>
    </div>`
  ).join('')}</div>`;
}

function openPromptModal(id) {
  const existing = id ? state.prompts.find(p => p.id === id) : null;
  const edit = !!existing;
  openModal(edit ? `✏️ Sửa: ${existing.name}` : '➕ Thêm Prompt mới',
    `<input type="hidden" id="promptId" value="${existing?.id || ''}">
    <div class="form-group">
      <label class="form-label">Tên Prompt *</label>
      <input type="text" class="form-input" id="promptName" value="${existing?.name || ''}" placeholder="VD: doc-extract">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group">
        <label class="form-label">Agent</label>
        <select class="form-select" id="promptAgent">
          <option value="browser" ${existing?.agent === 'browser' ? 'selected' : ''}>Trình duyệt</option>
          <option value="document" ${existing?.agent === 'document' || !existing ? 'selected' : ''}>Document</option>
          <option value="memory" ${existing?.agent === 'memory' ? 'selected' : ''}>Memory</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Ngày tạo</label>
        <input type="text" class="form-input" value="${existing ? new Date(existing.created_at).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN')}" disabled>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Mô tả</label>
      <input type="text" class="form-input" id="promptDesc" value="${existing?.description || ''}" placeholder="Mô tả ngắn...">
    </div>
    <div class="form-group">
      <label class="form-label">Nội dung *</label>
      <textarea class="form-textarea" id="promptContent" rows="10" placeholder="Nhập nội dung prompt...">${existing?.content || ''}</textarea>
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Huỷ</button>
     ${edit ? `<button class="btn btn-ghost" onclick="deletePrompt('${existing.id}')" style="color:var(--danger);margin-right:auto">🗑️ Xoá</button>` : ''}
     <button class="btn btn-primary" onclick="savePrompt()">${edit ? '💾 Cập nhật' : '➕ Tạo mới'}</button>`
  );
}

async function savePrompt() {
  const id = document.getElementById('promptId').value;
  const data = {
    name: document.getElementById('promptName').value.trim(),
    agent: document.getElementById('promptAgent').value,
    description: document.getElementById('promptDesc').value.trim(),
    content: document.getElementById('promptContent').value
  };
  if (!data.name || !data.content) { showToast('⚠️ Nhập đủ thông tin!', 'error'); return; }
  try {
    if (id) { await API.updatePrompt(id, data); showToast('✅ Đã cập nhật!', 'success'); }
    else { await API.createPrompt(data); showToast('✅ Đã tạo!', 'success'); }
    closeModal(); loadPrompts();
  } catch { showToast('❌ Lỗi lưu!', 'error'); }
}

async function deletePrompt(id) {
  if (!confirm('Xoá prompt này?')) return;
  try { await API.deletePrompt(id); closeModal(); loadPrompts(); showToast('🗑️ Đã xoá!', 'info'); }
  catch { showToast('❌ Lỗi xoá!', 'error'); }
}

/* ===================== KNOWLEDGE ===================== */
async function loadTechDocs() {
  try {
    const data = await API.getTechnical();
    state.techDocs = data.docs || [];
    const tabsEl = document.getElementById('knowledgeTabs');
    if (!state.techDocs.length) {
      tabsEl.innerHTML = '';
      document.getElementById('knowledgeContent').innerHTML = '<div class="empty-state"><div class="empty-icon">📚</div><h4>Chưa có tài liệu kỹ thuật</h4></div>';
      return;
    }
    tabsEl.innerHTML = state.techDocs.map((d, i) =>
      `<button class="tab-btn ${i === 0 ? 'active' : ''}" onclick="loadTechDocContent('${d.name}', this)">📄 ${d.name}</button>`
    ).join('');
    state.techDocName = state.techDocs[0].name;
    loadTechDocContent(state.techDocName);
  } catch {
    document.getElementById('knowledgeContent').innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><h4>Lỗi tải tài liệu</h4></div>';
  }
}

function loadTechDocContent(name, btn) {
  if (btn) { document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
  state.techDocName = name;
  const doc = state.techDocs.find(d => d.name === name);
  if (!doc) return;
  document.getElementById('knowledgeContent').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <h3 style="font-size:14px;font-weight:600">📚 ${doc.name}</h3>
      <button class="btn btn-sm btn-primary" onclick="saveTechDoc()">💾 Lưu</button>
    </div>
    <textarea class="form-textarea" id="techEditor" rows="20" style="font-family:'JetBrains Mono','Fira Code',monospace;font-size:12.5px;line-height:1.6">${doc.content || ''}</textarea>
  `;
}

async function saveTechDoc() {
  try {
    await API.saveTechnical(state.techDocName, document.getElementById('techEditor').value);
    showToast('✅ Đã lưu tài liệu!', 'success');
  } catch { showToast('❌ Lỗi lưu!', 'error'); }
}

/* ===================== AGENTS ===================== */

async function loadAgents() {
  try {
    const status = await API.getQwenPawStatus();
    const badge = document.getElementById('qwenpawStatusBadge');
    if (badge) {
      badge.className = `badge ${status.ok ? 'badge-success' : 'badge-danger'}`;
      badge.textContent = status.ok ? `Online ${status.version || ''}` : 'Offline: QwenPaw app chưa chạy';
    }
  } catch {}

  try {
    const data = await API.getQwenPawAgents();
    const agents = data.agents || [];
    document.getElementById('agentGrid').innerHTML = agents.map(a => {
      const status = a.online ? 'online' : 'pending';
      const label = a.online ? 'Online' : 'Cần tạo';
      const gradient = a.id.includes('browser') ? 'browser' :
        a.id.includes('document') ? 'document' :
        a.id.includes('memory') ? 'memory' : 'orchestrator';
      const icon = a.id.includes('browser') ? '🌐' :
        a.id.includes('document') ? '📄' :
        a.id.includes('memory') ? '💾' : '🧠';
      return `
        <div class="agent-card">
          <div class="agent-card-header">
            <div class="agent-avatar ${gradient}">${icon}</div>
            <div class="agent-info">
              <h4>${escapeHtml(a.name || a.id)}</h4>
              <div class="agent-model">${escapeHtml(a.role || '')}</div>
            </div>
            <div style="margin-left:auto"><span class="agent-status-badge ${status}">${label}</span></div>
          </div>
          <div style="font-size:12.5px;color:var(--text-secondary);margin-bottom:8px;line-height:1.5">${escapeHtml(a.description || '')}</div>
          <div style="display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--text-muted);flex-wrap:wrap">
            <code style="background:var(--bg);padding:2px 6px;border-radius:4px;font-size:10.5px">${escapeHtml(a.id)}</code>
            <span>${escapeHtml(a.model || '')}</span>
          </div>
        </div>`;
    }).join('');
  } catch {
    document.getElementById('agentGrid').innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h4>Không thể tải danh sách agent</h4></div>';
  }

  try {
    const models = await API.getGeminiModels();
    const list = models.models || models || [];
    document.getElementById('geminiModels').innerHTML = Array.isArray(list)
      ? list.map(m => `<span class="model-chip">${escapeHtml(typeof m === 'string' ? m : (m.name || m.id || ''))}</span>`).join('')
      : '<span style="color:var(--text-muted)">Không có dữ liệu</span>';
  } catch {
    document.getElementById('geminiModels').innerHTML = '<span style="color:var(--text-muted)">Không thể tải models</span>';
  }
}

function fillSafeDraftCommand() {
  const input = document.getElementById('agentCommandInput');
  if (!input) return;
  input.value = [
    'Đọc văn bản đến mới nhất trên iOffice nếu browser đang sẵn sàng.',
    'Tóm tắt nội dung, xác định hạn xử lý, đơn vị liên quan và đề xuất cách tham mưu.',
    'Nếu cần soạn văn bản, chỉ tạo dự thảo và checklist thể thức.',
    'Không gửi, không submit, không phát hành bất kỳ nội dung nào khi chưa có trạng thái approved từ dashboard.'
  ].join(' ');
}

async function sendAgentCommand() {
  const agentId = document.getElementById('agentCommandAgent')?.value;
  const message = document.getElementById('agentCommandInput')?.value.trim();
  const sessionId = document.getElementById('agentCommandSession')?.value.trim() || 'ioffice-dashboard';
  const output = document.getElementById('agentCommandOutput');
  if (!message) { showToast('Nhập lệnh trước khi gửi', 'error'); return; }

  output.textContent = 'Đang gửi lệnh tới QwenPaw...';
  try {
    const result = await API.chatWithAgent(agentId, message, sessionId);
    output.textContent = result.text || JSON.stringify(result.events || result, null, 2);
    showToast('Đã nhận phản hồi từ agent', 'success');
  } catch (e) {
    output.textContent = `Lỗi: ${e.message}\n\nKiểm tra QwenPaw app và agent id.`;
    showToast('Lỗi gọi agent', 'error');
  }
}

/* ===================== CONFIG ===================== */
async function loadConfig() {
  try {
    const config = await API.getConfig();
    state.configData = { ...config };

    const fields = [
      { key: 'username', label: '👤 Tên đăng nhập', type: 'text', ph: 'ten.dang.nhap' },
      { key: 'password', label: '🔑 Mật khẩu', type: 'password', ph: '••••••' },
      { key: 'loginUrl', label: '🔗 URL đăng nhập', type: 'text', ph: 'https://...' },
      { key: 'addNewVanBanUrl', label: '📎 URL thêm văn bản', type: 'text', ph: 'https://...' },
      { key: 'folderPath', label: '📁 Thư mục đầu vào', type: 'text', ph: 'E:\\...' },
      { key: 'loaiVanBan', label: '📋 Loại văn bản', type: 'text', ph: 'Quyết định' },
      { key: 'prefixTrichYeu', label: '🏷️ Prefix trích yếu', type: 'text', ph: 'V/v' },
      { key: 'maxRetries', label: '🔄 Số lần retry', type: 'number', ph: '3' },
    ];

    document.getElementById('configForm').innerHTML = fields.map(f => `
      <div class="form-group">
        <label class="form-label">${f.label}</label>
        <input type="${f.type}" class="form-input" value="${state.configData[f.key] || ''}" placeholder="${f.ph || ''}" onchange="state.configData['${f.key}']=this.value">
      </div>
    `).join('');

  } catch {
    document.getElementById('configForm').innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><h4>Lỗi tải cấu hình</h4></div>';
  }
}

async function saveConfig() {
  try {
    await API.saveConfig(state.configData);
    showToast('✅ Đã lưu cấu hình!', 'success');
  } catch { showToast('❌ Lỗi lưu cấu hình!', 'error'); }
}

/* ===================== LOGS ===================== */
async function loadLogs() {
  try {
    const data = await API.getLogs();
    const logs = data.logs || [];
    document.getElementById('logContent').innerHTML = logs.length > 0
      ? `<div class="log-viewer">${logs.map(l =>
          `<div><span class="log-time">[${l.name}]</span> <span class="log-info">(${(l.size / 1024).toFixed(1)} KB)</span></div>
           <div style="padding-left:12px">${escapeHtml((l.content || '').substring(0, 2000)).split('\n').map(line => {
             if (line.match(/error|Error|lỗi|LỖI/)) return `<span class="log-error">${line}</span>`;
             if (line.match(/warn|WARN/)) return `<span class="log-warn">${line}</span>`;
             return line;
           }).join('\n')}</div>`
        ).join('\n')}</div>`
      : '<div class="empty-state"><div class="empty-icon">📋</div><h4>Không có log</h4></div>';
  } catch {
    document.getElementById('logContent').innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><h4>Lỗi tải logs</h4></div>';
  }
}

function refreshLogs() { loadLogs(); }

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}
