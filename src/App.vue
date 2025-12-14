<template>
  <div id="app">
    <div class="main-container">

      <nav class="global-tabs">
        <router-link to="/graph" class="nav-button">
          探索部门组织结构图
        </router-link>
        <router-link to="/attendance" class="nav-button">
          员工考勤时间分析
        </router-link>

        <router-link to="/log-analysis" class="nav-button">
          网络日志分析
        </router-link>
      </nav>

      <router-view />
    </div>
  </div>
</template>

<script setup>
// App.vue 现在不需要导入 DepartmentGraph 或 AttendanceView
// 只需要确保 Vue Router 在 main.js 中被正确启用即可
</script>

<style>
/* ... (保留原有的 CSS) ... */
body {
  margin: 0;
  padding: 0;
  background-color: #f8f8f8;
}


#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  color: #2c3e50;
  padding: 0;
}
.main-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 0;
}

/* 导航栏样式调整，使其兼容 router-link */
.global-tabs {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
}
.nav-button {
  display: inline-block; /* 使得 router-link 像 button 一样 */
  text-decoration: none; /* 移除链接下划线 */
  color: #2c3e50;
  padding: 12px 30px;
  margin: 0 10px;
  border: none;
  background: #e0e0e0;
  cursor: pointer;
  border-radius: 6px;
  font-weight: normal;
  font-size: 16px;
  transition: all 0.2s;
}

/* 选中样式：Vue Router 自动给当前链接添加 'router-link-active' 类 */
.nav-button.router-link-active {
  background: #2c3e50;
  color: white;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

/* 清理 App.vue 中不需要的 H1 和 HR 样式，它们现在属于 GraphView */
</style>