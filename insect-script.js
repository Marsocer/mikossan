// 昆虫图鉴页面
import { initPage } from './common.js';

document.addEventListener('DOMContentLoaded', () => {
    initPage({
        dataUrl: 'insect-data.json',
        storageKey: 'insectCollect',
        fieldMappings: {
            name: ['name', '名称'],
            season: ['season', '季节'],
            area: ['区域'],
            weather: ['weather', '天气'],
            time: ['time', '时间'],
            rank: ['rank', '等级']
        },
        cardFields: [
            { label: '季节', key: 'season' },
            { label: '区域', key: 'area' },
            { label: '天气', key: 'weather' },
            { label: '时间', key: 'time' }
        ],
        filterElements: [
            { type: 'select', id: 'season-filter', field: 'season' },
            { type: 'select', id: 'area-filter', field: 'area' },
            { type: 'select', id: 'weather-filter', field: 'weather' },
            { type: 'custom', id: 'collect-filter' }
        ]
    });
});