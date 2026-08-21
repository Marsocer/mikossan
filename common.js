// common.js - 图鉴通用模块（XSD plus 版 - 编码导入导出）

let pageData = [];
let baseData = [];
let collectStatus = {};
let pageConfig = {};
let manageModal = null;
let currentEditName = null;
let codeModal = null;

export function initPage(config) {
    pageConfig = config;
    collectStatus = JSON.parse(localStorage.getItem(config.storageKey)) || {};

    renderSkeleton();
    loadData();

    // 搜索事件
    document.getElementById('global-search')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleFilter();
    });
    document.getElementById('search-btn')?.addEventListener('click', handleFilter);

    // 精准筛选季节开关
    document.getElementById('season-precise-toggle')?.addEventListener('change', handleFilter);

    bindFilterEvents();

    document.getElementById('reset-filter')?.addEventListener('click', resetAllFilters);
    document.getElementById('reset-filter-empty')?.addEventListener('click', resetAllFilters);

    document.getElementById('export-all')?.addEventListener('click', exportAllCollect);
    document.getElementById('import-all')?.addEventListener('click', importAllCollect);

    // 物种管理
    document.getElementById('manage-species')?.addEventListener('click', openManageModal);
}

// ================== 数据加载 ==================
function loadData() {
    fetch(pageConfig.dataUrl)
        .then(res => {
            if (!res.ok) throw new Error('数据加载失败');
            return res.json();
        })
        .then(data => {
            if (!Array.isArray(data)) throw new Error('数据格式错误');
            baseData = data;
            pageData = mergeCustomData(baseData);
            renderList(pageData);
            updateStats();
            updateFilterTags();
        })
        .catch(err => {
            console.error(err);
            alert('数据加载失败，请检查文件路径');
            renderList([]);
        });
}

function refreshData() {
    pageData = mergeCustomData(baseData);
    handleFilter();
    updateStats();
}

// ================== 自定义数据管理 ==================
function getCustomData() {
    const key = pageConfig.storageKey + 'Custom';
    return JSON.parse(localStorage.getItem(key)) || { additions: [], modifications: {}, deletions: [] };
}

function saveCustomData(data) {
    const key = pageConfig.storageKey + 'Custom';
    localStorage.setItem(key, JSON.stringify(data));
}

function mergeCustomData(data) {
    const custom = getCustomData();
    let merged = data.map(item => {
        const name = getField(item, 'name');
        if (custom.modifications[name]) {
            return { ...custom.modifications[name], _customType: 'modified', _originalName: name };
        }
        return item;
    });

    merged = merged.filter(item => {
        const name = getField(item, 'name');
        return !custom.deletions.includes(name);
    });

    custom.additions.forEach(a => {
        merged.push({ ...a, _customType: 'added' });
    });

    return merged;
}

// ================== 渲染 ==================
function renderSkeleton() {
    const container = document.getElementById('name-list');
    const emptyTip = document.getElementById('empty-tip');
    if (!container) return;

    container.innerHTML = '';
    emptyTip?.classList.add('hidden');

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 6; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'name-item skeleton';
        skeleton.innerHTML = `
            <div class="card-header">
                <div class="skeleton-title"></div>
                <div class="skeleton-switch"></div>
            </div>
            <div class="card-info">
                <div class="skeleton-line"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line"></div>
            </div>
        `;
        fragment.appendChild(skeleton);
    }
    container.appendChild(fragment);
}

// 显示排序：按等级从高到低（鱼王>传说>优质>普通>常见），同等级保持原有顺序
// 仅影响页面展示，不改变数据数组顺序（图鉴编码位图序号不变）
const RANK_ORDER = { '鱼王': 0, '王级': 0, '传说': 1, '优质': 2, '普通': 3, '常见': 4 };
function sortForDisplay(list) {
    return [...list].sort((a, b) =>
        (RANK_ORDER[getField(a, 'rank')] ?? 5) - (RANK_ORDER[getField(b, 'rank')] ?? 5)
    );
}

function renderList(list) {
    const container = document.getElementById('name-list');
    const emptyTip = document.getElementById('empty-tip');
    if (!container) return;

    container.innerHTML = '';

    if (!list || list.length === 0) {
        emptyTip?.classList.remove('hidden');
        return;
    }
    emptyTip?.classList.add('hidden');

    const fragment = document.createDocumentFragment();
    sortForDisplay(list).forEach(item => fragment.appendChild(createCard(item)));
    container.appendChild(fragment);
}

