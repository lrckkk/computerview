<template>
  <div class="log-analysis-view">
    <h1 class="view-title">网络日志分析模块</h1>
    <hr class="view-divider" />

    <nav class="sub-tabs">
      <router-link to="/log-analysis/parallel-coord" class="sub-nav-link">
        登陆日志及上下行流量数据平行坐标图
      </router-link>
    </nav>


    <div class="chart-content">
      <router-view></router-view>
    </div>
  </div>
</template>

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