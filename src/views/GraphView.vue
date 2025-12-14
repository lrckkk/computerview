// src/views/GraphView.vue

<template>
  <div class="graph-view">
    <h1>探索部门内部组织结构：节点连接图</h1>

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

    <hr>

    <DepartmentGraph :department="currentDepartment" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import DepartmentGraph from '@/components/DepartmentGraph.vue';

// 组织结构图模块的私有状态
const currentDepartment = ref('Finance');
const departments = [
  { key: 'Finance', name: '财务部' },
  { key: 'HR', name: '人力资源部' },
  { key: 'R&D',name:'研发部' }
];

const selectDepartment = (deptKey) => {
  currentDepartment.value = deptKey;
};
</script>

<style scoped>
/* 视图内部的样式，避免影响全局 */
.graph-view {
  text-align: center;
  /* ⭐️ 修正：将 padding-top: 20px 改为 padding: 20px */
  padding: 20px;
}
h1 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 24px;
}
.tabs {
  margin-bottom: 20px;
}
.tabs button {
  padding: 10px 15px;
  margin: 0 5px;
  border: 1px solid #ccc;
  background-color: #f0f0f0;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.3s;
}
.tabs button.active {
  background-color: #5B8FF9;
  color: white;
  border-color: #5B8FF9;
}
</style>