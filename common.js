// common.js - 图鉴通用模块（含云端备份）

const API_BASE_URL = 'http://1404806767-7y8le9rw9r.in.ap-guangzhou.tencentscf.com'; // ⚠️ 请替换为您的后端地址

let pageData = [];
let collectStatus = {};
let pageConfig = {};
let loading = true;

export function initPage(config) {
    pageConfig = config;
    collectStatus = JSON.parse(localStorage.getItem(config.storageKey)) || {};

    renderSkeleton();

    loadData();

    document.getElementById('global-search')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    document.getElementById('search-btn')?.addEventListener('click', handleSearch);

    bindFilterEvents();

    document.getElementById('reset-filter')?.addEventListener('click', resetAllFilters);
    document.getElementById('reset-filter-empty')?.addEventListener('click', resetAllFilters);

    document.getElementById('export-all')?.addEventListener('click', exportAllCollect);
    document.getElementById('import-all')?.addEventListener('click', importAllCollect);

    // 新增云端备份按钮事件
    document.getElementById('backup-cloud')?.addEventListener('click', backupToCloud);
    document.getElementById('restore-cloud')?.addEventListener('click', restoreFromCloud);
}

function loadData() {
    fetch(pageConfig.dataUrl)
        .then(res => {
            if (!res.ok) throw new Error('数据加载失败');
            return res.json();
        })
        .then(data => {
            if (!Array.isArray(data)) throw new Error('数据格式错误');
            pageData = data;
            loading = false;
            renderList(pageData);
            updateStats();
            updateFilterTags();
        })
        .catch(err => {
            console.error(err);
            alert('数据加载失败，请检查文件路径');
            loading = false;
            renderList([]);
        });
}

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
    list.forEach(item => {
        const card = createCard(item);
        fragment.appendChild(card);
    });
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
    const collected = Object.values(collectStatus).filter(Boolean).length;
    document.getElementById('total-count').textContent = total;
    document.getElementById('collected-count').textContent = collected;

    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    if (progressFill) {
        const percentage = total > 0 ? (collected / total * 100).toFixed(1) : 0;
        progressFill.style.width = percentage + '%';
        if (progressText) {
            progressText.textContent = percentage + '%';
        }
    }
}

function handleSearch() {
    const keyword = document.getElementById('global-search').value.trim().toLowerCase();
    if (!keyword) {
        renderList(pageData);
        updateFilterTags();
        return;
    }
    const filtered = pageData.filter(item => {
        const fields = [
            getField(item, 'name'),
            getField(item, 'season'),
            getField(item, 'area'),
            getField(item, 'weather'),
            getField(item, 'time'),
            getField(item, 'bait'),
            getField(item, 'water'),
            getField(item, '获取途径')
        ].map(s => (s || '').toLowerCase());
        return fields.some(f => f.includes(keyword));
    });
    renderList(filtered);
    updateFilterTags();
}

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
            if (el.selectAllId) {
                document.getElementById(el.selectAllId)?.addEventListener('change', handleSelectAll);
            }
        }
    });
}

