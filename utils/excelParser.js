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
        // 数据处理
        let value = row[j] || '';
        if (value === null || value === undefined || value === '') {
          value = 0;
        } else if (typeof value === 'number') {
        } else if (value && typeof value === 'string') {
          if (value.includes(',')) {
            value = value.replace(/,/g, '');
          }
          value = parseFloat(value) || 0;
        }
        rowData[headers[j]] = value;
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

module.exports = { parseOptionData };