function createCard(item) {
    const name = getField(item, 'name') || '未知';
    const isOwned = collectStatus[name] || false;
    let rank = getField(item, 'rank') || '常见';
    rank = rank.replace('王级', '鱼王');

    const card = document.createElement('div');
    card.className = `name-item rank-${rank} ${isOwned ? 'owned' : ''}`;
    card.dataset.name = name;

    const header = document.createElement('div');
    header.className = 'card-header';

    const nameEl = document.createElement('div');
    nameEl.className = 'fish-name';
    nameEl.textContent = name;

    const toggle = document.createElement('div');
    toggle.className = 'toggle-switch';
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCollect(name);
    });

    header.appendChild(nameEl);
    header.appendChild(toggle);

    const info = document.createElement('div');
    info.className = 'card-info';
    if (pageConfig.cardFields) {
        pageConfig.cardFields.forEach(field => {
            const value = getField(item, field.key) || '未知';
            const infoItem = document.createElement('div');
            infoItem.className = 'info-item';
            infoItem.innerHTML = `<span class="info-label">${field.label}：</span><span class="info-content">${value}</span>`;
            info.appendChild(infoItem);
        });
    }

    card.appendChild(header);
    card.appendChild(info);
    return card;
}

function getField(obj, keyType) {
    const keys = pageConfig.fieldMappings?.[keyType];
    if (!keys) return '';
    for (let key of keys) {
        if (obj[key] !== undefined && obj[key] !== null) return obj[key];
    }
    return '';
}

function toggleCollect(name) {
    collectStatus[name] = !collectStatus[name];
    localStorage.setItem(pageConfig.storageKey, JSON.stringify(collectStatus));
    const card = document.querySelector(`.name-item[data-name="${name}"]`);
    if (card) card.classList.toggle('owned', collectStatus[name]);
    updateStats();
}

function updateStats() {
    const total = pageData.length;
    const collected = pageData.filter(item => collectStatus[getField(item, 'name')]).length;
    document.getElementById('total-count').textContent = total;
    document.getElementById('collected-count').textContent = collected;

    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    if (progressFill) {
        const percentage = total > 0 ? (collected / total * 100).toFixed(1) : 0;
        progressFill.style.width = percentage + '%';
        if (progressText) progressText.textContent = percentage + '%';
    }
}

// ================== 筛选 ==================
function bindFilterEvents() {
    if (!pageConfig.filterElements) return;
    pageConfig.filterElements.forEach(el => {
        if (el.type === 'select' || el.type === 'custom') {
            document.getElementById(el.id)?.addEventListener('change', handleFilter);
        } else if (el.type === 'checkbox-group') {
            const group = document.getElementById(el.id);
            if (group) {
                group.querySelectorAll('input[type=checkbox]').forEach(cb => {
                    cb.addEventListener('change', handleFilter);
                });
            }
        }
    });
}

function handleFilter() {
    let filtered = [...pageData];

    pageConfig.filterElements.forEach(el => {
        if (el.type === 'select') {
            const select = document.getElementById(el.id);
            if (!select || select.value === 'all') return;
            filtered = filtered.filter(item => {
                const val = getField(item, el.field) || '';
                return val.includes(select.value);
            });
        } else if (el.type === 'checkbox-group') {
            const group = document.getElementById(el.id);
            if (!group) return;
            const checked = [];
            group.querySelectorAll('input[type=checkbox]:checked').forEach(cb => {
                if (cb.value) checked.push(cb.value);
            });
            if (checked.length === 0 || checked.length === el.totalValues) return;

            const isPrecise = document.getElementById('season-precise-toggle')?.checked || false;

            filtered = filtered.filter(item => {
                const val = getField(item, el.field) || '';
                const seasons = val.split(',').map(s => s.trim()).filter(s => s);
                if (seasons.length === 0) return false;
                return isPrecise
                    ? seasons.every(s => checked.includes(s))
                    : seasons.some(s => checked.includes(s));
            });
        } else if (el.type === 'custom') {
            const select = document.getElementById(el.id);
            if (!select) return;
            if (select.value === 'collected') {
                filtered = filtered.filter(item => collectStatus[getField(item, 'name')]);
            } else if (select.value === 'uncollected') {
                filtered = filtered.filter(item => !collectStatus[getField(item, 'name')]);
            }
        }
    });

    const keyword = document.getElementById('global-search')?.value.trim().toLowerCase();
    if (keyword) {
        filtered = filtered.filter(item => {
            return Object.values(pageConfig.fieldMappings).some(keys =>
                keys.some(key => (item[key] || '').toString().toLowerCase().includes(keyword))
            );
        });
    }

    renderList(filtered);
    updateFilterTags();
}

