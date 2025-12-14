// src/utils/attendanceProcessor.js

import profileData from '../assets/employee_profile.json';
import checkingData from '../assets/checking_clean.json';

const MS_PER_HOUR = 60 * 60 * 1000;
// 视觉显示顺序 (Top -> Bottom): 财务部（上） -> 人力资源部（中） -> 研发部（下）
const DISPLAY_ORDER = ['Finance', 'HR', 'R&D'];
// Y轴加载顺序 (Bottom -> Top, 必须是显示顺序的反序): R&D -> HR -> Finance
const YAXIS_LOAD_ORDER = [...DISPLAY_ORDER].reverse();

// ECharts Grid 配置的边距（与 Vue 文件中保持一致）
const CHART_FIXED_HEIGHT = 800;
const GRID_TOP_PX = 50;
const GRID_BOTTOM_PX = 80;
const CHART_DRAWING_HEIGHT = CHART_FIXED_HEIGHT - GRID_TOP_PX - GRID_BOTTOM_PX; // 实际绘图区域高度

// 预处理员工部门信息和排序
const employeeDeptMap = new Map();
// ⭐️ 关键：新增员工 ID 到部门名称映射（使用简称）
const employeeDeptNameMap = new Map();
const deptEmployeeIds = {
    'Finance': [],
    'HR': [],
    'R&D': []
};

const deptNamesMap = { 'Finance': '财务', 'HR': '人力', 'R&D': '研发' };

profileData.forEach(p => {
    const id = String(p.employee_id);
    const dept = p.department;
    employeeDeptMap.set(id, dept);
    employeeDeptNameMap.set(id, deptNamesMap[dept]); // 存储简称
    if (DISPLAY_ORDER.includes(dept)) {
        deptEmployeeIds[dept].push(id);
    }
});

// 2. 排序员工ID (按部门内部ID升序排列，保持一致性)
Object.keys(deptEmployeeIds).forEach(dept => {
    deptEmployeeIds[dept].sort();
});

// 3. 生成全局排序后的员工ID列表
let sortedEmployeeIds = [];
// 使用 YAXIS_LOAD_ORDER 来确保 Y 轴加载顺序是 R&D -> HR -> Finance (实现 Finance 在最上)
YAXIS_LOAD_ORDER.forEach(dept => {
    sortedEmployeeIds = sortedEmployeeIds.concat(deptEmployeeIds[dept]);
});
const uniqueEmployeeIds = new Set(sortedEmployeeIds);


// 供柱形图使用的函数 (已修改为返回比例数据)
export function processBarChartData(department) {
    const TIME_BINS = 24 * 4;
    const BIN_SIZE_MS = 15 * 60 * 1000;
    const targetEmployeeIds = Array.from(employeeDeptMap.entries())
        .filter(([id, dept]) => dept === department)
        .map(([id]) => id);

    const checkinFreq = new Array(TIME_BINS).fill(0);
    const checkoutFreq = new Array(TIME_BINS).fill(0);

    // ⭐️ 新增：计算总打卡次数
    let totalCheckin = 0;
    let totalCheckout = 0;

    checkingData.forEach(item => {
        const id = String(item.id);
        if (targetEmployeeIds.includes(id)) {
            if (item.checkin) {
                const checkinDate = new Date(item.checkin);
                const totalMs = checkinDate.getHours() * MS_PER_HOUR + checkinDate.getMinutes() * 60 * 1000 + checkinDate.getSeconds() * 1000;
                const binIndex = Math.floor(totalMs / BIN_SIZE_MS);
                if (binIndex >= 0 && binIndex < TIME_BINS) {
                    checkinFreq[binIndex]++;
                    totalCheckin++; // 计数
                }
            }
            if (item.checkout) {
                const checkoutDate = new Date(item.checkout);
                const totalMs = checkoutDate.getHours() * MS_PER_HOUR + checkoutDate.getMinutes() * 60 * 1000 + checkoutDate.getSeconds() * 1000;
                const binIndex = Math.floor(totalMs / BIN_SIZE_MS);
                if (binIndex >= 0 && binIndex < TIME_BINS) {
                    checkoutFreq[binIndex]++;
                    totalCheckout++; // 计数
                }
            }
        }
    });

    // ⭐️ 关键修改 1: 计算相对频率 (Proportion)
    const checkinProportion = checkinFreq.map(count =>
        totalCheckin > 0 ? parseFloat((count / totalCheckin).toFixed(4)) : 0
    );
    const checkoutProportion = checkoutFreq.map(count =>
        totalCheckout > 0 ? parseFloat((count / totalCheckout).toFixed(4)) : 0
    );

    const xLabels = [];
    for (let i = 0; i < TIME_BINS; i++) {
        if (i % 4 === 0) {
            const hour = Math.floor(i / 4);
            xLabels.push(hour.toString().padStart(2, '0') + ':00');
        } else {
            xLabels.push('');
        }
    }

    // ⭐️ 关键修改 2: 返回 Proportional data (用于图表)
    return {
        checkinProportion: checkinProportion,
        checkoutProportion: checkoutProportion,
        xLabels: xLabels
    };
}