function handleSelectAll(e) {
    const checked = e.target.checked;
    const config = pageConfig.filterElements.find(el => el.selectAllId === e.target.id);
    if (!config) return;
    const group = document.getElementById(config.id);
    if (group) {
        group.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = checked);
    }
    handleFilter();
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
            filtered = filtered.filter(item => {
                const val = getField(item, el.field) || '';
                const seasons = val.split(',').map(s => s.trim()).filter(s => s);
                return seasons.every(s => checked.includes(s)) && seasons.length > 0;
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

    renderList(filtered);
    updateFilterTags();
}

function resetAllFilters() {
    pageConfig.filterElements.forEach(el => {
        if (el.type === 'select' || el.type === 'custom') {
            const sel = document.getElementById(el.id);
            if (sel) sel.value = 'all';
        } else if (el.type === 'checkbox-group') {
            const group = document.getElementById(el.id);
            if (group) {
                group.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
            }
            if (el.selectAllId) {
                const sa = document.getElementById(el.selectAllId);
                if (sa) sa.checked = false;
            }
        }
    });
    document.getElementById('global-search').value = '';
    renderList(pageData);
    updateFilterTags();
}

function updateFilterTags() {
    const tagsContainer = document.getElementById('filter-tags');
    if (!tagsContainer) return;

    const tags = [];

    const keyword = document.getElementById('global-search').value.trim();
    if (keyword) {
        tags.push({
            label: `搜索: ${keyword}`,
            remove: () => {
                document.getElementById('global-search').value = '';
                handleSearch();
            }
        });
    }

    pageConfig.filterElements.forEach(el => {
        if (el.type === 'select') {
            const select = document.getElementById(el.id);
            if (select && select.value !== 'all') {
                const option = select.options[select.selectedIndex];
                const text = option.textContent || select.value;
                tags.push({
                    label: text,
                    remove: () => {
                        select.value = 'all';
                        handleFilter();
                    }
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
                            if (el.selectAllId) {
                                document.getElementById(el.selectAllId).checked = false;
                            }
                            handleFilter();
                        }
                    });
                }
            }
        } else if (el.type === 'custom' && el.id === 'collect-filter') {
            const select = document.getElementById(el.id);
            if (select && select.value !== 'all') {
                const text = select.value === 'collected' ? '已拥有' : '未拥有';
                tags.push({
                    label: text,
                    remove: () => {
                        select.value = 'all';
                        handleFilter();
                    }
                });
            }
        }
    });

    if (tags.length === 0) {
        tagsContainer.innerHTML = '';
        return;
    }

    tagsContainer.innerHTML = tags.map(tag => `
        <span class="filter-tag">
            ${tag.label}
            <span class="remove-tag">×</span>
        </span>
    `).join('');

    tagsContainer.querySelectorAll('.filter-tag').forEach((tagEl, index) => {
        const removeBtn = tagEl.querySelector('.remove-tag');
        removeBtn.addEventListener('click', () => {
            tags[index].remove();
        });
    });
}

// ================== 导出为 JSON ==================
function exportAllCollect() {
    const fishCollect = JSON.parse(localStorage.getItem('fishCollect')) || {};
    const insectCollect = JSON.parse(localStorage.getItem('insectCollect')) || {};
    const seashoreCollect = JSON.parse(localStorage.getItem('seashoreCollect')) || {};

    const backup = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        fishCollect: fishCollect,
        insectCollect: insectCollect,
        seashoreCollect: seashoreCollect
    };

    const dataStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '星砂岛图鉴备份.json';
    a.click();
    URL.revokeObjectURL(url);
}

