<template>
  <div class="log-analysis-view">
    <div class="card header-card">
      <h1 class="page-title">网络日志分析</h1>
      <p class="subtitle">实时监控员工登录行为与流量异常</p>
      
      <nav class="sub-tabs">
        <router-link to="/log-analysis/parallel-coord" class="tab-item">
          平行坐标概览
        </router-link>
        </nav>
    </div>

    <div class="chart-content">
      <router-view></router-view>
    </div>
  </div>
</template>

<style scoped>
.header-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px; /* 增加内边距 */
  text-align: center;
}

.page-title {
  font-size: 28px;
  color: #111827;
  margin-bottom: 8px;
}

.subtitle {
  color: #6b7280;
  margin-bottom: 24px;
}

/* 胶囊式 Tab 样式 */
.sub-tabs {
  display: inline-flex;
  background: #f3f4f6;
  padding: 4px;
  border-radius: 999px;
}

.tab-item {
  padding: 8px 24px;
  border-radius: 999px;
  text-decoration: none;
  color: #6b7280;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s;
}

.tab-item.router-link-active {
  background: white;
  color: #3b82f6;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
</style>

<script setup>
// LogAnalysisView.vue 是一个容器视图，通常逻辑较少
</script>

<style scoped>
.log-analysis-view {
  padding: 20px;
}
.view-title {
  text-align: center;
  margin-bottom: 5px;
  font-size: 24px;
  color: #2c3e50;
}
.view-divider {
  border: 0;
  height: 1px;
  background: #ccc;
  margin: 15px 0 30px 0;
}

.sub-tabs {
  text-align: center;
  margin-bottom: 25px;
}
.sub-nav-link {
  display: inline-block;
  text-decoration: none;
  color: #666;
  padding: 8px 15px;
  margin: 0 10px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 4px;
  transition: all 0.2s;
  font-size: 14px;
}
.sub-nav-link:hover {
  background: #f0f0f0;
}
.sub-nav-link.router-link-active {
  background: #5AD8A6; /* 突出显示当前选中的子图表 */
  color: white;
  border-color: #5AD8A6;
}
.chart-content {
  padding-top: 20px;
}
</style>