const XLSX = require('xlsx');

function analyzeSilverStocks(filePath, etfStartTons, etfNowTons) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

  const headerKeys = Object.keys(sheet[0] || {});
  const depoKey = headerKeys.find(k => /depository/i.test(k)) || headerKeys[0];
  const prevKey = headerKeys.find(k => /prev/i.test(k)) || headerKeys[1];
  const totalKey = headerKeys.find(k => /total/i.test(k)) || headerKeys[2];

  const normalize = str => String(str || '').trim().toUpperCase();

  const totals = sheet.filter(row => {
    const text = normalize(row[depoKey]);
    return text.includes('REGISTERED') || text.includes('ELIGIBLE') || text.includes('COMBINED');
  });

  if (totals.length < 3) {
    console.error('❌ 未找到完整汇总行。实际找到：', totals.map(r => r[depoKey]));
    throw new Error('未找到完整的汇总行，请检查表格格式。');
  }

  const registered = totals.find(r => normalize(r[depoKey]).includes('REGISTERED'));
  const eligible = totals.find(r => normalize(r[depoKey]).includes('ELIGIBLE'));
  const combined = totals.find(r => normalize(r[depoKey]).includes('COMBINED'));

  const parseNum = val => Number(String(val || '').replace(/,/g, ''));

  const prevTotal = parseNum(combined[prevKey]);
  const totalToday = parseNum(combined[totalKey]);
  const registeredToday = parseNum(registered[totalKey]);
  const eligibleToday = parseNum(eligible[totalKey]);

  // === 单位换算：ETF 从吨转换为盎司 ===
  const TON_TO_OUNCE = 32150.7466;
  const etfStart = etfStartTons * TON_TO_OUNCE;
  const etfNow = etfNowTons * TON_TO_OUNCE;
  const etfChange = etfNow - etfStart;

  // === 计算变化 ===
  const totalChange = totalToday - prevTotal;
  const registeredRatio = registeredToday / totalToday;

  // === 紧张指数 ===
  const squeezeIndex =
    (-totalChange / 1e6) * 0.4 +       // 库存减少量（百万盎司）
    (-etfChange / 1e6) * 0.4 +         // ETF 减仓量（百万盎司）
    ((0.3 - registeredRatio) * 100);   // Registered 占比（越低越紧张）

  // === 生成解释文本 ===
  let explanation = `
📊 【白银库存分析】

• COMEX 总库存：${(totalToday / 1e6).toFixed(2)} 百万盎司（变化：${(totalChange / 1e6).toFixed(2)} 百万）
• 注册仓单（Registered）：${(registeredToday / 1e6).toFixed(2)} 百万盎司，占比 ${(registeredRatio * 100).toFixed(1)}%
• 非注册仓单（Eligible）：${(eligibleToday / 1e6).toFixed(2)} 百万盎司
• ETF 持仓变化：${(etfChange / 1e6).toFixed(2)} 百万盎司（≈ ${(etfChange / TON_TO_OUNCE).toFixed(2)} 吨）

📈 当前库存紧张指数：${squeezeIndex.toFixed(1)}

🧠 解读：
`;

  if (squeezeIndex > 10) {
    explanation += '👉 库存与ETF同时流出，Registered占比偏低，现货市场趋紧，存在逼仓风险。';
  } else if (squeezeIndex > 0) {
    explanation += '📉 库存略有下降或ETF减仓，市场略偏紧但尚可。';
  } else {
    explanation += '✅ 库存充足或ETF增仓，暂未出现逼仓迹象。';
  }

  return {
    totalToday,
    totalChange,
    registeredToday,
    registeredRatio,
    eligibleToday,
    etfChange,
    squeezeIndex,
    explanation
  };
}

module.exports = { analyzeSilverStocks };
