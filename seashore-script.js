// 赶海图鉴页面
import { initPage } from './common.js';

document.addEventListener('DOMContentLoaded', () => {
    initPage({
        dataUrl: 'seashore-data.json',
        storageKey: 'seashoreCollect',
        fieldMappings: {
            name: ['name', '名称'],
            season: ['season', '季节'],
            '获取途径': ['获取途径'],
            rank: ['rank', '等级']
        },
        cardFields: [
            { label: '季节', key: 'season' },
            { label: '获取途径', key: '获取途径' }
        ],
        filterElements: [
            { type: 'custom', id: 'collect-filter' }
        ]
    });
});