function resetAllFilters() {
    pageConfig.filterElements.forEach(el => {
        if (el.type === 'select' || el.type === 'custom') {
            const sel = document.getElementById(el.id);
            if (sel) sel.value = 'all';
        } else if (el.type === 'checkbox-group') {
            document.getElementById(el.id)?.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
        }
    });
    const searchInput = document.getElementById('global-search');
    if (searchInput) searchInput.value = '';
    const preciseToggle = document.getElementById('season-precise-toggle');
    if (preciseToggle) preciseToggle.checked = false;
    handleFilter();
}

function updateFilterTags() {
    const tagsContainer = document.getElementById('filter-tags');
    if (!tagsContainer) return;

    const tags = [];

    const keyword = document.getElementById('global-search')?.value.trim();
    if (keyword) {
        tags.push({
            label: `搜索: ${keyword}`,
            remove: () => {
                const searchInput = document.getElementById('global-search');
                if (searchInput) searchInput.value = '';
                handleFilter();
            }
        });
    }

    pageConfig.filterElements.forEach(el => {
        if (el.type === 'select') {
            const select = document.getElementById(el.id);
            if (select && select.value !== 'all') {
                tags.push({
                    label: select.options[select.selectedIndex].textContent || select.value,
                    remove: () => { select.value = 'all'; handleFilter(); }
                });
            }
        } else if (el.type === 'checkbox-group') {
            const group = document.getElementById(el.id);
            if (group) {
                const checked = [];
                group.querySelectorAll('input[type=checkbox]:checked').forEach(cb => {
                    if (cb.value) checked.push(cb.value);
                });
                if (checked.length > 0 && checked.length < el.totalValues) {
                    tags.push({
                        label: checked.join('、'),
                        remove: () => {
                            group.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
                            handleFilter();
                        }
                    });
                }
            }
        } else if (el.type === 'custom' && el.id === 'collect-filter') {
            const select = document.getElementById(el.id);
            if (select && select.value !== 'all') {
                tags.push({
                    label: select.value === 'collected' ? '已拥有' : '未拥有',
                    remove: () => { select.value = 'all'; handleFilter(); }
                });
            }
        }
    });

    const preciseToggle = document.getElementById('season-precise-toggle');
    if (preciseToggle && preciseToggle.checked) {
        tags.push({
            label: '精准季节',
            remove: () => { preciseToggle.checked = false; handleFilter(); }
        });
    }

    if (tags.length === 0) {
        tagsContainer.innerHTML = '';
        return;
    }

    tagsContainer.innerHTML = tags.map(tag => `
        <span class="filter-tag">
            ${tag.label}
            <span class="remove-tag">\u00d7</span>
        </span>
    `).join('');

    tagsContainer.querySelectorAll('.filter-tag').forEach((tagEl, index) => {
        tagEl.querySelector('.remove-tag').addEventListener('click', () => tags[index].remove());
    });
}

