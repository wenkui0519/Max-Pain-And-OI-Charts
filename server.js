const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3000;

// 存储已解析的数据
const parsedDataStore = new Map();

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
// 添加JSON解析中间件
app.use(express.json());

// 设置API路由
app.post('/api/calculate', upload.single('file'), (req, res) => {
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
    
    // 导入计算函数
    const { calculateMaxPain } = require('./calculateMaxPain');
    
    // 获取选中月份的数据
    const monthData = parsedData[selectedMonth];
    
    // 计算结果 
    const result = calculateMaxPain(monthData.calls, monthData.puts, minStrike, maxStrike);
    
    // // 添加原始数据到结果中，只保留Strike和At Close属性
    // result.rawData = {
    //   calls: monthData.calls.map(item => ({
    //     Strike: item.Strike,
    //     "At Close": item["At Close"] || 0
    //   })),
    //   puts: monthData.puts.map(item => ({
    //     Strike: item.Strike,
    //     "At Close": item["At Close"] || 0
    //   }))
    // };
    
    // // 如果提供了计算中性价值所需的参数，则计算中性价值
    // const goldPrice = req.body.goldPrice ? parseFloat(req.body.goldPrice) : null;
    // const expiryDate = req.body.expiryDate || null;
    // const sofrRate = req.body.sofrRate ? parseFloat(req.body.sofrRate) / 100 : null; // 转换为小数
    // const impliedVolatility = req.body.impliedVolatility ? parseFloat(req.body.impliedVolatility) / 100 : null; // 转换为小数
    
    // if (goldPrice && expiryDate && sofrRate !== null && impliedVolatility !== null) {
    //   try {
    //     const { calcNeutralPrice } = require('./calculateNeutralValue');
    //     // 添加映射关系
    //     const keyMap = {
    //       'volume': 'Total Volume',
    //       'oi': 'At Close',
    //       'change': 'Change',
    //     };
        
    //     const filteredCalls = monthData.calls
    //       .map(item => ({ 
    //         Strike: item.Strike, 
    //         "At Close": item["At Close"] || item[keyMap.oi] || 0 
    //       }));
          
    //     const filteredPuts = monthData.puts
    //       .map(item => ({ 
    //         Strike: item.Strike, 
    //         "At Close": item["At Close"] || item[keyMap.oi] || 0 
    //       }));

    //     const neutralValue = calcNeutralPrice({
    //       S: goldPrice,
    //       expiry: expiryDate,
    //       r: sofrRate,
    //       iv: impliedVolatility,
    //       data: {
    //         calls: filteredCalls,
    //         puts: filteredPuts
    //       }
    //     });
    //     result.neutralValue = neutralValue;
    //   } catch (error) {
    //     console.error('计算中性价值时出错:', error);
    //     // 即使计算中性价值失败，也不影响Max Pain结果
    //   }
    // }
    
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
});

