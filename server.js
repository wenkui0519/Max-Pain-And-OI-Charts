const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { calculateMaxPainFromExcel } = require('./calculateMaxPain');

const app = express();
const port = 3000;

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// 创建上传文件夹
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const upload = multer({ storage: storage });

// 提供静态文件服务
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// 解析JSON请求体
app.use(express.json());

// 主页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 处理文件上传和计算的API端点
app.post('/calculate', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '没有上传文件' });
  }
  
  try {
    const result = calculateMaxPainFromExcel(req.file.path);
    // 删除上传的文件
    fs.unlinkSync(req.file.path);
    res.json(result);
  } catch (error) {
    // 删除上传的文件
    fs.unlinkSync(req.file.path);
    res.status(500).json({ error: error.message });
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});