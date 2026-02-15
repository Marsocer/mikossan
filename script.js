// 全局变量
let fishData = [];
let filteredFishData = [];
const rankOrder = { '鱼王':5, '传说':4, '优质':3, '普通':2, '常见':1 };
// 保留原有本地数据，完全兼容上线版
let collectList = JSON.parse(localStorage.getItem('fishCollectList')) || [];

// 加载鱼类数据
async function loadFishData() {
    try {
        const res = await fetch('fish-data.json');
        fishData = await res.json();
        filteredFishData = [...fishData];
        restoreFilterState();
        initApp();
    } catch (err) { 
        console.error('加载鱼类数据失败：', err); 
        alert('数据加载失败，请检查fish-data.json文件是否存在！');
    }
}

// 点击切换收藏状态
function toggleCollectStatus(fishName, itemEl) {
    const isCurrentlyOwned = collectList.includes(fishName);
    if (isCurrentlyOwned) {
        collectList = collectList.filter(n => n !== fishName);
        itemEl.classList.remove('owned');
    } else {
        collectList.push(fishName);
        itemEl.classList.add('owned');
    }
    localStorage.setItem('fishCollectList', JSON.stringify(collectList));
    applyAllFilters();
    updateStats();
}

// 按等级排序
function sortByRank(data) {
    return [...data].sort((a,b) => rankOrder[b.等级] - rankOrder[a.等级]);
}

// 渲染鱼类卡片（核心修改：仅开关绑定点击事件）
function renderNameList(data) {
    const list = document.getElementById('name-list');
    const emptyTip = document.getElementById('empty-tip');
    
    if (data.length === 0) {
        emptyTip.style.display = 'block';
        list.innerHTML = '';
        return;
    } else {
        emptyTip.style.display = 'none';
    }

    list.innerHTML = '';
    sortByRank(data).forEach(fish => {
        const isOwned = collectList.includes(fish.名称);
        const item = document.createElement('div');
        item.className = `name-item rank-${fish.等级} ${isOwned ? 'owned' : ''}`;
        
        // 卡片头部：鱼名 + 开关
        const header = document.createElement('div');
        header.className = 'card-header';
        
        const nameText = document.createElement('span');
        nameText.className = 'fish-name';
        nameText.textContent = fish.名称;
        
        const toggle = document.createElement('div');
        toggle.className = 'toggle-switch';
        // 核心修改：仅开关绑定点击事件，卡片本身无点击
        toggle.onclick = (e) => {
            e.stopPropagation(); // 阻止事件冒泡到卡片
            toggleCollectStatus(fish.名称, item);
        };
        
        header.appendChild(nameText);
        header.appendChild(toggle);
        
        // 卡片信息区：季节/天气/时间/窝料
        const info = document.createElement('div');
        info.className = 'card-info';
        
        const seasonItem = document.createElement('div');
        seasonItem.className = 'info-item';
        seasonItem.innerHTML = `<span class="info-label">季节:</span> ${fish.季节}`;
        
        const weatherItem = document.createElement('div');
        weatherItem.className = 'info-item';
        weatherItem.innerHTML = `<span class="info-label">天气:</span> ${fish.天气}`;
        
        const timeItem = document.createElement('div');
        timeItem.className = 'info-item';
        timeItem.innerHTML = `<span class="info-label">时间:</span> ${fish.时间}`;
        
        const baitItem = document.createElement('div');
        baitItem.className = 'info-item';
        baitItem.innerHTML = `<span class="info-label">窝料:</span> ${fish.窝料}`;
        
        info.appendChild(seasonItem);
        info.appendChild(weatherItem);
        info.appendChild(timeItem);
        info.appendChild(baitItem);
        
        // 组装卡片（移除卡片本身的onclick）
        item.appendChild(header);
        item.appendChild(info);
        
        list.appendChild(item);
    });
}

