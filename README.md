# Max-Pain-And-OI-Charts
期权最大痛苦价值计算，以及未平仓量、波动量可视化列表

## 注：仅供学习参考，期权图只是参考的一部分。不能用于任何商业用途，任何商业使用或者对外开放平台使用与本人无关！

## 功能

1. 读取Excel文件中的期权数据
2. 计算Max Pain（最大痛苦点）
3. 提供Web界面上传文件并查看计算结果
4. 提供命令行接口直接处理Excel文件

## 安装

确保你已经安装了Node.js（ v22.18.0+ ），然后运行以下命令安装依赖：

```
npm install
```

## Excel文件结构

Excel文件从标题超链接下载期权数据，并修复数据格式为数值。
请注意：可以用office全选数据后，将数据修复为数值。或者用wps一键修复数据为数值！！！算是前置操作，不然计算会错误❌❌❌❌❌

## 使用方法

### 方法1：使用Web界面

启动服务器：

双击start-server.bat文件

然后在浏览器中访问 `http://localhost:3000`，上传包含期权数据的Excel文件。

### 方法2：在代码中使用

你也可以在自己的代码中使用这个模块：

```javascript
const { calculateMaxPain } = require('./calculateMaxPain');
```

## Max Pain理论

Max Pain理论认为，期权到期时，标的资产的价格会趋向于使期权卖方利益最大化的点，即使得期权买方总亏损最大的点。

计算方法：
1. 对于每个可能的到期价格（即执行价），计算所有未平仓期权的总亏损
2. 找到使总亏损最大的到期价格，这就是Max Pain点

## 技术栈

- Node.js
- Express.js
- xlsx
- ECharts

## 文件说明

- `calculateMaxPain.js` - 核心计算逻辑
- `server.js` - Web服务器、文件解析
