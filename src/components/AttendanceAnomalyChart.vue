<template>
  <div class="attendance-container">
    <h2>11月份员工考勤异常情况分析</h2>
    <div class="dept-tabs">
      <button
          v-for="dept in departments"
          :key="dept"
          :class="{ active: currentDept === dept }"
          @click="currentDept = dept"
      >
        {{ deptNameMap[dept] }}
      </button>
    </div>

    <div v-if="isLoading" class="loading-overlay">正在计算考勤异常数据...</div>

    <div v-else class="anomaly-dashboard">
      <div class="dept-panel">
        <div class="anomaly-section late-early-section">
          <h3>迟到早退异常</h3>
          <div class="chart-wrapper ratio-chart">
            <div :ref="el => setChartRef(el, 'lateEarlyRatio')" class="chart-liquid-fill"></div>
            <div class="ratio-label">
              <p>异常员工比例</p>
              <strong>{{ (currentData.lateEarlyRatio * 100).toFixed(1) }}%</strong>
              <small>(部门总人数: {{ currentData.totalEmployees }})</small>
            </div>
          </div>

          <div class="chart-wrapper bar-chart">
            <h4>迟到早退次数分布 (Top 20)</h4>
            <div :ref="el => setChartRef(el, 'lateEarlyBar')" class="chart-bar"></div>
          </div>
        </div>

        <div class="anomaly-section absence-section">
          <h3>旷工异常</h3>
          <div class="chart-wrapper ratio-chart">
            <div :ref="el => setChartRef(el, 'absenceRatio')" class="chart-liquid-fill"></div>
            <div class="ratio-label">
              <p>异常员工比例</p>
              <strong>{{ (currentData.absenceRatio * 100).toFixed(1) }}%</strong>
              <small>(部门总人数: {{ currentData.totalEmployees }})</small>
            </div>
          </div>

          <div class="chart-wrapper bar-chart">
            <h4>旷工次数分布 (Top 20)</h4>
            <div :ref="el => setChartRef(el, 'absenceBar')" class="chart-bar"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, nextTick, onUnmounted } from 'vue';
import * as echarts from 'echarts';
// ⚠️ 确保您已安装 echarts-liquidfill 扩展并正确导入 (npm install echarts-liquidfill --legacy-peer-deps)
import 'echarts-liquidfill';
// 导入修正后的数据处理函数
import { processAttendanceData } from '@/utils/attendanceAnomalyProcessor.js';

const isLoading = ref(true);
const currentDept = ref('Finance');
const departments = ['Finance', 'HR', 'R&D'];
const deptNameMap = { 'Finance': '财务部', 'HR': '人力资源部', 'R&D': '研发部' };

const attendanceData = ref(null);
const currentData = ref({});

const chartRefs = reactive({});

const setChartRef = (el, key) => {
  if (el) {
    chartRefs[key] = el;
  }
};

// ----------------------------------------------------
// ECharts 配置函数
// ----------------------------------------------------

// 水波图配置
const getLiquidFillOption = (ratio, color) => ({
  series: [{
    type: 'liquidFill',
    data: [ratio, ratio * 0.8],
    color: [color],
    waveAnimation: true,
    animationDuration: 0,
    animationDurationUpdate: 2000,
    outline: {
      borderDistance: 0,
      itemStyle: {
        borderWidth: 5,
        borderColor: color,
      }
    },
    label: { show: false },
    backgroundStyle: {
      color: 'rgba(230, 230, 230, 0.5)'
    }
  }]
});

// 柱状图配置
const getBarChartOption = (data, color) => ({
  // 确保底部空间充足
  grid: { left: '15%', top: '20%', right: '5%', bottom: '20%' },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  xAxis: {
    type: 'category',
    data: data.ids.map(id => `ID:${id}`),
    axisLabel: {
      // ⭐️ 核心修正：恢复旋转角度为 45 度，解决标签重叠问题
      rotate: 45,
      interval: 0,
      fontSize: 10
    },
  },
  yAxis: {
    type: 'value',
    name: '异常次数',
    nameTextStyle: {
      align: 'right'
    },
    min: 0,
    splitLine: { show: true }
  },
  series: [{
    name: '异常次数',
    type: 'bar',
    data: data.counts,
    itemStyle: {
      color: color
    }
  }]
});

// ----------------------------------------------------
// 渲染逻辑
// ----------------------------------------------------

