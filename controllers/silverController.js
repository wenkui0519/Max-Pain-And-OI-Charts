const fs = require('fs');
const { analyzeSilverStocks } = require('../services/silverAnalysisService');

// 处理白银库存分析的控制器
const analyzeSilver = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '没有上传文件' });
  }
  
  try {
    // 获取用户输入的参数
    const etfStart = req.body.etfStart ? parseFloat(req.body.etfStart) : 0;
    const etfNow = req.body.etfNow ? parseFloat(req.body.etfNow) : 0;
    
    // 调用分析函数并获取结果
    const result = analyzeSilverStocks(req.file.path, etfStart, etfNow);
    
    // 删除上传的文件
    fs.unlinkSync(req.file.path);
    
    // 返回结果
    res.json({ result: result });
  } catch (error) {
    // 删除上传的文件
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {
      // 忽略删除文件时的错误
    }
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  analyzeSilver
};