// 时间区间匹配
function isTimeInRange(checkNum, fishTime) {
    if (fishTime === '全天') return true;
    const cleanTime = fishTime.replace(/点/g, '').split(',');
    for (let section of cleanTime) {
        const [start, end] = section.split('-').map(Number);
        if (isNaN(start) || isNaN(end)) continue;
        if (start <= end) {
            if (checkNum >= start && checkNum <= end) return true;
        } else {
            if (checkNum >= start || checkNum <= end) return true;
        }
    }
    return false;
}

// 时段筛选匹配
function matchTimeFilter(fishTime, timeFilter) {
    if (timeFilter === 'all') return true;
    if (fishTime === '全天') return true;

    const cleanTime = fishTime.replace(/点/g, '').split(',');
    for (let section of cleanTime) {
        const [start, end] = section.split('-').map(Number);
        if (isNaN(start) || isNaN(end)) continue;

        switch(timeFilter) {
            case '0-6':
                return start <= end ? (start >=0 && end <=6) : (end <=6);
            case '6-12':
                return start <= end ? (start >=6 && end <=12) : (end <=12 && start >=6);
            case '12-18':
                return start <= end ? (start >=12 && end <=18) : (end <=18 && start >=12);
            case '18-24':
                return start <= end ? (start >=18 && end <=24) : (start >=18);
            case 'cross':
                return start > end;
            default:
                return true;
        }
    }
    return false;
}

// 生成已选筛选标签
function renderFilterTags() {
    const tagsContainer = document.getElementById('filter-tags');
    tagsContainer.innerHTML = '';
    const filters = [
        { id: 'season-filter', name: '季节', map: { 'all':'全部', '春':'春季', '夏':'夏季', '秋':'秋季', '冬':'冬季' } },
        { id: 'water-filter', name: '水域', map: { 'all':'全部' } },
        { id: 'weather-filter', name: '天气', map: { 'all':'全部', '雪天':'雪天', '晴天':'晴天', '雨天':'雨天' } },
        { id: 'bait-filter', name: '窝料', map: { 'all':'全部', '鱼肉饵料':'鱼肉饵料', '昆虫饵料':'昆虫饵料', '素食饵料':'素食饵料' } },
        { id: 'collect-filter', name: '收藏', map: { 'all':'全部', 'collected':'已拥有', 'uncollected':'未拥有' } },
        { id: 'time-filter', name: '时段', map: { 'all':'全部', '0-6':'凌晨0-6点', '6-12':'上午6-12点', '12-18':'下午12-18点', '18-24':'晚上18-24点', 'cross':'跨0点' } }
    ];

    filters.forEach(filter => {
        const el = document.getElementById(filter.id);
        const val = el.value;
        if (val !== 'all') {
            const tagText = filter.map[val] || val;
            const tag = document.createElement('div');
            tag.className = 'filter-tag';
            tag.innerHTML = `${filter.name}：${tagText}<span class="tag-close" onclick="clearSingleFilter('${filter.id}')">×</span>`;
            tagsContainer.appendChild(tag);
        }
    });

    const searchKey = document.getElementById('global-search').value.trim();
    if (searchKey) {
        const tag = document.createElement('div');
        tag.className = 'filter-tag';
        tag.innerHTML = `搜索：${searchKey}<span class="tag-close" onclick="clearSearch()">×</span>`;
        tagsContainer.appendChild(tag);
    }
}

// 清除单个筛选条件
function clearSingleFilter(filterId) {
    document.getElementById(filterId).value = 'all';
    applyAllFilters();
}

// 清除搜索关键词
function clearSearch() {
    document.getElementById('global-search').value = '';
    applyAllFilters();
}