const renderCharts = () => {
  if (!currentData.value || !chartRefs['lateEarlyRatio']) return;

  disposeCharts();

  // 1. 迟到早退图表
  const lateEarlyColor = '#F7B44E';
  const lateEarlyRatioChart = echarts.init(chartRefs['lateEarlyRatio']);
  // 只有当比例大于0时才尝试渲染水波图
  if (currentData.value.lateEarlyRatio > 0) {
    lateEarlyRatioChart.setOption(getLiquidFillOption(currentData.value.lateEarlyRatio, lateEarlyColor));
  } else {
    lateEarlyRatioChart.setOption({}); // 避免渲染错误
  }

  const lateEarlyBarChart = echarts.init(chartRefs['lateEarlyBar']);
  lateEarlyBarChart.setOption(getBarChartOption(currentData.value.lateEarlyBar, lateEarlyColor));

  // 2. 旷工图表
  const absenceColor = '#6DABFF';
  const absenceRatioChart = echarts.init(chartRefs['absenceRatio']);
  if (currentData.value.absenceRatio > 0) {
    absenceRatioChart.setOption(getLiquidFillOption(currentData.value.absenceRatio, absenceColor));
  } else {
    absenceRatioChart.setOption({});
  }

  const absenceBarChart = echarts.init(chartRefs['absenceBar']);
  absenceBarChart.setOption(getBarChartOption(currentData.value.absenceBar, absenceColor));
};

const disposeCharts = () => {
  Object.keys(chartRefs).forEach(key => {
    const chartInstance = echarts.getInstanceByDom(chartRefs[key]);
    if (chartInstance) {
      chartInstance.dispose();
    }
  });
};

// ----------------------------------------------------
// 生命周期和响应式逻辑
// ----------------------------------------------------

onMounted(() => {
  isLoading.value = true;

  try {
    attendanceData.value = processAttendanceData();
    currentData.value = attendanceData.value[currentDept.value];
    isLoading.value = false;

    nextTick(() => {
      renderCharts();
    });
  } catch (error) {
    console.error("处理考勤数据失败:", error);
    isLoading.value = false;
  }

  const handleResize = () => {
    Object.keys(chartRefs).forEach(key => {
      const chartInstance = echarts.getInstanceByDom(chartRefs[key]);
      chartInstance && chartInstance.resize();
    });
  };
  window.addEventListener('resize', handleResize);
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    disposeCharts();
  });
});

watch(currentDept, (newDept) => {
  if (attendanceData.value) {
    currentData.value = attendanceData.value[newDept];
    nextTick(() => {
      renderCharts();
    });
  }
});

onUnmounted(() => {
  disposeCharts();
});

</script>

<style scoped>
/* 样式与前一个版本保持一致 */
.attendance-container {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  margin-top: 30px;
  background-color: #fff;
}
h2 {
  text-align: center;
  color: #333;
  margin-bottom: 20px;
}
.dept-tabs {
  text-align: center;
  margin-bottom: 20px;
}
.dept-tabs button {
  padding: 10px 20px;
  margin: 0 5px;
  border: 1px solid #ccc;
  background-color: #f9f9f9;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s;
}
.dept-tabs button.active {
  background-color: #dc3545; /* 使用红色，与 anomaly-analysis 保持一致 */
  color: white;
  border-color: #dc3545;
}

.anomaly-dashboard {
  display: flex;
}
.dept-panel {
  display: flex;
  width: 100%;
  border: 1px solid #eee;
  border-radius: 6px;
}
.anomaly-section {
  flex: 1;
  padding: 15px;
  border-right: 1px solid #eee;
}
.anomaly-section:last-child {
  border-right: none;
}
.anomaly-section h3 {
  text-align: center;
  font-size: 18px;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #f0f0f0;
}

/* 布局：水波图和柱形图 */
.chart-wrapper {
  margin-bottom: 25px;
  position: relative;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  border-radius: 4px;
  padding: 10px;
}
.ratio-chart {
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: space-around;
}
.chart-liquid-fill {
  width: 120px;
  height: 120px;
  border-radius: 50%;
}
.ratio-label {
  text-align: center;
}
.ratio-label strong {
  font-size: 28px;
  display: block;
  margin: 5px 0;
}
.ratio-label small {
  color: #666;
}

.bar-chart h4 {
  text-align: center;
  font-size: 14px;
  color: #555;
  margin-bottom: 10px;
}
.chart-bar {
  /* 增加高度以容纳倾斜标签 */
  height: 320px;
}

/* 颜色区分 */
.late-early-section h3 { color: #F7B44E; }
.absence-section h3 { color: #6DABFF; }

.loading-overlay {
  text-align: center;
  padding: 50px;
  font-size: 16px;
  color: #007bff;
}
</style>