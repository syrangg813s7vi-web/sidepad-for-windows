const $ = (selector) => document.querySelector(selector);
if (!window.sidepad) {
  window.sidepad = {
    enter() {}, leave() {}, stay() {}, collapse() {}, close() {},
    openExternal() {}, pickFiles: async () => [], openFile() {}, revealFile() {},
    importFiles: async () => [], pathForFile: () => '', authorizeFile: async () => false, onPanelState() {},
  };
}
const els = Object.fromEntries([
  'edgeHandle','siteList','addButton','welcomeAdd','manageButton','collapseButton','closeButton',
  'webview','welcome','loading','pageTitle','pageHost','currentFavicon','addressForm','addressInput',
  'backButton','forwardButton','reloadButton','favoriteButton','openExternal','modalBackdrop',
  'modalClose','cancelButton','siteForm','siteName','siteUrl','formError','documentView','noteShell',
  'noteEditor','noteCount','filePreview','homeSearch','homeSearchInput','homeGrid'
].map(id => [id, $(`#${id}`)]));

const defaults = [
  { id: crypto.randomUUID(), type: 'web', name: 'Google', url: 'https://www.google.com', color: '#4285f4' },
  { id: crypto.randomUUID(), type: 'web', name: 'ChatGPT', url: 'https://chatgpt.com', color: '#0b9f81' },
  { id: crypto.randomUUID(), type: 'note', name: '随手记录', content: '', color: '#8b7dff' },
];
const textExts = new Set(['txt', 'md', 'markdown', 'json', 'csv', 'log']);
const imageExts = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);

let items = loadItems();
let activeId = localStorage.getItem('sidepad.activeId') || items[0]?.id || null;
let manageMode = false;

function loadItems() {
  try {
    const current = JSON.parse(localStorage.getItem('sidepad.items'));
    if (Array.isArray(current)) return current;
    const legacy = JSON.parse(localStorage.getItem('sidepad.sites'));
    if (Array.isArray(legacy)) return legacy.map(item => ({ ...item, type: 'web' }));
  } catch {}
  return defaults;
}

function saveItems() {
  localStorage.setItem('sidepad.items', JSON.stringify(items));
  localStorage.setItem('sidepad.activeId', activeId || '');
}

function normalizeUrl(value) {
  const raw = value.trim();
  if (!raw) return null;
  if (/\s/.test(raw) || (!raw.includes('.') && !raw.startsWith('http'))) return `https://www.google.com/search?q=${encodeURIComponent(raw)}`;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url || ''; } }
function faviconUrl(url) { try { return `${new URL(url).origin}/favicon.ico`; } catch { return ''; } }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c]); }

function iconMarkup(item, header = false) {
  const cls = header ? '' : 'favicon';
  if (item.type === 'web') return `<span class="${cls}" style="background:${item.color || '#2d3240'}"><img src="${faviconUrl(item.url)}" alt="" onerror="this.remove();this.parentElement.textContent='${escapeHtml(item.name[0]?.toUpperCase() || 'W')}'"></span>`;
  const label = item.type === 'note' ? 'TXT' : (item.ext || 'FILE').toUpperCase().slice(0, 4);
  const color = item.type === 'note' ? '#7566ec' : ['ppt','pptx'].includes(item.ext) ? '#d85234' : '#3f4657';
  return `<span class="${cls}" style="background:${color}">${label}</span>`;
}

function renderItems() {
  els.siteList.classList.toggle('manage-mode', manageMode);
  els.siteList.innerHTML = items.map(item => `
    <button class="site-item ${item.id === activeId ? 'active' : ''}" data-id="${item.id}" title="${escapeHtml(item.name)}">
      ${iconMarkup(item)}<span class="site-name">${escapeHtml(item.name)}</span>
      <span class="remove-site" data-remove="${item.id}" title="删除">×</span>
    </button>`).join('');
  updateFavoriteState();
  renderHome();
}

function renderHome() {
  els.homeGrid.innerHTML = items.map(item => `
    <button class="home-card" data-home-id="${item.id}">
      ${iconMarkup(item)}
      <strong>${escapeHtml(item.name)}</strong>
    </button>`).join('') + '<button class="home-card add-card" data-home-add>＋</button>';
}

function showOnly(kind) {
  els.welcome.hidden = kind !== 'welcome';
  els.webview.classList.toggle('active', kind === 'web');
  els.documentView.hidden = !['note','file'].includes(kind);
  els.noteShell.hidden = kind !== 'note';
  els.filePreview.hidden = kind !== 'file';
  document.querySelector('.browserbar').style.display = kind === 'web' ? 'flex' : 'none';
  document.querySelector('.workspace').classList.toggle('document-mode', kind !== 'web');
  document.querySelector('.workspace').classList.toggle('home-mode', kind === 'welcome');
  if (kind !== 'web') els.loading.classList.remove('visible');
}

