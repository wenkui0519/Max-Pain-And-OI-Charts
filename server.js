const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

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
app.use(express.urlencoded({ extended: true }));

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
    // 读取Excel文件
    const workbook = XLSX.readFile(req.file.path);
    
    // 获取所有工作表名称
    const sheetNames = workbook.SheetNames;
    
    // 检查是否包含Call和Put工作表
    if (!sheetNames.includes('call') || !sheetNames.includes('put')) {
      throw new Error('Excel文件必须包含名为"call"和"put"的工作表');
    }
    
    // 读取Call数据
    const callWorksheet = workbook.Sheets['call'];
    const callData = XLSX.utils.sheet_to_json(callWorksheet);
    
    // 读取Put数据
    const putWorksheet = workbook.Sheets['put'];
    const putData = XLSX.utils.sheet_to_json(putWorksheet);
    
    // 获取用户输入的参数
    const minStrike = req.body.minStrike ? parseFloat(req.body.minStrike) : 3000;
    const maxStrike = req.body.maxStrike ? parseFloat(req.body.maxStrike) : 4000;
    
    // 导入计算函数
    const { calculateMaxPain } = require('./calculateMaxPain');
    
    // 计算结果
    const result = calculateMaxPain(callData, putData, minStrike, maxStrike);
    
    // 删除上传的文件
    fs.unlinkSync(req.file.path);
    res.json(result);
  } catch (error) {
    // 删除上传的文件
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {
      // 忽略删除文件时的错误
    }
    res.status(500).json({ error: error.message });
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});