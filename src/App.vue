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

        <router-link to="/anomaly-analysis" class="nav-button">
          员工异常情况分析
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
// App.vue 保持不变
</script>

<style>
/* ... (样式保持不变) ... */
body {
  margin: 0;
  padding: 0;
  background-color: #f8f8f8;
  box-sizing: border-box;
  overflow-x: hidden;
}
*, *::before, *::after {
  box-sizing: inherit;
}


#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  color: #2c3e50;
  padding: 0;
}
.main-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 20px;
  width: 100%;
}

.global-tabs {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
}
.nav-button {
  display: inline-block;
  text-decoration: none;
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

.nav-button.router-link-active {
  background: #2c3e50;
  color: white;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}
</style>