// src/components/ParallelLogChart.vue

<template>
  <div class="chart-container card">
    <div class="chart-header">
      <h2>登录日志及流量多维分析</h2>
      <div class="badges">
        <span class="badge">实时数据</span>
        <span class="badge blue">R&D部门重点</span>
      </div>
    </div>
    
    <p class="chart-description">
      拖动坐标轴刷选数据，分析异常流量与登录失败的关联。
    </p>

    <div 
      ref="chartRef" 
      class="parallel-chart" 
      :style="{ opacity: isLoading ? 0.3 : 1 }"
    ></div>
    
    <div v-if="!isLoading && chartData" class="selection-info">
      <p>
        总聚合记录数: {{ chartData.seriesData.length }} 条 (对应原始日志总数: {{ chartData.totalOriginalLogs }} 条)
      </p>
      <div v-if="selectedDataCount > 0">
        **已选中 {{ selectedDataCount }} 条聚合记录** (这些记录共包含 **{{ totalOriginalCount }}** 条原始日志)。
        <br/>
        部门分布: {{ departmentSummary }}
      </div>
      <div v-else>
        请在上方坐标轴上使用 **区域选择工具** 进行刷取。
      </div>

      <div v-if="rawSelectedLogs.length > 0" class="raw-data-preview">
        <h3>刷取记录的未分段原始数据 (前 {{ rawSelectedLogs.length }} 条预览)</h3>
        <pre class="raw-log-output">{{ formatRawLogs(rawSelectedLogs) }}</pre>
        <p v-if="totalOriginalCount > rawSelectedLogs.length" class="raw-log-note">
          ... 共有 {{ totalOriginalCount }} 条原始日志被选中，此处仅预览前 {{ rawSelectedLogs.length }} 条。
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* chart-container 不需要再写 border 和 box-shadow 了，因为用了全局 .card 类 */
.chart-container {
  width: 100%;
  max-width: 100%; /* 让它撑满容器 */
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f3f4f6; /* 加一条淡淡的分界线 */
}

.chart-header h2 {
  font-size: 18px;
  margin: 0;
}

/* 小标签样式 */
.badge {
  font-size: 12px;
  padding: 4px 8px;
  background: #ecfdf5;
  color: #059669;
  border-radius: 4px;
  margin-left: 8px;
}
.badge.blue {
  background: #eff6ff;
  color: #3b82f6;
}
</style>

<script setup lang="js">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import * as echarts from 'echarts';

const chartRef = ref(null);
let myChart = null;
let worker =null;//新增worker实例变量

const isLoading = ref(true);
let chartData = null;

const selectedDataCount = ref(0);
const totalOriginalCount = ref(0);
const departmentSummary = ref('');

// 存储被选中的原始日志
const rawSelectedLogs = ref([]);

// 格式化原始日志对象为可读的 JSON 字符串
const formatRawLogs = (logs) => {
  return logs.map(log => {
    const limitedLog = {};
    // 只显示最重要的几个字段
    ['user', 'time', 'stime', 'sip', 'dip', 'proto', 'state', 'uplink_length', 'downlink_length'].forEach(key => {
      if (log[key] !== undefined) limitedLog[key] = log[key];
    });
    return JSON.stringify(limitedLog, null, 2);
  }).join(',\n\n');
};


/**
 * 更新底部统计信息并收集原始日志
 * @param {Array<number>} selectedIndices ECharts 返回的被选中数据的索引数组
 */
