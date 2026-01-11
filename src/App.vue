<template>
  <div class="app-layout">
    <aside class="sidebar">
      <div class="logo">
        📊 ComputerView
      </div>
      <nav class="nav-menu">
        <router-link to="/graph" class="nav-item">
          <span class="icon">🕸️</span> 组织架构图
        </router-link>
        <router-link to="/attendance" class="nav-item">
          <span class="icon">📅</span> 考勤分析
        </router-link>
        <router-link to="/log-analysis" class="nav-item">
          <span class="icon">📉</span> 网络日志
        </router-link>
        <router-link to="/employee-profile" class="nav-item">
          <span class="icon">👤</span> 员工画像
        </router-link>
        <router-link to="/anomaly-analysis" class="nav-item">
          <span class="icon">🚨</span> 异常监测
        </router-link>
      </nav>
    </aside>

    <main class="main-content">
      <header class="top-header">
        <div class="breadcrumb">数据可视化分析平台 / Dashboard</div>
        <div class="user-info">Admin</div>
      </header>
      <div class="content-wrapper">
        <router-view />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-layout { display: flex; height: 100vh; width: 100vw; overflow: hidden; background-color: #f3f4f6; }
.sidebar { width: 240px; background: #ffffff; border-right: 1px solid #e5e7eb; display: flex; flex-direction: column; flex-shrink: 0; }
.logo { height: 64px; display: flex; align-items: center; padding-left: 24px; font-size: 20px; font-weight: 800; color: #3b82f6; border-bottom: 1px solid #f3f4f6; }
.nav-menu { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.nav-item { display: flex; align-items: center; padding: 12px 16px; text-decoration: none; color: #4b5563; border-radius: 8px; font-size: 15px; font-weight: 500; transition: all 0.2s; }
.nav-item:hover { background: #f9fafb; }
.nav-item.router-link-active { background: #eff6ff; color: #3b82f6; }
.nav-item .icon { margin-right: 12px; }
.main-content { flex: 1; display: flex; flex-direction: column; background: #f3f4f6; overflow: hidden; }
.top-header { height: 64px; background: white; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); flex-shrink: 0; }
.content-wrapper { flex: 1; overflow-y: auto; padding: 32px; }
</style>

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