const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 提供静态文件服务
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
// 添加JSON解析中间件
app.use(express.json());

// 创建上传文件夹
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// 引入路由
const optionRoutes = require('./routes/optionRoutes');
const silverRoutes = require('./routes/silverRoutes');

// 使用路由
app.use('/api', optionRoutes);
app.use('/api', silverRoutes);

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

module.exports = app;
