// src/utils/attendanceAnomalyProcessor.js

import checkingData from '../assets/checking_clean.json';
import profileData from '../assets/employee_profile.json';
import rdStructure from '../assets/final_rd_structure.json';

// 1. 定义通用部门和研发部子部门的工作时间
const GENERAL_WORK_HOURS = {
    'Finance': { start: '08:00:00', end: '17:00:00' },
    'HR': { start: '09:00:00', end: '18:00:00' },
};

const RD_SUB_DEPT_HOURS = {
    // 1059 领导的部门：10:00 - 19:00
    '1059': { start: '10:00:00', end: '19:00:00' },
    // 1007, 1068 领导的部门：9:00 - 18:00
    '1007': { start: '09:00:00', end: '18:00:00' },
    '1068': { start: '09:00:00', end: '18:00:00' }
};

const RD_DEFAULT_HOURS = { start: '09:00:00', end: '18:00:00' }; // 针对未明确分组的 R&D 员工

// 2. 创建员工ID到部门和精确工时的映射
const employeeIdToDeptMap = new Map();
const employeeWorkHourMap = new Map();
const rdEmployees = new Set(); // 存储所有 R&D 员工的 ID

// A. 建立所有员工ID到部门的映射，并设置非 R&D 员工工时
profileData.forEach(p => {
    const employeeId = Number(p.employee_id);
    const department = p.department;
    employeeIdToDeptMap.set(employeeId, department);

    if (department === 'R&D') {
        rdEmployees.add(employeeId); // 收集 R&D 员工
    } else if (GENERAL_WORK_HOURS[department]) {
        employeeWorkHourMap.set(employeeId, GENERAL_WORK_HOURS[department]);
    }
});

// B. 建立研发部员工的精确工时映射 (按子部门覆盖)
const coveredRdEmployees = new Set();
rdStructure.forEach(structure => {
    const ministerId = structure.minister_id;
    const hours = RD_SUB_DEPT_HOURS[ministerId];

    if (hours) {
        structure.members.forEach(memberIdStr => {
            const memberId = Number(memberIdStr);
            employeeWorkHourMap.set(memberId, hours);
            coveredRdEmployees.add(memberId);
        });
    }
});

// ⭐️ C. 增强：为 R&D 中未被 final_rd_structure 覆盖的员工设置默认工时
rdEmployees.forEach(employeeId => {
    if (!coveredRdEmployees.has(employeeId)) {
        // 如果是 R&D 员工但未被子结构覆盖，赋予默认工时 9:00-18:00
        employeeWorkHourMap.set(employeeId, RD_DEFAULT_HOURS);
        // console.warn(`R&D Employee ID ${employeeId} not found in rdStructure. Assigned default hours.`); // 调试用
    }
});


// 3. 获取各部门总员工数
const totalEmployeesByDept = { 'Finance': 0, 'HR': 0, 'R&D': 0 };
profileData.forEach(p => {
    if (totalEmployeesByDept.hasOwnProperty(p.department)) {
        totalEmployeesByDept[p.department]++;
    }
});


// 辅助函数：将 HH:mm:ss 格式的时间转换为从午夜开始的秒数
function timeToSeconds(timeString) {
    if (!timeString) return 0;
    const parts = timeString.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2] || 0, 10);
    return hours * 3600 + minutes * 60 + seconds;
}

/**
 * 检查考勤记录是否异常
 * @returns {object} { late: boolean, early: boolean, absence: boolean }
 */
