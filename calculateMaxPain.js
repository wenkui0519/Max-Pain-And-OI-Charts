const XLSX = require('xlsx');

/**
 * 从Excel文件读取期权数据并计算Max Pain和中性价值
 * @param {string} filePath - Excel文件路径
 * @param {string} sheetName - 工作表名称（可选）
 */
function calculateMaxPainFromExcel(filePath) {
  try {
    // 读取Excel文件
    const workbook = XLSX.readFile(filePath);

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

    // 处理数据并计算Max Pain
    const result = calculateMaxPain(callData, putData);

    return result;
  } catch (error) {
    console.error('处理Excel文件时出错:', error);
    throw error;
  }
}

/**
 * 计算Max Pain和中性价值
 * @param {Array} data - 包含期权数据的数组
 * @returns {Object} 包含Max Pain和中性价值的结果对象
 */
function calculateMaxPain(callData, putData, minStrike = 3000, maxStrike = 4000) {
  // 验证数据
  if (!callData || callData.length === 0) {
    throw new Error('没有提供看涨期权数据');
  }

  if (!putData || putData.length === 0) {
    throw new Error('没有提供看跌期权数据');
  }

  // 创建Strike映射以便查找共有Strike
  const callStrikeMap = new Map();
  const putStrikeMap = new Map();

  // 填充Call Strike映射
  for (const item of callData) {
    callStrikeMap.set(item.Strike, item);
  }

  // 填充Put Strike映射
  for (const item of putData) {
    putStrikeMap.set(item.Strike, item);
  }

  // 添加映射关系
  const keyMap = {
    'volume': 'Total Volume',
    'oi': 'At Close',
    'change': 'Change',
  }

  // 收集所有唯一的执行价
  const allStrikes = new Set();
  for (const strike of callStrikeMap.keys()) {
    allStrikes.add(strike);
  }
  for (const strike of putStrikeMap.keys()) {
    allStrikes.add(strike);
  }

  // 为所有执行价创建数据结构
  const allStrikesData = [];
  for (const strike of [...allStrikes].sort((a, b) => a - b)) {
    allStrikesData.push({
      Strike: strike,
      Call_Volume: callStrikeMap.has(strike) ? callStrikeMap.get(strike)[keyMap.volume] || 0 : 0,
      Call_OI: callStrikeMap.has(strike) ? callStrikeMap.get(strike)[keyMap.oi] || 0 : 0,
      Call_Change: callStrikeMap.has(strike) ? callStrikeMap.get(strike)[keyMap.change] || 0 : 0,
      Put_Volume: putStrikeMap.has(strike) ? putStrikeMap.get(strike)[keyMap.volume] || 0 : 0,
      Put_OI: putStrikeMap.has(strike) ? putStrikeMap.get(strike)[keyMap.oi] || 0 : 0,
      Put_Change: putStrikeMap.has(strike) ? putStrikeMap.get(strike)[keyMap.change] || 0 : 0
    });
  }

  let commonStrikes = [];
  // 只处理指定范围内的call strike，用于commonStrikes显示
  for (const [strike, callItem] of callStrikeMap) {
    // 检查strike是否在指定范围内
    if (strike >= minStrike && strike <= maxStrike) {
      commonStrikes.push({
        Strike: strike,
        Call_Volume: callItem[keyMap.volume] || 0,
        Call_OI: callItem[keyMap.oi] || 0,
        Call_Change: callItem[keyMap.change] || 0,
        Put_Volume: putStrikeMap.has(strike) ? putStrikeMap.get(strike)[keyMap.volume] || 0 : 0,
        Put_OI: putStrikeMap.has(strike) ? putStrikeMap.get(strike)[keyMap.oi] || 0 : 0,
        Put_Change: putStrikeMap.has(strike) ? putStrikeMap.get(strike)[keyMap.change] || 0 : 0
      });
    }
  }

  if (allStrikesData.length === 0) {
    throw new Error('没有找到任何执行价');
  }
  // 所有执行价，用于图表
  const strikes = commonStrikes.sort((a, b) => a.Strike - b.Strike);

  // 按执行价排序
  const sortedData = allStrikesData.sort((a, b) => a.Strike - b.Strike);

  // 计算每个执行价下的总亏损
  const painPoints = [];

  // 遍历每个可能的到期价格（即执行价）
  for (const strikeData of sortedData) {
    const expiryPrice = strikeData.Strike;
    let totalPain = 0;

    // 计算看涨期权的亏损（仅计算价内期权）
    for (const callData of sortedData) {
      // 看涨期权价内条件：执行价 < 到期价格
      if (callData.Strike < expiryPrice) {
        // 看涨期权持有人的盈利 = (到期价格 - 执行价) * 未平仓合约数
        // 对于期权卖方来说是亏损
        const callPain = (expiryPrice - callData.Strike) * (callData.Call_OI || 0);
        totalPain += callPain;
      }
    }

    // 计算看跌期权的亏损（仅计算价内期权）
    for (const putData of sortedData) {
      // 看跌期权价内条件：执行价 > 到期价格
      if (putData.Strike > expiryPrice) {
        // 看跌期权持有人的盈利 = (执行价 - 到期价格) * 未平仓合约数
        // 对于期权卖方来说是亏损
        const putPain = (putData.Strike - expiryPrice) * (putData.Put_OI || 0);
        totalPain += putPain;
      }
    }

    painPoints.push({
      strike: expiryPrice,
      pain: totalPain
    });
  }

  // 检查painPoints是否为空
  if (painPoints.length === 0) {
    throw new Error('没有有效的执行价数据用于计算Max Pain');
  }

  // 查找最大疼痛点 - 期权卖方的最大亏损点
  const maxPainPoint = painPoints.reduce((min, point) =>
    point.pain < min.pain ? point : min,
    painPoints[0]
  );

  // 计算统计信息
  const totalCallOI = sortedData.reduce((sum, item) => sum + (item.Call_OI || 0), 0);
  const totalPutOI = sortedData.reduce((sum, item) => sum + (item.Put_OI || 0), 0);
  let totalOI = 0;
  let weightedStrikeSum = 0;

  for (const item of sortedData) {
    const oi = (item.Call_OI || 0) + (item.Put_OI || 0);
    weightedStrikeSum += item.Strike * oi;
    totalOI += oi;
  }

  return {
    maxPain: {
      strike: maxPainPoint.strike,
      pain: Number(maxPainPoint.pain) // 最大痛苦价值
    },
    painPoints: painPoints,
    summary: {
      totalCallOI: totalCallOI,
      totalPutOI: totalPutOI,
      totalOI: totalOI,
      totalCommonStrikes: commonStrikes.length
    },
    commonStrikes: strikes // 图表数据
  };
}

// 导出函数
module.exports = {
  calculateMaxPainFromExcel,
  calculateMaxPain,
};