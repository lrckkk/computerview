// src/main.js (示例，确保你的文件中有类似代码)

import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './assets/main.css'; // 👈 必须补上这一行，并按 Ctrl+S 保存

const app = createApp(App);
app.use(router);
app.mount('#app');