// src/utils/logDataProcessor.js (最终版本：二级聚合，过滤研发部“无登录”，并暴露 L1 记录详情)

import profileData from '../assets/employee_profile.json';
import loginData from '../assets/login_clean.json';
// ⚠️ 警告：假设这里加载了正确的 tcplog_clean.json 数据，这里用 login_clean 模拟，但实际业务逻辑是处理 tcplog

import tpcLogData from '../assets/tcplog_clean.json';
// 1. 映射和分箱常量 (保持不变)
const deptNamesMap = { 'R&D': '研发', 'HR': '人力', 'Finance': '财务', 'Unknown': '未知' };
const ipToDeptMap = new Map();
const sipToIdMap = new Map();


profileData.forEach(p => {
    const dept = deptNamesMap[p.department] || deptNamesMap['Unknown'];
    ipToDeptMap.set(p.ip_address, dept);
    sipToIdMap.set(p.ip_address, String(p.employee_id));
});

// 2. 工具函数 (保持不变)
function getDateDay(timeStr) {
    if (!timeStr) return '未知日期';
    return timeStr.substring(0, 10);
}

function getErrorBin(count) {
    if (count > 20) return '大于20次';
    if (count >= 5) return '5-20次';
    return '小于5次';
}

function getTrafficBin(traffic_bytes_sum) {
    const traffic_unit = traffic_bytes_sum / 10**9;
    if (traffic_unit >= 40) return '40-50亿';
    if (traffic_unit >= 30) return '30-40亿';
    if (traffic_unit >= 20) return '20-30亿';
    if (traffic_unit >= 10) return '10-20亿';
    if (traffic_unit >= 1) return '1-10亿';
    return '小于1亿';
}

function getCountBinByRecordCount(count) {
    if (count > 1000) return '大于1000条';
    if (count >= 101) return '101-1000条';
    if (count >= 10) return '10-100条';
    if (count >= 4) return '4-10条';
    if (count === 3) return '3条';
    if (count === 2) return '2条';
    return '1条';
}


// 3. 核心聚合逻辑
function processLogRecords() {
    // Level 1: SIP + Date Aggregation (员工/天)
    const L1RecordsMap = new Map();

    const getL1Record = (sip, dateDay) => {
        const key = `${sip}|${dateDay}`;
        if (!L1RecordsMap.has(key)) {
            const dept = ipToDeptMap.get(sip) || deptNamesMap['Unknown'];
            const employeeId = sipToIdMap.get(sip) || 'N/A';

            L1RecordsMap.set(key, {
                dept: dept,
                employeeId: employeeId,
                dateDay: dateDay,
                totalErrors: 0,
                hasLoginRecord: false,
                totalUplink: 0,
                totalDownlink: 0,
                originalCount: 0,
                rawLogs: [],
            });
        }
        return L1RecordsMap.get(key);
    };

    // 3.1 & 3.2 处理 Login/TCPLOG 日志 (此处逻辑与上一次相同，确保 L1 记录生成正确)
    loginData.forEach(item => {
        const sip = item.sip;
        const dateDay = getDateDay(item.time);
        if (!ipToDeptMap.has(sip)) return;
        const record = getL1Record(sip, dateDay);
        record.hasLoginRecord = true;
        if (item.state === 'error' && item.user !== 'root') {
            record.totalErrors += 1;
        }
        record.originalCount += 1;
        record.rawLogs.push(item);
    });

    tpcLogData.forEach(item => {
        const sip = item.sip;
        const dateDay = getDateDay(item.stime || item.time);
        if (!ipToDeptMap.has(sip)) return;
        const record = getL1Record(sip, dateDay);
        record.totalUplink += (item.uplink_length || 0);
        record.totalDownlink += (item.downlink_length || 0);
        record.originalCount += 1;
        record.rawLogs.push(item);
    });

    // 4. Level 2: Dimensional Aggregation (按前5个维度分组)
    const L2RecordsMap = new Map();
    const knownDepartments = [deptNamesMap['R&D'], deptNamesMap['HR'], deptNamesMap['Finance']];

    for (const L1Record of L1RecordsMap.values()) {
        if (!knownDepartments.includes(L1Record.dept)) continue;

        const loginStatus = L1Record.hasLoginRecord ? '有' : '无';

        // 研发部“无登录”过滤
        if (L1Record.dept === deptNamesMap['R&D'] && loginStatus === '无') {
            continue;
        }

        const errorBin = getErrorBin(L1Record.totalErrors);
        const uplinkBin = getTrafficBin(L1Record.totalUplink);
        const downlinkBin = getTrafficBin(L1Record.totalDownlink);

        // L2 Key只包含前5个维度，忽略日期
        const L2Key = [L1Record.dept, loginStatus, errorBin, uplinkBin, downlinkBin].join('|');

        if (!L2RecordsMap.has(L2Key)) {
            L2RecordsMap.set(L2Key, {
                dimValues: [L1Record.dept, loginStatus, errorBin, uplinkBin, downlinkBin],
                L1Records: [],
                L2Count: 0,
                totalOriginalCount: 0
            });
        }

        const L2Record = L2RecordsMap.get(L2Key);
        L2Record.L1Records.push(L1Record);
        L2Record.L2Count += 1;
        L2Record.totalOriginalCount += L1Record.originalCount;
    }

    // 5. 最终数据格式化
    const finalData = [];

    for (const L2Record of L2RecordsMap.values()) {
        const countBin = getCountBinByRecordCount(L2Record.L2Count);

        const value = [
            ...L2Record.dimValues,
            countBin
        ];

        // 提取 Level 1 记录的详细信息列表
        const L1Details = L2Record.L1Records.map(r => ({
            user: r.employeeId,
            date: r.dateDay,
            errorCount: r.totalErrors
        }));

        // 提取一个代表性的 L1 记录信息用于 Tooltip
        const representativeL1Record = L2Record.L1Records[0];

        finalData.push({
            value: value,
            L2Count: L2Record.L2Count,
            originalCount: L2Record.totalOriginalCount,
            rawLogs: L2Record.L1Records.flatMap(r => r.rawLogs),
            L1Details: L1Details, // ⭐️ 新增：包含所有 Level 1 记录的关键信息
            tooltipInfo: {
                representativeUser: representativeL1Record.employeeId,
                representativeDate: representativeL1Record.dateDay,
                L2Count: L2Record.L2Count,
                aggregatedCount: L2Record.totalOriginalCount
            }
        });
    }

    // 统计所有 Level 1 记录（即：员工/天记录）的总数
    const totalOriginalLogs = finalData.reduce((sum, item) => sum + item.originalCount, 0);

    return {
        schema: [
            { dim: 0, name: '部门', data: ['研发', '人力', '财务'] },
            { dim: 1, name: '登录行为', data: ['有', '无'] },
            { dim: 2, name: 'IP错误登录', data: ['大于20次', '5-20次', '小于5次'] },
            { dim: 3, name: '上行流量', data: ['40-50亿', '30-40亿', '20-30亿', '10-20亿', '1-10亿', '小于1亿'].slice().reverse() },
            { dim: 4, name: '下行流量', data: ['40-50亿', '30-40亿', '20-30亿', '10-20亿', '1-10亿', '小于1亿'].slice().reverse() },
            { dim: 5, name: '数量', data: ['大于1000条', '101-1000条', '10-100条', '4-10条', '3条', '2条', '1条'].slice().reverse() }
        ],
        seriesData: finalData.map(d => d.value),
        originalDataMap: finalData,
        totalOriginalLogs: totalOriginalLogs
    };
}


export function processParallelChartData() {
    return processLogRecords();
}