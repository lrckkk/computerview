<template>
  <div class="attendance-dashboard">
    <h1>员工考勤时间分析</h1>

    <AttendanceHeatmap />

    <hr/>

    <div class="bar-chart-section">
      <h3>员工上下班时间分布图</h3>
      <div class="tabs">
        <button
            v-for="dept in departments"
            :key="dept.key"
            :class="{ active: currentDepartment === dept.key }"
            @click="selectDepartment(dept.key)"
        >
          {{ dept.name }}
        </button>
      </div>

      <AttendanceBarChart :department="currentDepartment" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import AttendanceHeatmap from '@/components/AttendanceHeatmap.vue';
import AttendanceBarChart from '@/components/AttendanceBarChart.vue';

const currentDepartment = ref('Finance'); // 默认显示财务部
const departments = [
  { key: 'Finance', name: '财务部' },
  { key: 'HR', name: '人力资源部' },
  // ⭐️ 修正点：增加研发部细分选项
  { key: 'R&D', name: '研发部 (全部)' },
  { key: 'R&D-1059', name: '研发部 (1059领导)' },
  { key: 'R&D-1007', name: '研发部 (1007领导)' },
  { key: 'R&D-1068', name: '研发部 (1068领导)' }
];

const selectDepartment = (deptKey) => {
  currentDepartment.value = deptKey;
};
</script>

<style scoped>
.attendance-dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}
h1 {
  text-align: center;
  margin-bottom: 30px;
  font-size: 28px;
}
h3 {
  text-align: center;
  margin-top: 30px;
  margin-bottom: 20px;
}

/* 部门切换按钮样式 (与 App.vue 中的样式保持一致) */
.tabs {
  text-align: center;
  margin-bottom: 20px;
}
.tabs button {
  padding: 10px 20px;
  margin: 0 5px;
  border: 1px solid #ccc;
  background: #f9f9f9;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}
.tabs button.active {
  background: #42b983;
  color: white;
  border-color: #42b983;
  font-weight: bold;
}
hr {
  margin: 40px 0;
  border: none;
  border-top: 3px double #ccc;
}
</style>