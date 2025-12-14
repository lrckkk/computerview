// src/router/index.js

import { createRouter, createWebHashHistory } from 'vue-router';

// 导入主视图组件
import GraphView from '@/views/GraphView.vue';
import AttendanceView from '@/views/AttendanceView.vue';

// ⭐️ 新增：日志分析模块的主视图
import LogAnalysisView from '@/views/LogAnalysisView.vue';


// 导入图表组件
import AttendanceBarChart from '@/components/AttendanceBarChart.vue';
import AttendanceHeatmap from '@/components/AttendanceHeatmap.vue';
import ParallelLogChart from '@/components/ParallelLogChart.vue'; // ⭐️ 新增：平行坐标图组件

const routes = [
    {
        path: '/',
        redirect: '/graph' // 设置默认路径重定向到组织结构图
    },
    {
        path: '/graph',
        name: 'Graph',
        component: GraphView,
        meta: { title: '部门组织结构图' }
    },
    {
        path: '/attendance',
        name: 'Attendance',
        component: AttendanceView, // 对应考勤分析模块的主容器
        meta: { title: '员工考勤时间分析' },
        // ⭐️ 考勤分析的子路由
        children: [
            {
                path: 'heatmap', // 路径: /attendance/heatmap
                name: 'AttendanceHeatmap',
                component: AttendanceHeatmap,
                meta: { title: '考勤热力概览' }
            },
            {
                // 注意：这里使用动态参数 :dept
                path: 'time-distribution/:dept', // 路径: /attendance/time-distribution/HR
                name: 'TimeDistribution',
                component: AttendanceBarChart,
                props: true, // 允许将路由参数作为 props 传递给组件
                meta: { title: '上下班时间分布' }
            },
            // 默认子路由：如果直接访问 /attendance，重定向到热力图
            {
                path: '',
                redirect: { name: 'AttendanceHeatmap' }
            }
        ]
    },
    // ⭐️ 新增：网络日志分析模块
    {
        path: '/log-analysis',
        name: 'LogAnalysis',
        component: LogAnalysisView, // 对应日志分析模块的主容器
        meta: { title: '网络日志分析' },
        children: [
            {
                path: 'parallel-coord', // 路径: /log-analysis/parallel-coord
                name: 'ParallelCoord',
                component: ParallelLogChart,
                meta: { title: '日志平行坐标图' }
            },
            // 默认子路由：如果直接访问 /log-analysis，重定向到平行坐标图
            {
                path: '',
                redirect: { name: 'ParallelCoord' }
            }
        ]
    }
];

// 使用 createWebHashHistory 模式
const router = createRouter({
    history: createWebHashHistory(),
    routes
});

// 可选：每次路由跳转后更新页面标题
router.beforeEach((to, from, next) => {
    if (to.meta.title) {
        document.title = to.meta.title;
    }
    next();
});

export default router;