// 解析期权数据函数
function parseOptionData(rawData) {
  const parsedData = {};
  let currentMonth = null;
  let isReadingOptions = false;
  let headers = [];
  let currentOptionType = null; // 'calls' or 'puts'
  
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    
    // 检查是否是开始标记
    if (row[0] && row[0].toString().includes('OPTION TYPE: American Options')) {
      isReadingOptions = true;
      continue;
    }
    
    // 检查是否是结束标记
    if (row[0] && row[0].toString().includes('OPTION TYPE: Weekly Friday Option Week 1')) {
      isReadingOptions = false;
      currentMonth = null;
      currentOptionType = null;
      continue;
    }
    
    // 如果不在期权数据区域，跳过
    if (!isReadingOptions) {
      continue;
    }
    
    // 检查是否是月份标题行 (例如: "SEP 25 Calls" 或 "SEP 25 Puts")
    if (row[0] && (row[0].toString().includes('Calls') || row[0].toString().includes('Puts'))) {
      const monthMatch = row[0].toString().match(/([A-Z]{3} \d{1,2}) (Calls|Puts)/);
      if (monthMatch) {
        currentMonth = monthMatch[1];
        currentOptionType = monthMatch[2].toLowerCase(); // 'calls' or 'puts'
        
        if (!parsedData[currentMonth]) {
          parsedData[currentMonth] = { calls: [], puts: [] };
        }
        
        // 下一行是标题行
        if (i + 1 < rawData.length) {
          headers = rawData[i + 1];
          i++; // 跳过标题行
        }
        continue;
      }
    }
    
    // 处理数据行
    if (currentMonth && row.length > 0) {
      // 检查是否是空行
      if (row.length === 1 && !row[0]) {
        // 空行，跳过
        continue;
      }
      
      // 检查是否是totals行（不区分大小写）
      if (row[0] && row[0].toString().toLowerCase() === 'totals') {
        // totals行，跳过
        continue;
      }
      
      // 检查是否是新的月份标题（有时候可能没有空行分隔）
      const rowFirstCell = row[0] ? row[0].toString() : '';
      if (rowFirstCell.includes('Calls') || rowFirstCell.includes('Puts')) {
        const monthMatch = rowFirstCell.match(/([A-Z]{3} \d{1,2}) (Calls|Puts)/);
        if (monthMatch) {
          currentMonth = monthMatch[1];
          currentOptionType = monthMatch[2].toLowerCase(); // 'calls' or 'puts'
          
          if (!parsedData[currentMonth]) {
            parsedData[currentMonth] = { calls: [], puts: [] };
          }
          
          // 下一行是标题行
          if (i + 1 < rawData.length) {
            headers = rawData[i + 1];
            i++; // 跳过标题行
          }
          continue;
        }
      }
     
      // 创建对象
      const rowData = {};
      for (let j = 0; j < headers.length; j++) {
        rowData[headers[j]] = row[j] || '';
      }
      
      // 添加数据到对应的calls或puts数组
      if (currentMonth && currentOptionType) {
        if (currentOptionType === 'calls') {
          parsedData[currentMonth].calls.push(rowData);
        } else if (currentOptionType === 'puts') {
          parsedData[currentMonth].puts.push(rowData);
        }
      }
    }
  }
  
  return parsedData;
}

// 处理月份切换的API端点，不重新解析文件
app.post('/api/calculate-month', (req, res) => {
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
    
    // 导入计算函数
    const { calculateMaxPain } = require('./calculateMaxPain');
    
    // 计算结果
    const result = calculateMaxPain(
      monthData.calls, 
      monthData.puts, 
      minStrike ? parseFloat(minStrike) : 3700, 
      maxStrike ? parseFloat(maxStrike) : 4400
    );
    
    // // 添加原始数据到结果中，只保留Strike和At Close属性
    // result.rawData = {
    //   calls: monthData.calls.map(item => ({
    //     Strike: item.Strike,
    //     "At Close": item["At Close"] || 0
    //   })),
    //   puts: monthData.puts.map(item => ({
    //     Strike: item.Strike,
    //     "At Close": item["At Close"] || 0
    //   }))
    // };
    
    // 如果提供了计算中性价值所需的参数，则计算中性价值
    // const goldPrice = req.body.goldPrice ? parseFloat(req.body.goldPrice) : null;
    // const expiryDate = req.body.expiryDate || null;
    // const sofrRate = req.body.sofrRate ? parseFloat(req.body.sofrRate) / 100 : null; // 转换为小数
    // const impliedVolatility = req.body.impliedVolatility ? parseFloat(req.body.impliedVolatility) / 100 : null; // 转换为小数
    
    // if (goldPrice && expiryDate && sofrRate !== null && impliedVolatility !== null) {
    //   try {
    //     const { calcNeutralPrice } = require('./calculateNeutralValue');
    //     // 添加映射关系
    //     const keyMap = {
    //       'volume': 'Total Volume',
    //       'oi': 'At Close',
    //       'change': 'Change',
    //     };
        
    //     const filteredCalls = monthData.calls
    //       .map(item => ({ 
    //         Strike: item.Strike, 
    //         "At Close": item["At Close"] || item[keyMap.oi] || 0 
    //       }));
          
    //     const filteredPuts = monthData.puts
    //       .map(item => ({ 
    //         Strike: item.Strike, 
    //         "At Close": item["At Close"] || item[keyMap.oi] || 0 
    //       }));

    //     const neutralValue = calcNeutralPrice({
    //       S: goldPrice,
    //       expiry: expiryDate,
    //       r: sofrRate,
    //       iv: impliedVolatility,
    //       data: {
    //         calls: filteredCalls,
    //         puts: filteredPuts
    //       }
    //     });
    //     result.neutralValue = neutralValue;
    //   } catch (error) {
    //     console.error('计算中性价值时出错:', error);
    //     // 即使计算中性价值失败，也不影响Max Pain结果
    //   }
    // }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});