// ================== 导入（兼容 JSON 和旧 TXT）==================
function importAllCollect() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        reader.onload = ev => {
            const content = ev.target.result;
            let importCount = 0;
            let newFishCollect, newInsectCollect, newSeashoreCollect;

            try {
                const json = JSON.parse(content);
                if (json.fishCollect && json.insectCollect && json.seashoreCollect) {
                    newFishCollect = json.fishCollect;
                    newInsectCollect = json.insectCollect;
                    newSeashoreCollect = json.seashoreCollect;
                    importCount = Object.values(newFishCollect).filter(Boolean).length +
                                 Object.values(newInsectCollect).filter(Boolean).length +
                                 Object.values(newSeashoreCollect).filter(Boolean).length;
                } else {
                    throw new Error('无效的 JSON 备份格式');
                }
            } catch (jsonError) {
                console.log('按 TXT 格式解析');
                newFishCollect = {};
                newInsectCollect = {};
                newSeashoreCollect = {};

                Promise.all([
                    fetch('fish-data.json').then(r => r.json()),
                    fetch('insect-data.json').then(r => r.json()),
                    fetch('seashore-data.json').then(r => r.json())
                ]).then(([fishData, insectData, seashoreData]) => {
                    fishData.forEach(f => newFishCollect[f.name || f.名称] = false);
                    insectData.forEach(i => newInsectCollect[i.name || i.名称] = false);
                    seashoreData.forEach(s => newSeashoreCollect[s.name || s.名称] = false);

                    const fishRegex = /【(鱼王|传说|普通|常见|优质)】：([^\n]+)/g;
                    let match;
                    while ((match = fishRegex.exec(content)) !== null) {
                        match[2].split('、').forEach(name => {
                            const n = name.trim();
                            if (newFishCollect.hasOwnProperty(n)) {
                                newFishCollect[n] = true;
                                importCount++;
                            }
                        });
                    }

                    const otherRegex = /【(王级|传说|优质|普通|常见)】：([^\n]+)/g;
                    while ((match = otherRegex.exec(content)) !== null) {
                        match[2].split('、').forEach(name => {
                            const n = name.trim();
                            if (newInsectCollect.hasOwnProperty(n)) {
                                newInsectCollect[n] = true;
                                importCount++;
                            } else if (newSeashoreCollect.hasOwnProperty(n)) {
                                newSeashoreCollect[n] = true;
                                importCount++;
                            }
                        });
                    }

                    localStorage.setItem('fishCollect', JSON.stringify(newFishCollect));
                    localStorage.setItem('insectCollect', JSON.stringify(newInsectCollect));
                    localStorage.setItem('seashoreCollect', JSON.stringify(newSeashoreCollect));

                    if (pageConfig.storageKey === 'fishCollect') collectStatus = newFishCollect;
                    else if (pageConfig.storageKey === 'insectCollect') collectStatus = newInsectCollect;
                    else if (pageConfig.storageKey === 'seashoreCollect') collectStatus = newSeashoreCollect;

                    renderList(pageData);
                    updateStats();
                    alert(`导入成功！共导入 ${importCount} 种收藏`);
                }).catch(err => {
                    console.error(err);
                    alert('导入失败：无法加载数据文件');
                });
                return;
            }

            localStorage.setItem('fishCollect', JSON.stringify(newFishCollect));
            localStorage.setItem('insectCollect', JSON.stringify(newInsectCollect));
            localStorage.setItem('seashoreCollect', JSON.stringify(newSeashoreCollect));

            if (pageConfig.storageKey === 'fishCollect') collectStatus = newFishCollect;
            else if (pageConfig.storageKey === 'insectCollect') collectStatus = newInsectCollect;
            else if (pageConfig.storageKey === 'seashoreCollect') collectStatus = newSeashoreCollect;

            renderList(pageData);
            updateStats();
            alert(`导入成功！共导入 ${importCount} 种收藏`);
        };
    };
    input.click();
}

// ================== 云端备份 ==================
async function backupToCloud() {
    const data = {
        fishCollect: JSON.parse(localStorage.getItem('fishCollect')) || {},
        insectCollect: JSON.parse(localStorage.getItem('insectCollect')) || {},
        seashoreCollect: JSON.parse(localStorage.getItem('seashoreCollect')) || {}
    };

    try {
        const response = await fetch(`${API_BASE_URL}/backup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.id) {
            alert(`备份成功！您的备份码是：${result.id}\n请妥善保存此码，恢复时需要输入。`);
        } else {
            alert('备份失败：' + (result.message || '未知错误'));
        }
    } catch (err) {
        alert('网络错误，请稍后重试');
    }
}

async function restoreFromCloud() {
    const code = prompt('请输入您的备份码：');
    if (!code) return;

    try {
        const response = await fetch(`${API_BASE_URL}/backup?id=${encodeURIComponent(code)}`);
        const result = await response.json();
        if (result.data) {
            localStorage.setItem('fishCollect', JSON.stringify(result.data.fishCollect));
            localStorage.setItem('insectCollect', JSON.stringify(result.data.insectCollect));
            localStorage.setItem('seashoreCollect', JSON.stringify(result.data.seashoreCollect));
            alert('恢复成功！页面即将刷新。');
            location.reload();
        } else {
            alert('恢复失败：' + (result.message || '无效的备份码'));
        }
    } catch (err) {
        alert('网络错误，请稍后重试');
    }
}