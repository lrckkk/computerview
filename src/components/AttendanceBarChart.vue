<template>
  <div class="chart-container">
    <h2>{{ departmentNames[department] }} 员工上下班时间分布</h2>
    <div ref="chartRef" class="bar-chart"></div>
  </div>
</template>

<script setup lang="js">
import { ref, onMounted, watch, onUnmounted } from 'vue';
import * as echarts from 'echarts';
import { processBarChartData } from '@/utils/attendanceProcessor.js';

// ⭐️ 修正点：扩展部门名称映射
const departmentNames = {
  'Finance': '财务部',
  'HR': '人力资源部',
  'R&D': '研发部 (全部)',
  'R&D-1059': '研发部 (1059领导)',
  'R&D-1007': '研发部 (1007领导)',
  'R&D-1068': '研发部 (1068领导)'
};

const props = defineProps({
  department: {
    type: String,
    required: true,
    // ⭐️ 修正点：更新验证规则
    validator: (value) => ['Finance', 'HR', 'R&D', 'R&D-1059', 'R&D-1007', 'R&D-1068'].includes(value)
  }
});

const chartRef = ref(null);
let myChart = null;

/**
 * 格式化数字，确保始终是两位 (例如 8 -> '08')
 * @param {number} num
 * @returns {string}
 */
const formatTimePart = (num) => String(num).padStart(2, '0');

const renderChart = (dept) => {
  if (!chartRef.value) return;

  const {
    checkinProportion: checkin,
    checkoutProportion: checkout,
    xLabels
  } = processBarChartData(dept);

  if (myChart) {
    myChart.dispose();
  }
  myChart = echarts.init(chartRef.value);

  const option = {
    title: {
      text: '频率分布',
      left: '2%',
      top: '2%',
      textStyle: {
        fontSize: 12
      }
    },
    tooltip: {
      trigger: 'axis',
      // Tooltip 格式：显示 15 分钟时间区间
      formatter: function (params) {
        const dataIndex = params[0].dataIndex; // 0 到 95 (24小时 * 4个刻度)

        // 1. 计算起始时间 (Start Time)
        const startTotalMinutes = dataIndex * 15;
        const startHour = Math.floor(startTotalMinutes / 60);
        const startMinute = startTotalMinutes % 60;
        const startTime = `${formatTimePart(startHour)}:${formatTimePart(startMinute)}`;

        // 2. 计算结束时间 (End Time)
        const endTotalMinutes = startTotalMinutes + 15;
        const endHour = Math.floor(endTotalMinutes / 60);
        const endMinute = endTotalMinutes % 60;
        const endTime = `${formatTimePart(endHour % 24)}:${formatTimePart(endMinute)}`;

        // 组装 Tooltip 头部：精确的时间区间，并移除星号
        let tooltip = `时间区间：${startTime} - ${endTime}<br/>`;

        // 组装数据详情，移除星号
        params.forEach(item => {
          const proportion = item.value;
          const percentage = (proportion * 100).toFixed(2) + '%';

          tooltip += `${item.marker} ${item.seriesName}: ${percentage}<br/>`;
        });
        return tooltip;
      },
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['上班 (Check-in) 频率', '下班 (Check-out) 频率'],
      bottom: '5%'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: xLabels,
      name: '时间 (每 15 分钟一格)',
      axisLabel: {
        // 每两小时显示一个刻度
        interval: 7,
        // 直立显示
        rotate: 0
      }
    },
    yAxis: {
      type: 'value',
      name: '频率 (占比)',
      axisLabel: {
        // 格式化为百分比
        formatter: function (value) {
          return (value * 100).toFixed(1) + '%';
        }
      }
    },
    series: [
      {
        name: '上班 (Check-in) 频率',
        type: 'bar',
        data: checkin,
        barMaxWidth: '80%',
        itemStyle: {
          color: '#5AD8A6'
        }
      },
      {
        name: '下班 (Check-out) 频率',
        type: 'bar',
        data: checkout,
        barMaxWidth: '80%',
        itemStyle: {
          color: '#F7B74E'
        }
      }
    ]
  };

  myChart.setOption(option);
  window.addEventListener('resize', resizeChart);
};

const resizeChart = () => {
  myChart && myChart.resize();
};

onMounted(() => {
  renderChart(props.department);
});

watch(() => props.department, (newDept) => {
  renderChart(newDept);
});

onUnmounted(() => {
  window.removeEventListener('resize', resizeChart);
  if (myChart) {
    myChart.dispose();
  }
});
</script>

<style scoped>
.chart-container {
  padding-top: 20px;
}
.bar-chart {
  width: 100%;
  height: 500px;
}
h2 {
  text-align: center;
  margin-bottom: 15px;
}
</style>