function selectItem(id) {
  const item = items.find(entry => entry.id === id);
  if (!item) return;
  activeId = id;
  saveItems();
  renderItems();
  els.pageTitle.textContent = item.name;
  els.pageHost.textContent = item.type === 'web' ? hostOf(item.url) : item.type === 'note' ? '本地笔记 · 自动保存' : `${item.ext.toUpperCase()} · 本地文件`;
  els.currentFavicon.innerHTML = iconMarkup(item, true);
  if (item.type === 'web') navigate(item.url);
  if (item.type === 'note') {
    showOnly('note');
    els.noteEditor.value = item.content || '';
    updateNoteCount();
    setTimeout(() => els.noteEditor.focus(), 0);
  }
  if (item.type === 'file') showFile(item);
}

function navigate(url) {
  const normalized = normalizeUrl(url);
  if (!normalized) return;
  showOnly('web');
  els.addressInput.value = normalized;
  if (els.webview.src !== normalized) els.webview.src = normalized;
}

async function showFile(item) {
  showOnly('file');
  const available = await window.sidepad.authorizeFile(item.path);
  if (!available) {
    els.filePreview.innerHTML = `<div class="office-card"><div class="file-glyph">?</div><h2>找不到文件</h2><p>${escapeHtml(item.name)} 已移动、被删除，或当前没有访问权限。</p><div class="file-actions"><button data-remove-missing>从 Sidepad 移除</button></div></div>`;
    els.filePreview.querySelector('[data-remove-missing]').onclick = () => {
      items = items.filter(entry => entry.id !== item.id);
      activeId = items[0]?.id || null; saveItems(); renderItems();
      if (activeId) selectItem(activeId); else showOnly('welcome');
    };
    return;
  }
  const ext = item.ext.toLowerCase();
  if (textExts.has(ext) && item.content != null) {
    els.filePreview.innerHTML = `<article class="text-document">${escapeHtml(item.content)}</article>`;
  } else if (imageExts.has(ext)) {
    els.filePreview.innerHTML = `<div class="image-stage"><img src="${item.previewUrl}" alt="${escapeHtml(item.name)}"></div>`;
  } else if (ext === 'pdf') {
    els.filePreview.innerHTML = `<iframe src="${item.previewUrl}" title="${escapeHtml(item.name)}"></iframe>`;
  } else if (ext === 'docx') {
    els.filePreview.innerHTML = '<div class="office-loading">正在排版 Word 文档…</div>';
    try {
      const data = await fetch(item.previewUrl).then(response => response.arrayBuffer());
      els.filePreview.innerHTML = '<div class="docx-stage"></div>';
      await window.docx.renderAsync(data, els.filePreview.querySelector('.docx-stage'), null, {
        className: 'sidepad-docx',
        inWrapper: true,
        breakPages: true,
        ignoreLastRenderedPageBreak: false,
      });
    } catch (error) { renderOfficeError(item, '无法读取这个 DOCX 文件', error); }
  } else if (ext === 'pptx') {
    els.filePreview.innerHTML = '<div class="office-loading">正在生成幻灯片…</div>';
    try {
      const data = await fetch(item.previewUrl).then(response => response.arrayBuffer());
      els.filePreview.innerHTML = '<div class="pptx-stage"></div>';
      const stage = els.filePreview.querySelector('.pptx-stage');
      const width = Math.min(960, Math.max(640, els.filePreview.clientWidth - 64));
      const previewer = window.pptxPreview.init(stage, { width, height: Math.round(width * 9 / 16) });
      await previewer.preview(data);
    } catch (error) { renderOfficeError(item, '无法读取这个 PPTX 文件', error); }
  } else if (ext === 'xlsx') {
    els.filePreview.innerHTML = '<div class="office-loading">正在读取工作簿…</div>';
    try {
      const data = await fetch(item.previewUrl).then(response => response.arrayBuffer());
      const workbook = new window.ExcelJS.Workbook();
      await workbook.xlsx.load(data);
      renderWorkbook(workbook);
    } catch (error) { renderOfficeError(item, '无法读取这个 XLSX 文件', error); }
  } else {
    const label = ['ppt','pptx'].includes(ext) ? 'PPT' : ext.toUpperCase().slice(0, 4) || 'FILE';
    els.filePreview.innerHTML = `<div class="office-card"><div class="file-glyph">${label}</div><h2>${escapeHtml(item.name)}</h2><p>Sidepad 可以直接预览 PPTX、DOCX 和 XLSX。这个旧格式无法在不依赖 Office 的情况下可靠解析，建议另存为现代 Office 格式后重新添加。</p><div class="file-actions"><button class="primary-file" data-open-file>尝试用系统应用打开</button><button data-reveal-file>在文件夹中显示</button></div></div>`;
    els.filePreview.querySelector('[data-open-file]').onclick = () => window.sidepad.openFile(item.path);
    els.filePreview.querySelector('[data-reveal-file]').onclick = () => window.sidepad.revealFile(item.path);
  }
}