// ================== 物种管理模态框 ==================
function openManageModal() {
    if (manageModal) return;

    manageModal = document.createElement('div');
    manageModal.className = 'manage-modal-overlay';
    manageModal.innerHTML = `
        <div class="manage-modal">
            <div class="manage-modal-header">
                <h2>物种管理 - ${pageConfig.title || ''}</h2>
                <button class="manage-close-btn">&times;</button>
            </div>
            <div class="manage-modal-body">
                <div class="manage-list-view" id="manage-list-view">
                    <div class="manage-toolbar">
                        <input type="text" id="manage-search" placeholder="搜索物种名称...">
                        <button class="manage-add-btn">+ 添加新物种</button>
                    </div>
                    <div class="manage-list" id="manage-list"></div>
                    <div class="manage-deleted-section hidden" id="manage-deleted-section">
                        <h3>已删除的物种</h3>
                        <div class="manage-list" id="manage-deleted-list"></div>
                    </div>
                </div>
                <div class="manage-form-view hidden" id="manage-form-view">
                    <div class="manage-form-header">
                        <button class="manage-back-btn">&larr; 返回列表</button>
                        <h3 id="manage-form-title">添加新物种</h3>
                    </div>
                    <div class="manage-form-body" id="manage-form-body"></div>
                    <div class="manage-form-actions">
                        <button class="manage-cancel-btn">取消</button>
                        <button class="manage-save-btn">保存</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(manageModal);

    manageModal.querySelector('.manage-close-btn').addEventListener('click', closeManageModal);
    manageModal.querySelector('.manage-add-btn').addEventListener('click', () => openSpeciesForm('add'));
    manageModal.querySelector('.manage-back-btn').addEventListener('click', closeSpeciesForm);
    manageModal.querySelector('.manage-cancel-btn').addEventListener('click', closeSpeciesForm);
    manageModal.querySelector('.manage-save-btn').addEventListener('click', saveSpeciesFromForm);
    manageModal.querySelector('#manage-search').addEventListener('input', () => renderManageList());

    manageModal.addEventListener('click', (e) => {
        if (e.target === manageModal) closeManageModal();
    });

    renderManageList();
}

function closeManageModal() {
    if (manageModal) {
        manageModal.remove();
        manageModal = null;
        currentEditName = null;
    }
}

function renderManageList() {
    if (!manageModal) return;

    const custom = getCustomData();
    const merged = mergeCustomData(baseData);
    const searchTerm = (manageModal.querySelector('#manage-search')?.value || '').trim().toLowerCase();

    const listEl = manageModal.querySelector('#manage-list');
    const filtered = searchTerm
        ? merged.filter(item => (getField(item, 'name') || '').toLowerCase().includes(searchTerm))
        : merged;

    listEl.innerHTML = filtered.map(item => {
        const name = getField(item, 'name') || '未知';
        let rank = getField(item, 'rank') || '常见';
        rank = rank.replace('王级', '鱼王');
        const customType = item._customType;
        const originalName = item._originalName || name;

        const details = (pageConfig.cardFields || [])
            .map(f => getField(item, f.key))
            .filter(v => v)
            .join(' | ');

        const badgeHtml = customType
            ? `<span class="manage-custom-tag">${customType === 'added' ? '新增' : '已修改'}</span>`
            : '';

        const actionsHtml = customType === 'added'
            ? `<button class="manage-edit-btn" data-name="${name}">编辑</button>
               <button class="manage-delete-btn" data-name="${name}">删除</button>`
            : customType === 'modified'
            ? `<button class="manage-edit-btn" data-name="${name}">编辑</button>
               <button class="manage-reset-btn" data-name="${originalName}">重置</button>
               <button class="manage-delete-btn" data-name="${name}" data-original="${originalName}">删除</button>`
            : `<button class="manage-edit-btn" data-name="${name}">编辑</button>
               <button class="manage-delete-btn" data-name="${name}" data-original="${name}">删除</button>`;

        return `
            <div class="manage-species-item">
                <div class="manage-species-info">
                    <span class="manage-species-name">${name}</span>
                    <span class="manage-rank-badge rank-${rank}">${getField(item, 'rank') || '常见'}</span>
                    ${badgeHtml}
                    <div class="manage-species-details">${details}</div>
                </div>
                <div class="manage-species-actions">${actionsHtml}</div>
            </div>
        `;
    }).join('');

    listEl.querySelectorAll('.manage-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openSpeciesForm('edit', btn.dataset.name));
    });
    listEl.querySelectorAll('.manage-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteSpecies(btn.dataset.name, btn.dataset.original));
    });
    listEl.querySelectorAll('.manage-reset-btn').forEach(btn => {
        btn.addEventListener('click', () => resetSpecies(btn.dataset.name));
    });

    const deletedSection = manageModal.querySelector('#manage-deleted-section');
    const deletedList = manageModal.querySelector('#manage-deleted-list');
    const deletedSpecies = baseData.filter(item =>
        custom.deletions.includes(getField(item, 'name'))
    );

    if (deletedSpecies.length > 0) {
        deletedSection.classList.remove('hidden');
        deletedList.innerHTML = deletedSpecies.map(item => {
            const name = getField(item, 'name') || '未知';
            let rank = getField(item, 'rank') || '常见';
            rank = rank.replace('王级', '鱼王');
            return `
                <div class="manage-species-item deleted">
                    <div class="manage-species-info">
                        <span class="manage-species-name">${name}</span>
                        <span class="manage-rank-badge rank-${rank}">${getField(item, 'rank') || '常见'}</span>
                    </div>
                    <div class="manage-species-actions">
                        <button class="manage-restore-btn" data-name="${name}">恢复</button>
                    </div>
                </div>
            `;
        }).join('');
        deletedList.querySelectorAll('.manage-restore-btn').forEach(btn => {
            btn.addEventListener('click', () => restoreSpecies(btn.dataset.name));
        });
    } else {
        deletedSection.classList.add('hidden');
    }
}

// ================== 物种表单 ==================
function openSpeciesForm(mode, editName) {
    if (!manageModal) return;

    const formView = manageModal.querySelector('#manage-form-view');
    const listView = manageModal.querySelector('#manage-list-view');
    const titleEl = manageModal.querySelector('#manage-form-title');
    const bodyEl = manageModal.querySelector('#manage-form-body');

    listView.classList.add('hidden');
    formView.classList.remove('hidden');

    if (mode === 'edit') {
        currentEditName = editName;
        titleEl.textContent = '编辑物种';
    } else {
        currentEditName = null;
        titleEl.textContent = '添加新物种';
    }

    const fields = pageConfig.manageFields || [];
    bodyEl.innerHTML = fields.map(field => {
        const requiredMark = field.required ? ' <span class="required-mark">*</span>' : '';
        const dataKey = field.key;

        if (field.type === 'select') {
            const options = field.options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
            return `
                <div class="manage-form-field" data-key="${dataKey}">
                    <label>${field.label}${requiredMark}</label>
                    <select>${options}</select>
                </div>
            `;
        } else if (field.type === 'season' || field.type === 'checkboxes') {
            const opts = field.type === 'season' ? ['春', '夏', '秋', '冬'] : (field.options || []);
            const checkboxes = opts.map(s =>
                `<label><input type="checkbox" value="${s}"> ${s}</label>`
            ).join('');
            return `
                <div class="manage-form-field" data-key="${dataKey}">
                    <label>${field.label}</label>
                    <div class="season-checkbox-group">${checkboxes}</div>
                </div>
            `;
        } else {
            const placeholder = field.placeholder || '';
            return `
                <div class="manage-form-field" data-key="${dataKey}">
                    <label>${field.label}${requiredMark}</label>
                    <input type="text" placeholder="${placeholder}">
                </div>
            `;
        }
    }).join('');

    if (mode === 'edit') {
        const item = pageData.find(d => getField(d, 'name') === editName);
        if (item) {
            populateForm(item);
        }
    }
}

function populateForm(item) {
    const fields = pageConfig.manageFields || [];
    fields.forEach(field => {
        const value = item[field.key] || '';
        const fieldEl = manageModal.querySelector(`.manage-form-field[data-key="${field.key}"]`);
        if (!fieldEl) return;

        if (field.type === 'season' || field.type === 'checkboxes') {
            const seasons = value.split(',').map(s => s.trim());
            fieldEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.checked = seasons.includes(cb.value);
            });
        } else if (field.type === 'select') {
            const select = fieldEl.querySelector('select');
            if (select) select.value = value;
        } else {
            const input = fieldEl.querySelector('input[type="text"]');
            if (input) input.value = value;
        }
    });
}

function closeSpeciesForm() {
    if (!manageModal) return;
    const formView = manageModal.querySelector('#manage-form-view');
    const listView = manageModal.querySelector('#manage-list-view');
    formView.classList.add('hidden');
    listView.classList.remove('hidden');
    currentEditName = null;
}

function collectFormData() {
    const data = {};
    const fields = pageConfig.manageFields || [];
    fields.forEach(field => {
        const fieldEl = manageModal.querySelector(`.manage-form-field[data-key="${field.key}"]`);
        if (!fieldEl) return;

        if (field.type === 'season' || field.type === 'checkboxes') {
            const checked = fieldEl.querySelectorAll('input[type="checkbox"]:checked');
            data[field.key] = Array.from(checked).map(cb => cb.value).join(',');
        } else if (field.type === 'select') {
            const select = fieldEl.querySelector('select');
            data[field.key] = select ? select.value : '';
        } else {
            const input = fieldEl.querySelector('input[type="text"]');
            data[field.key] = input ? input.value.trim() : '';
        }
    });
    return data;
}

function saveSpeciesFromForm() {
    const formData = collectFormData();
    const nameField = pageConfig.manageFields.find(f => f.required);
    const newName = nameField ? formData[nameField.key] : '';

    if (!newName) {
        alert('请填写名称');
        return;
    }

    const allNames = pageData.map(item => getField(item, 'name'));
    if (currentEditName && currentEditName !== newName) {
        if (allNames.includes(newName)) {
            alert(`名称「${newName}」已存在，请使用其他名称`);
            return;
        }
    } else if (!currentEditName) {
        if (allNames.includes(newName)) {
            alert(`名称「${newName}」已存在，请使用其他名称`);
            return;
        }
    }

    const custom = getCustomData();

    if (currentEditName) {
        const additionIndex = custom.additions.findIndex(a => getField(a, 'name') === currentEditName);

        if (additionIndex >= 0) {
            custom.additions[additionIndex] = formData;
        } else {
            let originalName = currentEditName;
            for (const [origName, modData] of Object.entries(custom.modifications)) {
                if (getField(modData, 'name') === currentEditName) {
                    originalName = origName;
                    break;
                }
            }
            delete custom.modifications[originalName];
            custom.modifications[originalName] = formData;
        }

        if (currentEditName !== newName) {
            if (collectStatus[currentEditName] !== undefined) {
                collectStatus[newName] = collectStatus[currentEditName];
                delete collectStatus[currentEditName];
                localStorage.setItem(pageConfig.storageKey, JSON.stringify(collectStatus));
            }
        }
    } else {
        custom.additions.push(formData);
    }

    saveCustomData(custom);
    refreshData();
    closeSpeciesForm();
    renderManageList();
}

function deleteSpecies(displayName, originalName) {
    if (!confirm(`确定删除「${displayName}」吗？`)) return;

    const custom = getCustomData();

    const additionIndex = custom.additions.findIndex(a => getField(a, 'name') === displayName);
    if (additionIndex >= 0) {
        custom.additions.splice(additionIndex, 1);
    } else {
        const origName = originalName || displayName;
        if (!custom.deletions.includes(origName)) {
            custom.deletions.push(origName);
        }
    }

    saveCustomData(custom);
    refreshData();
    renderManageList();
}

function restoreSpecies(originalName) {
    const custom = getCustomData();
    custom.deletions = custom.deletions.filter(d => d !== originalName);
    saveCustomData(custom);
    refreshData();
    renderManageList();
}

function resetSpecies(originalName) {
    if (!confirm(`确定将「${originalName}」重置为原始数据吗？`)) return;

    const custom = getCustomData();
    delete custom.modifications[originalName];
    saveCustomData(custom);
    refreshData();
    renderManageList();
}

// ================== 二进制位图编码/解码 ==================

// 通用名称提取（不依赖 pageConfig）
function getSpeciesName(item) {
    return item.name || item['\u540d\u79f0'] || '';
}

// 独立于 pageConfig 的数据合并（用于编码导入导出）
function mergeDataForExport(data, storageKey) {
    const customKey = storageKey + 'Custom';
    const custom = JSON.parse(localStorage.getItem(customKey)) || { additions: [], modifications: {}, deletions: [] };

    let merged = data.map(item => {
        const name = getSpeciesName(item);
        if (custom.modifications[name]) {
            return { ...custom.modifications[name] };
        }
        return item;
    });

    merged = merged.filter(item => {
        const name = getSpeciesName(item);
        return !custom.deletions.includes(name);
    });

    custom.additions.forEach(a => merged.push({ ...a }));

    return merged;
}

// Base36 字符串 -> BigInt
function base36ToBigInt(str) {
    let result = 0n;
    for (const char of str) {
        let digit;
        if (char >= '0' && char <= '9') {
            digit = char.charCodeAt(0) - 48;
        } else if (char >= 'a' && char <= 'z') {
            digit = char.charCodeAt(0) - 87;
        } else if (char >= 'A' && char <= 'Z') {
            digit = char.charCodeAt(0) - 55;
        } else {
            throw new Error('编码包含非法字符: ' + char);
        }
        result = result * 36n + BigInt(digit);
    }
    return result;
}

// BigInt -> 二进制字符串（补零到指定长度）
function bigIntToBinary(bigInt, length) {
    if (bigInt === 0n) return '0'.repeat(length);
    let bits = '';
    let n = bigInt;
    while (n > 0n) {
        bits = (n & 1n).toString() + bits;
        n = n >> 1n;
    }
    while (bits.length < length) {
        bits = '0' + bits;
    }
    return bits;
}

// 编码：物种列表 + 收藏状态 -> { count, bitmap }
function encodeBitmap(speciesList, collectStatusObj) {
    let bits = '';
    for (const item of speciesList) {
        const name = getSpeciesName(item);
        bits += collectStatusObj[name] ? '1' : '0';
    }
    const bigInt = bits.length > 0 ? BigInt('0b' + bits) : 0n;
    const bitmap = bigInt.toString(36);
    return { count: speciesList.length, bitmap };
}

// 解码：编码 + 数量 + 物种列表 -> 收藏状态对象
function decodeToCollectStatus(encoded, count, speciesList) {
    const bigInt = base36ToBigInt(encoded);
    const bits = bigIntToBinary(bigInt, count);

    const result = {};
    for (let i = 0; i < speciesList.length; i++) {
        const name = getSpeciesName(speciesList[i]);
        // i < bits.length: 用编码中的位
        // i >= bits.length: 新增物种，默认未收集
        result[name] = (i < bits.length) ? bits[i] === '1' : false;
    }
    return result;
}

// ================== 编码导出 ==================
function exportAllCollect() {
    Promise.all([
        fetch('fish-data.json').then(r => r.json()),
        fetch('seashore-data.json').then(r => r.json()),
        fetch('insect-data.json').then(r => r.json())
    ]).then(([fishData, seashoreData, insectData]) => {
        const fishCollect = JSON.parse(localStorage.getItem('fishCollect')) || {};
        const seashoreCollect = JSON.parse(localStorage.getItem('seashoreCollect')) || {};
        const insectCollect = JSON.parse(localStorage.getItem('insectCollect')) || {};

        const fishMerged = mergeDataForExport(fishData, 'fishCollect');
        const seashoreMerged = mergeDataForExport(seashoreData, 'seashoreCollect');
        const insectMerged = mergeDataForExport(insectData, 'insectCollect');

        const fishEnc = encodeBitmap(fishMerged, fishCollect);
        const seashoreEnc = encodeBitmap(seashoreMerged, seashoreCollect);
        const insectEnc = encodeBitmap(insectMerged, insectCollect);

        // 格式: count1|bitmap1|count2|bitmap2|count3|bitmap3
        const code = [
            fishEnc.count.toString(36), fishEnc.bitmap,
            seashoreEnc.count.toString(36), seashoreEnc.bitmap,
            insectEnc.count.toString(36), insectEnc.bitmap
        ].join('|');

        showCodeModal('export', code);
    }).catch(err => {
        console.error(err);
        alert('导出失败：' + err.message);
    });
}

// ================== 编码导入 ==================
function importAllCollect() {
    showCodeModal('import', '');
}

function applyImportCode(code) {
    try {
        const cleaned = code.replace(/\s/g, '');
        const parts = cleaned.split('|');
        if (parts.length !== 6) {
            throw new Error('编码格式错误，应为 6 段以 | 分隔');
        }

        const [fishCountStr, fishBitmap, seashoreCountStr, seashoreBitmap, insectCountStr, insectBitmap] = parts;
        const fishCount = parseInt(fishCountStr, 36);
        const seashoreCount = parseInt(seashoreCountStr, 36);
        const insectCount = parseInt(insectCountStr, 36);

        if (isNaN(fishCount) || isNaN(seashoreCount) || isNaN(insectCount)) {
            throw new Error('编码中的物种数量解析失败');
        }

        Promise.all([
            fetch('fish-data.json').then(r => r.json()),
            fetch('seashore-data.json').then(r => r.json()),
            fetch('insect-data.json').then(r => r.json())
        ]).then(([fishData, seashoreData, insectData]) => {
            const fishMerged = mergeDataForExport(fishData, 'fishCollect');
            const seashoreMerged = mergeDataForExport(seashoreData, 'seashoreCollect');
            const insectMerged = mergeDataForExport(insectData, 'insectCollect');

            const fishCollect = decodeToCollectStatus(fishBitmap, fishCount, fishMerged);
            const seashoreCollect = decodeToCollectStatus(seashoreBitmap, seashoreCount, seashoreMerged);
            const insectCollect = decodeToCollectStatus(insectBitmap, insectCount, insectMerged);

            localStorage.setItem('fishCollect', JSON.stringify(fishCollect));
            localStorage.setItem('seashoreCollect', JSON.stringify(seashoreCollect));
            localStorage.setItem('insectCollect', JSON.stringify(insectCollect));

            // 更新当前页面
            const keyMap = { fishCollect, seashoreCollect, insectCollect };
            collectStatus = keyMap[pageConfig.storageKey] || {};

            pageData = mergeCustomData(baseData);
            handleFilter();
            updateStats();

            const count = Object.values(fishCollect).filter(Boolean).length
                        + Object.values(seashoreCollect).filter(Boolean).length
                        + Object.values(insectCollect).filter(Boolean).length;

            // 物种数量差异提示
            const diffs = [];
            if (fishCount < fishMerged.length) diffs.push(`鱼类新增${fishMerged.length - fishCount}种`);
            if (seashoreCount < seashoreMerged.length) diffs.push(`赶海新增${seashoreMerged.length - seashoreCount}种`);
            if (insectCount < insectMerged.length) diffs.push(`昆虫新增${insectMerged.length - insectCount}种`);
            const diffMsg = diffs.length > 0 ? `\n（${diffs.join('、')}默认未收集）` : '';

            alert(`导入成功！共导入 ${count} 种收藏${diffMsg}`);
            closeCodeModal();
        }).catch(err => {
            console.error(err);
            alert('导入失败：' + err.message);
        });
    } catch (err) {
        alert('导入失败：' + err.message);
    }
}

// ================== 编码模态框 ==================
function showCodeModal(mode, code) {
    if (codeModal) codeModal.remove();

    codeModal = document.createElement('div');
    codeModal.className = 'manage-modal-overlay';

    if (mode === 'export') {
        codeModal.innerHTML = `
            <div class="manage-modal code-modal-box">
                <div class="manage-modal-header">
                    <h2>导出图鉴编码</h2>
                    <button class="manage-close-btn">&times;</button>
                </div>
                <div class="manage-modal-body">
                    <p class="code-modal-desc">复制下方编码，在其他设备的"导入图鉴编码"中粘贴即可同步收集信息</p>
                    <textarea class="code-textarea" id="code-output" readonly>${code}</textarea>
                    <div class="code-modal-actions">
                        <button class="manage-cancel-btn" id="code-copy-btn">复制编码</button>
                        <button class="manage-save-btn" id="code-close-btn">关闭</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(codeModal);

        const copyBtn = codeModal.querySelector('#code-copy-btn');
        copyBtn.addEventListener('click', () => {
            const textarea = codeModal.querySelector('#code-output');
            textarea.select();
            try {
                document.execCommand('copy');
                copyBtn.textContent = '已复制!';
                copyBtn.classList.add('code-copy-success');
                setTimeout(() => {
                    copyBtn.textContent = '复制编码';
                    copyBtn.classList.remove('code-copy-success');
                }, 2000);
            } catch (e) {
                alert('复制失败，请手动选中编码复制');
            }
        });

        codeModal.querySelector('#code-close-btn').addEventListener('click', closeCodeModal);
    } else {
        codeModal.innerHTML = `
            <div class="manage-modal code-modal-box">
                <div class="manage-modal-header">
                    <h2>导入图鉴编码</h2>
                    <button class="manage-close-btn">&times;</button>
                </div>
                <div class="manage-modal-body">
                    <p class="code-modal-desc">粘贴图鉴编码，导入收集信息</p>
                    <textarea class="code-textarea" id="code-input" placeholder="在此粘贴编码..."></textarea>
                    <div class="code-modal-actions">
                        <button class="manage-cancel-btn" id="code-cancel-btn">取消</button>
                        <button class="manage-save-btn" id="code-import-btn">导入</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(codeModal);

        codeModal.querySelector('#code-import-btn').addEventListener('click', () => {
            const input = codeModal.querySelector('#code-input').value.trim();
            if (!input) {
                alert('请输入编码');
                return;
            }
            applyImportCode(input);
        });

        codeModal.querySelector('#code-cancel-btn').addEventListener('click', closeCodeModal);
    }

    codeModal.querySelector('.manage-close-btn').addEventListener('click', closeCodeModal);
    codeModal.addEventListener('click', (e) => {
        if (e.target === codeModal) closeCodeModal();
    });
}

function closeCodeModal() {
    if (codeModal) {
        codeModal.remove();
        codeModal = null;
    }
}