// 应用所有筛选条件
function applyAllFilters() {
    const season = document.getElementById('season-filter').value;
    const water = document.getElementById('water-filter').value;
    const weather = document.getElementById('weather-filter').value;
    const bait = document.getElementById('bait-filter').value;
    const collect = document.getElementById('collect-filter').value;
    const timeFilter = document.getElementById('time-filter').value;
    const searchKey = document.getElementById('global-search').value.trim().toLowerCase();
    const searchNum = Number(searchKey.replace(/[^0-9]/g, ''));
    const isValidNum = !isNaN(searchNum) && searchNum >= 0 && searchNum <= 24;

    filteredFishData = fishData.filter(fish => {
        const sMatch = season === 'all' || fish.季节.includes(season);
        const wMatch = water === 'all' || fish.水域.includes(water);
        const weMatch = weather === 'all' || fish.天气.includes(weather);
        const bMatch = bait === 'all' || fish.窝料.includes(bait);
        const cMatch = collect === 'all' 
            ? true 
            : collect === 'collected' ? collectList.includes(fish.名称) : !collectList.includes(fish.名称);
        const tMatch = matchTimeFilter(fish.时间, timeFilter);

        let searchMatch = true;
        if (searchKey) {
            const textMatch = fish.名称.toLowerCase().includes(searchKey)
                || fish.季节.toLowerCase().includes(searchKey)
                || fish.水域.toLowerCase().includes(searchKey)
                || fish.天气.toLowerCase().includes(searchKey)
                || fish.窝料.toLowerCase().includes(searchKey)
                || fish.时间.toLowerCase().includes(searchKey);
            
            let timeMatch = false;
            if (isValidNum) {
                timeMatch = isTimeInRange(searchNum, fish.时间);
            }
            if (searchKey.includes('白天')) {
                timeMatch = matchTimeFilter(fish.时间, '6-12') || matchTimeFilter(fish.时间, '12-18');
            }
            if (searchKey.includes('夜晚')) {
                timeMatch = matchTimeFilter(fish.时间, '18-24') || matchTimeFilter(fish.时间, 'cross');
            }

            searchMatch = textMatch || timeMatch;
        }

        saveFilterState();
        return sMatch && wMatch && weMatch && bMatch && cMatch && tMatch && searchMatch;
    });

    renderFilterTags();
    renderNameList(filteredFishData);
    updateStats();
}

// 保存筛选状态
function saveFilterState() {
    const filterState = {
        season: document.getElementById('season-filter').value,
        water: document.getElementById('water-filter').value,
        weather: document.getElementById('weather-filter').value,
        bait: document.getElementById('bait-filter').value,
        collect: document.getElementById('collect-filter').value,
        time: document.getElementById('time-filter').value,
        search: document.getElementById('global-search').value,
        scrollTop: window.scrollY
    };
    localStorage.setItem('fishFilterState', JSON.stringify(filterState));
}

// 恢复筛选状态
function restoreFilterState() {
    const savedState = JSON.parse(localStorage.getItem('fishFilterState'));
    if (!savedState) return;

    document.getElementById('season-filter').value = savedState.season || 'all';
    document.getElementById('water-filter').value = savedState.water || 'all';
    document.getElementById('weather-filter').value = savedState.weather || 'all';
    document.getElementById('bait-filter').value = savedState.bait || 'all';
    document.getElementById('collect-filter').value = savedState.collect || 'all';
    document.getElementById('time-filter').value = savedState.time || 'all';
    document.getElementById('global-search').value = savedState.search || '';

    setTimeout(() => {
        window.scrollTo(0, savedState.scrollTop || 0);
    }, 100);
}

// 快捷时段筛选
function quickFilter(type) {
    const searchInput = document.getElementById('global-search');
    searchInput.value = '';
    const timeFilter = document.getElementById('time-filter');
    if (type === 'all-day') {
        timeFilter.value = 'all';
    } else if (type === 'day') {
        searchInput.value = '白天';
    } else if (type === 'night') {
        searchInput.value = '夜晚';
    }
    doGlobalSearch();
}

// 全局搜索
function doGlobalSearch() { applyAllFilters(); }