/**
 * 1. 处理全员工考勤热力图数据 (图 2-1) (保持不变)
 */
export function processHeatmapData() {
    const allWorkDays = new Set();
    const employeeDailyStats = new Map();
    // ⭐️ 新增：考勤详情快速查找表 (EmployeeId_Day -> { checkin, checkout })
    const attendanceDetailMap = new Map();

    checkingData.forEach(item => {
        const id = String(item.id);
        const day = item.day;

        if (!uniqueEmployeeIds.has(id)) return;

        allWorkDays.add(day);

        let workDuration = 0;
        if (item.checkin && item.checkout) {
            const checkinTime = new Date(item.checkin).getTime();
            const checkoutTime = new Date(item.checkout).getTime();
            workDuration = checkoutTime - checkinTime;
            if (workDuration < 0 || workDuration > 14 * MS_PER_HOUR) {
                workDuration = 0;
            }
        }
        const workDurationHours = workDuration / MS_PER_HOUR;

        if (!employeeDailyStats.has(id)) {
            employeeDailyStats.set(id, new Map());
        }
        employeeDailyStats.get(id).set(day, workDurationHours);

        // 填充查找表：存储原始的 checkin/checkout 字符串
        const key = `${id}_${day}`;
        attendanceDetailMap.set(key, {
            checkin: item.checkin,
            checkout: item.checkout
        });
    });

    const sortedDays = Array.from(allWorkDays).sort();

    let maxWorkHours = 0;
    const seriesData = [];

    sortedDays.forEach((day, dayIndex) => {
        sortedEmployeeIds.forEach((id, empIndex) => {
            const workHours = employeeDailyStats.get(id)?.get(day) || 0;
            seriesData.push([dayIndex, empIndex, parseFloat(workHours.toFixed(2))]);
            if (workHours > maxWorkHours) {
                maxWorkHours = workHours;
            }
        });
    });

    const deptNames = deptNamesMap; // 部门简称映射
    const deptMarkPoints = [];
    // 存储部门筛选范围
    const departmentRanges = { '全部': { startIndex: 0, endIndex: sortedEmployeeIds.length - 1 } };
    let cumulativeCount = 0;
    const totalEmployees = sortedEmployeeIds.length;

    // 必须迭代 over YAXIS_LOAD_ORDER (R&D -> HR -> Finance) for correct Y-axis index
    YAXIS_LOAD_ORDER.forEach(deptKey => {
        const count = deptEmployeeIds[deptKey].length;
        if (count > 0) {
            const deptName = deptNames[deptKey];

            // 记录索引范围
            const startIndex = cumulativeCount;
            const endIndex = cumulativeCount + count - 1;
            departmentRanges[deptName] = { startIndex, endIndex };

            // 计算部门名称应该放在 Y 轴上的员工索引中点
            const midpointIndex = cumulativeCount + (count / 2); // 使用精确浮点数中点

            // 1. 计算中点索引在整个员工列表中的归一化位置 (0.0 - 1.0)
            const yNormalized = midpointIndex / totalEmployees;

            // 2. 转换为相对于整个 CHART_FIXED_HEIGHT 容器顶部的百分比
            const drawingAreaHeightRatio = CHART_DRAWING_HEIGHT / CHART_FIXED_HEIGHT;
            const gridTopRatio = GRID_TOP_PX / CHART_FIXED_HEIGHT;

            // 相对于容器顶部的最终百分比位置 (CSS top %)
            const yPercentCSS = gridTopRatio * 100 + (1 - yNormalized) * drawingAreaHeightRatio * 100;

            // deptMarkPoints 用于 Vue 模板中的自定义 HTML 标签定位
            deptMarkPoints.push({
                name: deptName,
                yPercent: yPercentCSS,
                employeeCount: count,
            });
            cumulativeCount += count;
        }
    });

    // 部门分界线数据 (MarkLine) 必须基于 sortedEmployeeIds 的顺序 (R&D -> HR -> Finance)
    const deptMarkLines = [];
    let lineIndex = 0;

    // R&D / HR 分界线 (R&D 是第一个部门)
    lineIndex = deptEmployeeIds['R&D'].length;
    if (lineIndex > 0 && deptEmployeeIds['HR'].length > 0) {
        deptMarkLines.push({ yAxis: lineIndex - 0.5 });
    }

    // HR / Finance 分界线
    lineIndex += deptEmployeeIds['HR'].length;
    if (lineIndex > 0 && deptEmployeeIds['Finance'].length > 0) {
        deptMarkLines.push({ yAxis: lineIndex - 0.5 });
    }

    return {
        seriesData,
        xAxisData: sortedDays,
        yAxisData: sortedEmployeeIds,
        maxValue: Math.ceil(maxWorkHours),
        deptMarkLines,
        deptMarkPoints,
        departmentRanges,
        employeeDeptNameMap, // 员工ID -> 部门简称映射
        attendanceDetailMap,
        dateRange: {
            from: sortedDays[0],
            to: sortedDays[sortedDays.length - 1],
        }
    };
}
// 导出 employeeDeptNameMap 供 Vue 组件使用
export { employeeDeptNameMap };