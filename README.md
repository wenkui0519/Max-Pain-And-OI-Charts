# Max-Pain-And-OI-Charts
期权最大痛苦价值计算，以及未平仓量、波动量可视化列表

## 功能

1. 读取Excel文件中的期权数据
2. 计算Max Pain（最大痛苦点）
3. 计算中性价值
4. 提供Web界面上传文件并查看计算结果
5. 提供命令行接口直接处理Excel文件

## 安装

确保你已经安装了Node.js，然后运行以下命令安装依赖：

```
npm install
```

## Excel文件结构

Excel文件必须包含两个工作表：
1. **call** 工作表，包含以下列：
   - Strike（执行价）
   - Call_Volume（看涨期权成交量）
   - Call_OI（看涨期权未平仓合约数）
   - Call_Change（看涨期权变化）

2. **put** 工作表，包含以下列：
   - Strike（执行价）
   - Put_Volume（看跌期权成交量）
   - Put_OI（看跌期权未平仓合约数）
   - Put_Change（看跌期权变化）

注意：程序只会处理在两个工作表中都存在的执行价（Strike）数据。

## 使用方法

### 方法1：使用Web界面

启动服务器：

```
node server.js
```

然后在浏览器中访问 `http://localhost:3000`，上传包含期权数据的Excel文件。

### 方法2：在代码中使用

你也可以在自己的代码中使用这个模块：

```javascript
const { calculateMaxPainFromExcel, createSampleExcel } = require('./calculateMaxPain');

// 创建示例Excel文件
createSampleExcel('my_options_data.xlsx');

// 从Excel文件计算Max Pain
const result = calculateMaxPainFromExcel('my_options_data.xlsx');
console.log('Max Pain:', result.maxPain);
```

## Max Pain理论

Max Pain理论认为，期权到期时，标的资产的价格会趋向于使期权卖方利益最大化的点，即使得期权买方总亏损最大的点。

计算方法：
1. 对于每个可能的到期价格（即执行价），计算所有未平仓期权的总亏损
2. 找到使总亏损最大的到期价格，这就是Max Pain点

## 技术栈

- Node.js
- Express.js（Web服务器）
- xlsx（处理Excel文件）
- mathjs（数学计算）

## 文件说明

- `calculateMaxPain.js` - 核心计算逻辑
- `server.js` - Web服务器
- `package.json` - 项目依赖