function renderOfficeError(item, title, error) {
  els.filePreview.innerHTML = `<div class="office-card"><div class="file-glyph">!</div><h2>${title}</h2><p>${escapeHtml(error?.message || '文件可能已损坏，或包含暂不支持的内容。')}</p><div class="file-actions"><button data-reveal-file>在文件夹中显示</button></div></div>`;
  els.filePreview.querySelector('[data-reveal-file]').onclick = () => window.sidepad.revealFile(item.path);
}

function renderWorkbook(workbook) {
  const sheets = workbook.worksheets;
  if (!sheets.length) {
    els.filePreview.innerHTML = '<div class="office-loading">工作簿中没有工作表。</div>';
    return;
  }
  els.filePreview.innerHTML = `<div class="sheet-shell"><div class="sheet-tabs">${sheets.map((sheet, index) => `<button data-sheet="${index}" class="${index === 0 ? 'active' : ''}">${escapeHtml(sheet.name)}</button>`).join('')}</div><div class="sheet-table"></div></div>`;
  const renderSheet = (index) => {
    const sheet = sheets[index];
    const rows = [];
    sheet.eachRow({ includeEmpty: true }, row => {
      const cells = [];
      for (let column = 1; column <= Math.min(sheet.columnCount, 80); column += 1) {
        const value = row.getCell(column).text;
        cells.push(`<td>${escapeHtml(value)}</td>`);
      }
      rows.push(`<tr>${cells.join('')}</tr>`);
    });
    els.filePreview.querySelector('.sheet-table').innerHTML = `<table>${rows.join('')}</table>`;
  };
  els.filePreview.querySelector('.sheet-tabs').addEventListener('click', event => {
    const button = event.target.closest('[data-sheet]');
    if (!button) return;
    els.filePreview.querySelectorAll('[data-sheet]').forEach(tab => tab.classList.toggle('active', tab === button));
    renderSheet(Number(button.dataset.sheet));
  });
  renderSheet(0);
}

function updateNoteCount() { els.noteCount.textContent = `${els.noteEditor.value.length} 字`; }
function updateFavoriteState() {
  const current = els.webview.getURL?.() || els.addressInput.value;
  const saved = items.some(item => item.type === 'web' && hostOf(item.url) === hostOf(current));
  els.favoriteButton.classList.toggle('saved', saved);
  els.favoriteButton.textContent = saved ? '★' : '☆';
}

function openModal(prefill = {}) {
  els.siteName.value = prefill.name || '';
  els.siteUrl.value = prefill.url || '';
  els.formError.textContent = '';
  els.modalBackdrop.hidden = false;
  setContentType('web');
  window.sidepad.stay();
  setTimeout(() => (prefill.name ? els.siteUrl : els.siteName).focus(), 20);
}
function closeModal() { els.modalBackdrop.hidden = true; els.siteForm.reset(); }

function setContentType(type) {
  document.querySelectorAll('.content-type').forEach(button => button.classList.toggle('active', button.dataset.type === type));
  els.siteForm.hidden = type !== 'web';
  if (type === 'note') {
    const item = { id: crypto.randomUUID(), type: 'note', name: `新笔记 ${items.filter(i => i.type === 'note').length + 1}`, content: '', color: '#7566ec' };
    items.push(item); activeId = item.id; saveItems(); closeModal(); selectItem(item.id);
  }
  if (type === 'file') { closeModal(); addFiles(); }
}

async function addFiles() {
  const files = await window.sidepad.pickFiles();
  appendFiles(files);
}

function appendFiles(files) {
  files.forEach(file => items.push({ id: crypto.randomUUID(), type: 'file', ...file, color: '#3f4657' }));
  if (files.length) { activeId = items.at(-1).id; saveItems(); renderItems(); selectItem(activeId); }
}

els.edgeHandle.addEventListener('mouseenter', () => window.sidepad.enter());
document.addEventListener('mouseenter', () => window.sidepad.stay());
document.addEventListener('mouseleave', () => window.sidepad.leave());
document.addEventListener('dragover', event => {
  event.preventDefault();
  document.body.classList.add('dragging-file');
  window.sidepad.stay();
});
document.addEventListener('dragleave', event => {
  if (!event.relatedTarget) document.body.classList.remove('dragging-file');
});
document.addEventListener('drop', async event => {
  event.preventDefault();
  document.body.classList.remove('dragging-file');
  const paths = [...event.dataTransfer.files].map(file => window.sidepad.pathForFile(file)).filter(Boolean);
  if (paths.length) appendFiles(await window.sidepad.importFiles(paths));
});
window.sidepad.onPanelState(({ expanded }) => document.body.classList.toggle('expanded', expanded));

