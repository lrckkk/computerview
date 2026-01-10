// src/workers/logData.worker.js

// 监听主线程发来的消息
self.onmessage = async (e) => {
    if (e.data === 'start') {
        try {
            // 1. 在 Worker 线程中并行下载数据 (不占用主线程网络资源)
            const [profileRes, loginRes, tcpRes] = await Promise.all([
                fetch('/data/employee_profile.json').then(res => res.json()),
                fetch('/data/login_clean.json').then(res => res.json()),
                fetch('/data/tcplog_clean.json').then(res => res.json())
            ]);

            // 2. 开始计算 (这里是原来的核心逻辑)
            const result = processLogRecords(profileRes, loginRes, tcpRes);

            // 3. 计算完成，把结果发回主线程
            self.postMessage({ type: 'success', data: result });

        } catch (error) {
            self.postMessage({ type: 'error', message: error.message });
        }
    }
};

// ============================================================
// 下面是原 logDataProcessor.js 的逻辑，稍作修改以适配参数传入
// ============================================================

const deptNamesMap = { 'R&D': '研发', 'HR': '人力', 'Finance': '财务', 'Unknown': '未知' };

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
    if (traffic_bytes_sum >= 4 * 10**9) return '40-50亿';
    if (traffic_bytes_sum >= 3 * 10**9) return '30-40亿';
    if (traffic_bytes_sum >= 2 * 10**9) return '20-30亿';
    if (traffic_bytes_sum >= 1 * 10**9) return '10-20亿';
    if (traffic_bytes_sum >= 1 * 10**8) return '1-10亿';
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

// 核心处理函数 (接收 3 个数据源作为参数)
function processLogRecords(profileData, loginData, tpcLogData) {
    const ipToDeptMap = new Map();
    const sipToIdMap = new Map();

    // 构建映射
    profileData.forEach(p => {
        const dept = deptNamesMap[p.department] || deptNamesMap['Unknown'];
        ipToDeptMap.set(p.ip_address, dept);
        sipToIdMap.set(p.ip_address, String(p.employee_id));
    });

    // Level 1: SIP + Date Aggregation
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

    // 处理 Login 数据
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

    // 处理 TCP Log 数据
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

    // Level 2: Dimensional Aggregation
    const L2RecordsMap = new Map();
    const knownDepartments = [deptNamesMap['R&D'], deptNamesMap['HR'], deptNamesMap['Finance']];

    for (const L1Record of L1RecordsMap.values()) {
        if (!knownDepartments.includes(L1Record.dept)) continue;
        const loginStatus = L1Record.hasLoginRecord ? '有' : '无';
        if (L1Record.dept === deptNamesMap['R&D'] && loginStatus === '无') continue;

        const errorBin = getErrorBin(L1Record.totalErrors);
        const uplinkBin = getTrafficBin(L1Record.totalUplink);
        const downlinkBin = getTrafficBin(L1Record.totalDownlink);

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

    // 最终数据格式化
    const finalData = [];
    for (const L2Record of L2RecordsMap.values()) {
        const countBin = getCountBinByRecordCount(L2Record.L2Count);
        const value = [...L2Record.dimValues, countBin];
        const L1Details = L2Record.L1Records.map(r => ({
            user: r.employeeId,
            date: r.dateDay,
            errorCount: r.totalErrors
        }));
        const representativeL1Record = L2Record.L1Records[0];

        finalData.push({
            value: value,
            L2Count: L2Record.L2Count,
            originalCount: L2Record.totalOriginalCount,
            rawLogs: L2Record.L1Records.flatMap(r => r.rawLogs),
            L1Details: L1Details,
            tooltipInfo: {
                representativeUser: representativeL1Record.employeeId,
                representativeDate: representativeL1Record.dateDay,
                L2Count: L2Record.L2Count,
                aggregatedCount: L2Record.totalOriginalCount
            }
        });
    }

    const totalOriginalLogs = finalData.reduce((sum, item) => sum + item.originalCount, 0);
    const trafficBins = ['40-50亿', '30-40亿', '20-30亿', '10-20亿', '1-10亿', '小于1亿'].slice().reverse();

    return {
        schema: [
            { dim: 0, name: '部门', data: ['研发', '人力', '财务'] },
            { dim: 1, name: '登录行为', data: ['有', '无'] },
            { dim: 2, name: 'IP错误登录', data: ['大于20次', '5-20次', '小于5次'] },
            { dim: 3, name: '上行流量', data: trafficBins },
            { dim: 4, name: '下行流量', data: trafficBins },
            { dim: 5, name: '数量', data: ['大于1000条', '101-1000条', '10-100条', '4-10条', '3条', '2条', '1条'].slice().reverse() }
        ],
        seriesData: finalData.map(d => d.value),
        originalDataMap: finalData,
        totalOriginalLogs: totalOriginalLogs
    };
}