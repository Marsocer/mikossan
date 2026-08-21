// 赶海图鉴页面
import { initPage } from './common.js';

document.addEventListener('DOMContentLoaded', () => {
    initPage({
        dataUrl: 'seashore-data.json',
        storageKey: 'seashoreCollect',
        title: '赶海',
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
        manageFields: [
            { key: '名称', label: '名称', type: 'text', required: true },
            { key: '等级', label: '等级', type: 'select', options: ['王级', '传说', '优质', '普通', '常见'] },
            { key: '季节', label: '季节', type: 'season' },
            { key: '获取途径', label: '获取途径', type: 'text', placeholder: '如: 在星沙镇南方沙滩区域赶海获取' },
            { key: '时间', label: '时间', type: 'text', placeholder: '如: 全天' }
        ],
        filterElements: [
            { type: 'select', id: 'season-filter', field: 'season' },
            { type: 'custom', id: 'collect-filter' }
        ]
    });
});
