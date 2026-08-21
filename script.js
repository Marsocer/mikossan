// 鱼类图鉴页面
import { initPage } from './common.js';

document.addEventListener('DOMContentLoaded', () => {
    initPage({
        dataUrl: 'fish-data.json',
        storageKey: 'fishCollect',
        title: '鱼类',
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
        manageFields: [
            { key: '名称', label: '名称', type: 'text', required: true },
            { key: '等级', label: '等级', type: 'select', options: ['鱼王', '传说', '优质', '普通', '常见'] },
            { key: '季节', label: '季节', type: 'season' },
            { key: '天气', label: '天气', type: 'checkboxes', options: ['晴天', '雨天', '雪天'] },
            { key: '窝料', label: '窝料', type: 'checkboxes', options: ['鱼肉饵料', '昆虫饵料', '素食饵料'] },
            { key: '水域', label: '水域', type: 'checkboxes', options: ['河流', '湖泊', '海洋', '珊瑚海', '云霓海域', '明洋海域', '孢子瀑布(悬梦亭)', '暗水畔'] },
            { key: '时间', label: '时间', type: 'text', placeholder: '如: 全天 或 6点-18点' }
        ],
        filterElements: [
            { type: 'checkbox-group', id: 'season-group', field: 'season', totalValues: 4 },
            { type: 'select', id: 'water-filter', field: 'water' },
            { type: 'select', id: 'weather-filter', field: 'weather' },
            { type: 'select', id: 'bait-filter', field: 'bait' },
            { type: 'custom', id: 'collect-filter' }
        ]
    });
});
