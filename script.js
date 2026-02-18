// 鱼类图鉴页面
import { initPage } from './common.js';

document.addEventListener('DOMContentLoaded', () => {
    initPage({
        dataUrl: 'fish-data.json',
        storageKey: 'fishCollect',
        fieldMappings: {
            name: ['name', '名称'],
            season: ['season', '季节'],
            weather: ['weather', '天气'],
            time: ['time', '时间'],
            bait: ['bait', '窝料'],
            water: ['water', '水域', '区域'],
            rank: ['rank', '等级']
        },
        cardFields: [
            { label: '季节', key: 'season' },
            { label: '天气', key: 'weather' },
            { label: '时间', key: 'time' },
            { label: '窝料', key: 'bait' },
            { label: '水域', key: 'water' }
        ],
        filterElements: [
            { type: 'checkbox-group', id: 'season-group', field: 'season', totalValues: 4, selectAllId: 'season-select-all' },
            { type: 'select', id: 'water-filter', field: 'water' },
            { type: 'select', id: 'weather-filter', field: 'weather' },
            { type: 'select', id: 'bait-filter', field: 'bait' },
            { type: 'custom', id: 'collect-filter' } // 收藏状态特殊处理
        ]
    });
});