const updateSelectionInfo = (selectedIndices) => {
  if (!chartData) return;

  if (selectedIndices.length === 0) {
    selectedDataCount.value = 0;
    totalOriginalCount.value = 0;
    departmentSummary.value = '';
    rawSelectedLogs.value = [];
    return;
  }

  selectedDataCount.value = selectedIndices.length;

  let originalCountSum = 0;
  const deptCounts = {};
  const collectedRawLogs = [];

  selectedIndices.forEach(index => {
    const record = chartData.originalDataMap[index];
    originalCountSum += record.originalCount; // 原始日志总数

    const deptName = record.value[0];
    // 部门统计累加 L2Count (员工/天记录数)
    deptCounts[deptName] = (deptCounts[deptName] || 0) + record.L2Count;

    // 收集原始日志（限制总数）
    if (record.rawLogs && collectedRawLogs.length < 50) {
      collectedRawLogs.push(...record.rawLogs);
    }
  });

  totalOriginalCount.value = originalCountSum;

  // 部门分布统计 L2 聚合记录的数量
  const summaryParts = Object.entries(deptCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .map(([dept, count]) => `${dept}: ${count} 条员工/天记录`);

  departmentSummary.value = summaryParts.join(' | ');

  // 仅预览前 5 条原始日志
  rawSelectedLogs.value = collectedRawLogs.slice(0, 5);
};


// ⭐️ 修正点 1: 将 resizeChart 函数定义提升到顶层作用域，确保 onUnmounted 能够正确引用。
const resizeChart = () => {
  myChart && myChart.resize();
};


const renderChart = () => {
  if (!chartRef.value || !chartData) return;

  if (myChart) {
    myChart.dispose();
  }
  myChart = echarts.init(chartRef.value);

  const option = {
    title: {
      text: '日志聚合记录分布',
      left: 'center'
    },
    color: [
    '#5470c6', '#91cc75', '#fac858', '#ee6666', 
    '#73c0de', '#3ba272', '#fc8452', '#9a60b4'
  ],
    toolbox: {
      show: true,
      feature: {
        brush: {
          type: ['rect', 'polygon', 'clear'],
          title: {
            rect: '区域选择 (矩形)',
            polygon: '区域选择 (多边形)',
            clear: '清除刷取'
          }
        },
        restore: { title: '重置视图' }
      },
      right: 20
    },
    tooltip: {
      trigger: 'item',
      formatter: function (params) {
        const record = chartData.originalDataMap[params.dataIndex];
        const info = record.tooltipInfo;
        const dimensions = chartData.schema.map(s => s.name);

        let tooltip = `**聚合分组信息:**<br/>`;
        // 强调 L2 聚合记录数
        tooltip += `此分组包含 **${info.L2Count}** 条员工/天记录。<br/>`;

        // 核心逻辑：根据 L2Count 进行条件显示
        if (info.L2Count < 5) {
          tooltip += `---<br/>**详细员工/天记录 (共 ${info.L2Count} 条):**<br/>`;

          // 遍历 L1Details 列表 (L1Details 在 logDataProcessor.js 中已添加)
          record.L1Details.forEach((details, index) => {
            // 显示员工ID、日期（只显示月-日）、当日错误次数
            tooltip += `${index + 1}. 员工 **${details.user}** (${details.date.substring(5)}) 登录错误 ${details.errorCount} 次。<br/>`;
          });
          tooltip += `---<br/>`;
        } else {
          // 否则，只显示一个代表性记录
          tooltip += `(例如，其中一个员工 ${info.representativeUser} 在 ${info.representativeDate.substring(5)} 日。)<br/>`;
          tooltip += `---<br/>`;
        }

        // 显示维度值
        params.value.forEach((val, index) => {
          tooltip += `${dimensions[index]}: ${val}<br/>`;
        });

        tooltip += `---<br/>`;
        // 显示原始日志总数
        tooltip += `分组内原始日志总数量: ${info.aggregatedCount} 条`;

        return tooltip;
      }
    },
    parallelAxis: chartData.schema.map(dim => ({
      dim: dim.dim,
      name: dim.name,
      type: 'category',
      data: dim.data,
      nameLocation: 'end',
      nameGap: 15,
      axisLabel: {
        rotate: 0,
        interval: 0
      }
    })),
    parallel: {
      left: '5%',
      right: '18%',
      bottom: '10%',
      top: '20%',
      layout: 'horizontal',
      lineStyle: {
        width: 1,
        opacity: 0.5
      },
      brush: {
        brushType: 'rect',
        throttleType: 'debounce',
        throttleDelay: 300,
        z: 10
      }
    },
    series: [
      {
        name: '日志聚合记录',
        type: 'parallel',
        smooth: true,
        data: chartData.seriesData,
        // 激进修正：提高线条宽度和透明度，并移除 large: true 确保稀疏数据渲染
        lineStyle: {
          width: 2,
          opacity: 1.0
        },
        inactiveOpacity: 0.05,
        activeOpacity: 1,
        color: ['#5AD8A6', '#F7B74E', '#5B8FF9'],
        // large: true // 移除此行，强制渲染稀疏线条
      }
    ]
  };

  myChart.setOption(option);

  // 修正后的 brushSelected 监听器逻辑
  myChart.on('brushSelected', function (params) {
    let selectedIndices = [];

    if (params.batch && params.batch.length > 0) {
      const batchItem = params.batch[0];

      if (batchItem.selected && batchItem.selected.length > 0 && Array.isArray(batchItem.selected[0].dataIndex)) {
        selectedIndices = batchItem.selected[0].dataIndex;
      }
    }

    updateSelectionInfo(selectedIndices);
  });

  // ⭐️ 修正点 2: 移除 renderChart 中重复添加监听器的代码。
  // const resizeChart = () => {
  //   myChart && myChart.resize();
  // };
  // window.addEventListener('resize', resizeChart);
};


//核心修改：挂载时启动 Worker
onMounted(() => {
  isLoading.value = true;

  // 1. 初始化 Worker
  worker = new Worker(new URL('../workers/logData.worker.js', import.meta.url), {
    type: 'module'
  });

  // 2. 监听 Worker 的计算结果
  worker.onmessage = async (e) => {
    const { type, data, message } = e.data;
    if (type === 'success') {
      console.log("✅ Worker 数据处理完成");
      chartData = data;
      isLoading.value = false;
      await nextTick();
      renderChart();
      updateSelectionInfo([]);
      window.addEventListener('resize', resizeChart);
    } else {
      console.error("❌ Worker 出错:", message);
      isLoading.value = false;
      alert("日志处理失败，请检查控制台");
    }
  };

  // 3. 发送开始指令
  worker.postMessage('start');
});

// ⭐️ 销毁时终止 Worker
onUnmounted(() => {
  window.removeEventListener('resize', resizeChart);
  if (myChart) myChart.dispose();
  if (worker) {
    worker.terminate(); // 释放内存
    worker = null;
  }
});
</script>

<style scoped>
.chart-container {
  position: relative;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto 40px;
  padding: 20px;
  border: 1px solid #eee;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.chart-description {
  text-align: center;
  margin-bottom: 20px;
  color: #666;
  font-size: 14px;
}
.parallel-chart {
  height: 500px;
  width: 100%;
  transition: opacity 0.5s;
}
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  z-index: 10;
  font-size: 16px;
}
.selection-info {
  margin-top: 20px;
  padding: 15px;
  border-top: 1px dashed #ccc;
  font-size: 14px;
  line-height: 1.6;
}
.raw-data-preview {
  margin-top: 15px;
  padding: 10px;
  border: 1px solid #ddd;
  background-color: #f9f9f9;
  max-height: 250px;
  overflow-y: auto;
}
.raw-log-output {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: monospace;
  font-size: 12px;
  background-color: #f9f9f9;
  border: none;
}
.raw-log-note {
  font-style: italic;
  color: #777;
  margin-top: 5px;
}
</style>