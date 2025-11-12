const fs = require('fs');
const XLSX = require('xlsx');
const { calculateMaxPain } = require('../services/maxPainService');
const { parseOptionData } = require('../utils/excelParser');

// 存储已解析的数据
const parsedDataStore = new Map();

// 处理期权数据计算的主控制器
const calculateOptions = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '没有上传文件' });
  }
  
  try {
    // 读取Excel文件
    const workbook = XLSX.readFile(req.file.path);
    
    // 获取所有工作表名称
    const sheetNames = workbook.SheetNames;
    
    // 读取第一个工作表数据
    const worksheet = workbook.Sheets[sheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // 解析期权数据
    const parsedData = parseOptionData(rawData);
    
    // 生成一个唯一的sessionId来存储解析后的数据
    const sessionId = Date.now().toString();
    parsedDataStore.set(sessionId, parsedData);
    
    // 获取所有月份
    const availableMonths = Object.keys(parsedData);
    const firstMonth = availableMonths[0];
    
    // 获取用户输入的参数
    const minStrike = req.body.minStrike ? parseFloat(req.body.minStrike) : 3000;
    const maxStrike = req.body.maxStrike ? parseFloat(req.body.maxStrike) : 4000;
    const selectedMonth = req.body.selectedMonth || firstMonth;
    
    // 获取选中月份的数据
    const monthData = parsedData[selectedMonth];
    
    // 计算结果 
    const result = calculateMaxPain(monthData.calls, monthData.puts, minStrike, maxStrike);
    
    // 添加月份信息
    result.availableMonths = availableMonths;
    result.selectedMonth = selectedMonth;
    result.sessionId = sessionId; // 返回sessionId供后续请求使用
    
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
};

// 处理月份切换的控制器，不重新解析文件
const calculateMonth = (req, res) => {
  try {
    const { sessionId, selectedMonth, minStrike, maxStrike } = req.body;
    
    // 检查sessionId是否存在
    if (!parsedDataStore.has(sessionId)) {
      return res.status(400).json({ error: '会话已过期或不存在' });
    }
    
    // 获取存储的解析数据
    const parsedData = parsedDataStore.get(sessionId);
    
    // 检查月份是否存在
    if (!parsedData[selectedMonth]) {
      return res.status(400).json({ error: '选择的月份不存在' });
    }
    
    // 获取选中月份的数据
    const monthData = parsedData[selectedMonth];
    
    // 计算结果
    const result = calculateMaxPain(
      monthData.calls, 
      monthData.puts, 
      minStrike ? parseFloat(minStrike) : 3700, 
      maxStrike ? parseFloat(maxStrike) : 4400
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  calculateOptions,
  calculateMonth,
  parsedDataStore
};