// 昆虫图鉴页面
import { initPage } from './common.js';

document.addEventListener('DOMContentLoaded', () => {
    initPage({
        dataUrl: 'insect-data.json',
        storageKey: 'insectCollect',
        title: '昆虫',
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
        manageFields: [
            { key: '名称', label: '名称', type: 'text', required: true },
            { key: '等级', label: '等级', type: 'select', options: ['王级', '传说', '优质', '普通', '常见'] },
            { key: '季节', label: '季节', type: 'season' },
            { key: '区域', label: '区域', type: 'text', placeholder: '如: 树林里,花丛附近' },
            { key: '天气', label: '天气', type: 'checkboxes', options: ['晴天', '雨天', '雪天'] },
            { key: '时间', label: '时间', type: 'text', placeholder: '如: 全天 或 6点-18点' }
        ],
        filterElements: [
            { type: 'select', id: 'season-filter', field: 'season' },
            { type: 'select', id: 'area-filter', field: 'area' },
            { type: 'select', id: 'weather-filter', field: 'weather' },
            { type: 'custom', id: 'collect-filter' }
        ]
    });
});
