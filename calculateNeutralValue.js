/**
 * 计算中性价值（Delta 绝对值加权平均法）
 * @param {Object} options
 * @param {number} options.S - 当前标的价格（现价）
 * @param {string|Date} options.expiry - 到期日期（如 '2025-11-24'）
 * @param {number} options.r - 无风险利率（SOFR, 例如 0.04197 表示 4.197%）
 * @param {number} options.iv - 隐含波动率（例如 0.1798 表示 17.98%）
 * @param {Object} options.data - 期权链数据 { calls: [...], puts: [...] }
 * @param {boolean} [options.debug=false] - 是否返回调试信息
 * @returns {number|{neutral:number,weights:Array}} 中性价或详细结果
 */
function calcNeutralPrice({ S, expiry, r, iv, data, debug = false }) {
  // -------- 工具函数定义 --------
  // 标准正态分布函数 N(x)
  function normCDF(x) {
    return 0.5 * (1 + Math.erf(x / Math.sqrt(2)));
  }

  // 计算 Δ
  function delta(S, K, r, T, sigma, type = 'call') {
    if (sigma * Math.sqrt(T) === 0) return type === 'call' ? 0.5 : -0.5;
    const d1 =
      (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) /
      (sigma * Math.sqrt(T));
    const Nd1 = normCDF(d1);
    return type === 'call' ? Nd1 : Nd1 - 1;
  }

  // 计算到期时间（年化）
  const now = new Date();
  const tDays = (new Date(expiry) - now) / (24 * 60 * 60 * 1000);
  const T = tDays / 365;
  if (T <= 0) throw new Error('到期日必须大于当前日期');

  // -------- 主计算逻辑 --------
  const strikes = [
    ...new Set([
      ...data.calls.map((c) => c.Strike),
      ...data.puts.map((p) => p.Strike),
    ]),
  ].sort((a, b) => a - b);

  let numerator = 0;
  let denominator = 0;
  const weights = [];

  for (const K of strikes) {
    const call = data.calls.find((c) => c.Strike === K);
    const put = data.puts.find((p) => p.Strike === K);
    const callOI = call ? call['At Close'] : 0;
    const putOI = put ? put['At Close'] : 0;

    const deltaCall = delta(S, K, r, T, iv, 'call');
    const deltaPut = delta(S, K, r, T, iv, 'put');

    const wCall = Math.abs(callOI * deltaCall);
    const wPut = Math.abs(putOI * deltaPut);
    const w = wCall + wPut;

    numerator += K * w;
    denominator += w;

    if (debug) {
      weights.push({
        Strike: K,
        callOI,
        putOI,
        deltaCall: +deltaCall.toFixed(4),
        deltaPut: +deltaPut.toFixed(4),
        weight: +w.toFixed(2),
      });
    }
  }

  const neutral = denominator > 0 ? numerator / denominator : null;
  return debug ? { neutral, weights, T_days: tDays, T_years: T } : neutral;
}

module.exports = { calcNeutralPrice };