// 重置所有筛选
function resetAllFilters() {
    ['season-filter','water-filter','weather-filter','bait-filter','collect-filter','time-filter'].forEach(id => {
        document.getElementById(id).value = 'all';
    });
    document.getElementById('global-search').value = '';
    localStorage.removeItem('fishFilterState');
    filteredFishData = [...fishData];
    renderFilterTags();
    renderNameList(filteredFishData);
    updateStats();
}

// 【最终版】导出收藏列表（和上线版格式100%一致）
function exportCollectList() {
    const collected = fishData.filter(f => collectList.includes(f.名称));
    if (collected.length === 0) { alert('暂无收藏数据可导出～'); return; }
    
    // 1. 格式化日期（YYYY-MM-DD）
    const date = new Date();
    const dateStr = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    
    // 2. 按等级分组（鱼王→传说→优质→普通→常见）
    const rankGroups = {
        '鱼王': [],
        '传说': [],
        '优质': [],
        '普通': [],
        '常见': []
    };
    sortByRank(collected).forEach(fish => {
        rankGroups[fish.等级].push(fish.名称);
    });
    
    // 3. 拼接上线版固定格式内容
    let content = `=== 星砂岛鱼类收藏列表（${dateStr}）===\n`;
    content += `总计收藏：${collected.length} 种\n`;
    
    // 4. 按等级输出，每行【等级】：鱼名（多个用顿号分隔）
    Object.keys(rankGroups).forEach(rank => {
        const names = rankGroups[rank];
        if (names.length > 0) {
            content += `【${rank}】：${names.join('、')}\n`;
        }
    });
    
    // 5. 生成和上线版同名的文件
    const fileName = `星砂岛鱼类收藏_${dateStr}.txt`;
    const blob = new Blob([content], { type: 'text/plain;utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(blob);
}

// 【最终版】导入收藏列表（精准解析上线版格式）
function importCollectList() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line);
                
                let list = [];
                // 解析上线版格式：匹配【等级】：鱼名 行
                const rankLineReg = /【(鱼王|传说|优质|普通|常见)】：(.*)/;
                lines.forEach(line => {
                    const match = line.match(rankLineReg);
                    if (match && match[2]) {
                        // 拆分顿号分隔的鱼名
                        const names = match[2].split('、').map(name => name.trim()).filter(name => name);
                        list = list.concat(names);
                    }
                });
                
                // 过滤有效鱼名
                const validFishNames = fishData.map(f => f.名称);
                list = [...new Set(list)].filter(name => validFishNames.includes(name));
                
                if (list.length === 0) { 
                    alert('未识别到有效鱼类名称！'); 
                    return; 
                }
                
                // 更新本地数据（和上线版一致）
                collectList = list;
                localStorage.setItem('fishCollectList', JSON.stringify(collectList));
                applyAllFilters();
                updateStats();
                alert(`导入成功！恢复${list.length}条收藏`);
            } catch (err) { 
                console.error('导入解析失败：', err);
                alert('导入失败：文件格式不符合上线版规范！'); 
            }
        };
        reader.readAsText(file, 'utf-8');
    };
    input.click();
}

// 更新统计
function updateStats() {
    const total = filteredFishData.length;
    const collected = filteredFishData.filter(f => collectList.includes(f.名称)).length;
    document.getElementById('total-count').innerText = total;
    document.getElementById('collected-count').innerText = collected;
}

// 初始化页面
function initApp() {
    renderNameList(fishData);
    updateStats();
    
    ['season-filter','water-filter','weather-filter','bait-filter','collect-filter','time-filter'].forEach(id => {
        document.getElementById(id).onchange = applyAllFilters;
    });
    
    document.getElementById('global-search').onkeydown = (e) => { 
        if (e.key === 'Enter') doGlobalSearch(); 
    };
    document.getElementById('search-btn').onclick = doGlobalSearch;
    document.getElementById('reset-filter').onclick = resetAllFilters;
    document.getElementById('export-collect').onclick = exportCollectList;
    document.getElementById('import-collect').onclick = importCollectList;
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', loadFishData);