els.siteList.addEventListener('click', event => {
  const removeId = event.target.dataset.remove;
  if (removeId) {
    event.stopPropagation();
    items = items.filter(item => item.id !== removeId);
    if (activeId === removeId) activeId = items[0]?.id || null;
    saveItems(); renderItems();
    if (activeId) selectItem(activeId); else showOnly('welcome');
    return;
  }
  const item = event.target.closest('.site-item');
  if (item) selectItem(item.dataset.id);
});
els.homeGrid.addEventListener('click', event => {
  if (event.target.closest('[data-home-add]')) return openModal();
  const card = event.target.closest('[data-home-id]');
  if (card) selectItem(card.dataset.homeId);
});
els.homeSearch.addEventListener('submit', event => {
  event.preventDefault();
  if (els.homeSearchInput.value.trim()) navigate(els.homeSearchInput.value);
});

[els.addButton, els.welcomeAdd].forEach(button => button.addEventListener('click', () => openModal()));
document.querySelectorAll('.content-type').forEach(button => button.addEventListener('click', () => setContentType(button.dataset.type)));
els.modalClose.addEventListener('click', closeModal);
els.cancelButton.addEventListener('click', closeModal);
els.modalBackdrop.addEventListener('click', event => { if (event.target === els.modalBackdrop) closeModal(); });
els.manageButton.addEventListener('click', () => { manageMode = !manageMode; els.manageButton.querySelector('span').textContent = manageMode ? '完成管理' : '管理内容'; renderItems(); });
els.collapseButton.addEventListener('click', () => window.sidepad.collapse());
els.closeButton.addEventListener('click', () => window.sidepad.close());

els.siteForm.addEventListener('submit', event => {
  event.preventDefault();
  const url = normalizeUrl(els.siteUrl.value);
  const name = els.siteName.value.trim();
  if (!url || !name) { els.formError.textContent = '请填写有效的名称和网页地址。'; return; }
  const item = { id: crypto.randomUUID(), type: 'web', name, url, color: '#343948' };
  items.push(item); activeId = item.id; saveItems(); renderItems(); closeModal(); selectItem(item.id);
});

els.noteEditor.addEventListener('input', () => {
  const item = items.find(entry => entry.id === activeId && entry.type === 'note');
  if (item) { item.content = els.noteEditor.value; saveItems(); updateNoteCount(); }
});
els.addressForm.addEventListener('submit', event => { event.preventDefault(); navigate(els.addressInput.value); });
els.backButton.addEventListener('click', () => els.webview.canGoBack() && els.webview.goBack());
els.forwardButton.addEventListener('click', () => els.webview.canGoForward() && els.webview.goForward());
els.reloadButton.addEventListener('click', () => els.webview.reload());
els.openExternal.addEventListener('click', () => window.sidepad.openExternal(els.webview.getURL()));
els.favoriteButton.addEventListener('click', () => {
  const url = els.webview.getURL(); if (!url) return;
  const existing = items.find(item => item.type === 'web' && hostOf(item.url) === hostOf(url));
  if (existing) selectItem(existing.id); else openModal({ name: els.webview.getTitle() || hostOf(url), url });
});

els.webview.addEventListener('did-start-loading', () => els.loading.classList.add('visible'));
els.webview.addEventListener('did-stop-loading', () => {
  els.loading.classList.remove('visible');
  els.addressInput.value = els.webview.getURL();
  els.pageTitle.textContent = els.webview.getTitle() || hostOf(els.webview.getURL());
  els.pageHost.textContent = hostOf(els.webview.getURL());
  updateFavoriteState();
});
els.webview.addEventListener('page-title-updated', event => { els.pageTitle.textContent = event.title; });
els.webview.addEventListener('did-navigate', event => { els.addressInput.value = event.url; els.pageHost.textContent = hostOf(event.url); updateFavoriteState(); });

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { if (!els.modalBackdrop.hidden) closeModal(); else window.sidepad.collapse(); }
  if (event.ctrlKey && event.key.toLowerCase() === 'l') { event.preventDefault(); els.addressInput.select(); }
  if (event.ctrlKey && event.key.toLowerCase() === 'r' && items.find(i => i.id === activeId)?.type === 'web') { event.preventDefault(); els.webview.reload(); }
});

renderItems();
if (new URLSearchParams(location.search).has('preview')) {
  document.body.classList.add('expanded');
  showOnly('welcome');
} else if (activeId) selectItem(activeId);
else showOnly('welcome');