function checkAnomaly(record, departmentHours) {
    // 旷工：只判断 is_absence 字段，与工时无关
    const isAbsence = record.is_absence === 1;

    let isLate = false;
    let isEarly = false;

    // 迟到/早退：只有非旷工记录且工时信息存在时才检查
    if (!isAbsence && departmentHours) {
        const checkinTimeStr = record.checkin ? record.checkin.split(' ')[1] : null;
        const checkoutTimeStr = record.checkout ? record.checkout.split(' ')[1] : null;

        // --- 迟到判断 (8 分钟宽限期) ---
        if (checkinTimeStr) {
            const actualCheckinSeconds = timeToSeconds(checkinTimeStr);
            const standardCheckinSeconds = timeToSeconds(departmentHours.start);

            const LATE_GRACE_PERIOD_SECONDS = 8 * 60; // 8分钟宽限期 (480 秒)

            if (actualCheckinSeconds > (standardCheckinSeconds + LATE_GRACE_PERIOD_SECONDS)) {
                isLate = true;
            }
        }

        // --- 早退判断 (8 分钟宽限期) ---
        if (checkoutTimeStr) {
            const actualCheckoutSeconds = timeToSeconds(checkoutTimeStr);
            const standardCheckoutSeconds = timeToSeconds(departmentHours.end);

            const EARLY_DEPARTURE_GRACE_PERIOD_SECONDS = 8 * 60;

            if (actualCheckoutSeconds < (standardCheckoutSeconds - EARLY_DEPARTURE_GRACE_PERIOD_SECONDS)) {
                isEarly = true;
            }
        }
    }

    return { late: isLate, early: isEarly, absence: isAbsence };
}

/**
 * 处理考勤数据，按部门聚合异常次数和比例
 */
export function processAttendanceData() {
    // 聚合员工级别的异常数据 (每个部门内按员工ID分组)
    const anomalyMap = { 'Finance': {}, 'HR': {}, 'R&D': {} };

    checkingData.forEach(record => {
        const employeeId = record.id;
        const department = employeeIdToDeptMap.get(employeeId);
        const workHours = employeeWorkHourMap.get(employeeId); // ⭐️ 确保能拿到工时，即使是默认工时

        // 只根据部门信息过滤，确保所有有部门的记录（包括旷工）都会被处理。
        if (!department || !anomalyMap.hasOwnProperty(department)) return;

        const deptAnomalyMap = anomalyMap[department];
        if (!deptAnomalyMap[employeeId]) {
            deptAnomalyMap[employeeId] = {
                id: employeeId,
                lateEarlyCount: 0,
                absenceCount: 0,
                isLateOrEarly: false,
                isAbsence: false
            };
        }

        const employeeStats = deptAnomalyMap[employeeId];
        // 传入 workHours。如果 R&D 员工未被分组（理论上不应该，但为防万一），它会使用默认工时。
        const { late, early, absence } = checkAnomaly(record, workHours);

        if (late || early) {
            employeeStats.lateEarlyCount += (late ? 1 : 0) + (early ? 1 : 0);
            employeeStats.isLateOrEarly = true;
        }

        if (absence) {
            employeeStats.absenceCount += 1;
            employeeStats.isAbsence = true;
        }
    });

    const finalResults = {};

    ['Finance', 'HR', 'R&D'].forEach(dept => {
        const statsArray = Object.values(anomalyMap[dept]);
        const totalDeptEmployees = totalEmployeesByDept[dept];

        // 1. 迟到早退比例
        const lateEarlyAnomalyEmployees = statsArray.filter(s => s.isLateOrEarly).length;
        const lateEarlyRatio = totalDeptEmployees > 0 ? (lateEarlyAnomalyEmployees / totalDeptEmployees) : 0;

        // 2. 旷工比例
        const absenceAnomalyEmployees = statsArray.filter(s => s.isAbsence).length;
        const absenceRatio = totalDeptEmployees > 0 ? (absenceAnomalyEmployees / totalDeptEmployees) : 0;

        // 3. 准备柱状图数据 (只展示有异常的员工，按次数降序)
        const lateEarlyBarData = statsArray
            .filter(s => s.lateEarlyCount > 0)
            .sort((a, b) => b.lateEarlyCount - a.lateEarlyCount);

        const absenceBarData = statsArray
            .filter(s => s.absenceCount > 0)
            .sort((a, b) => b.absenceCount - a.absenceCount);

        finalResults[dept] = {
            lateEarlyRatio: parseFloat(lateEarlyRatio.toFixed(3)),
            absenceRatio: parseFloat(absenceRatio.toFixed(3)),
            lateEarlyBar: {
                ids: lateEarlyBarData.slice(0, 20).map(s => String(s.id)),
                counts: lateEarlyBarData.slice(0, 20).map(s => s.lateEarlyCount)
            },
            absenceBar: {
                ids: absenceBarData.slice(0, 20).map(s => String(s.id)),
                counts: absenceBarData.slice(0, 20).map(s => s.absenceCount)
            },
            totalEmployees: totalDeptEmployees
        };
    });

    return finalResults;
}