<template>
  <div class="anomaly-analysis-view">
    <h1>员工异常情况分析模块</h1>
    <nav class="sub-tabs">
      <router-link to="/anomaly-analysis/attendance-anomaly" class="sub-nav-button">
        考勤异常情况
      </router-link>
    </nav>
    <router-view />
  </div>
</template>

<script setup>
// AnomalyAnalysisView.vue 只需要渲染子视图
</script>

<style scoped>
.anomaly-analysis-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}
h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 20px;
  font-size: 24px;
}
.sub-tabs {
  text-align: center;
  margin-bottom: 30px;
}
.sub-nav-button {
  display: inline-block;
  text-decoration: none;
  color: #dc3545; /* 使用红色系强调“异常” */
  padding: 8px 15px;
  margin: 0 10px;
  border: 1px solid #dc3545;
  background: white;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.2s;
}
.sub-nav-button:hover {
  background: #fff0f0;
}
.sub-nav-button.router-link-active {
  background: #dc3545;
  color: white;
}
</style>