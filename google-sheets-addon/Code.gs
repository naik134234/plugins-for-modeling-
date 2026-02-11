/**
 * @OnlyCurrentDoc
 * 
 * Risk Modeling Platform — Google Sheets Add-on
 * All calculations run natively in Apps Script (no API dependency).
 */

// ══════════════════════════════════════════════════
// MENU & SIDEBAR
// ══════════════════════════════════════════════════

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Risk Modeling')
    .addItem('Open Sidebar', 'showSidebar')
    .addSeparator()
    .addItem('VaR from Selection', 'calculateVaRFromSelection')
    .addToUi();
}

function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('Sidebar')
      .setTitle('Risk Modeling Platform')
      .setWidth(340);
  SpreadsheetApp.getUi().showSidebar(html);
}

// ══════════════════════════════════════════════════
// HELPER: Get Selected Data
// ══════════════════════════════════════════════════

function getSelectedData() {
  var selection = SpreadsheetApp.getActiveRange();
  if (!selection) throw new Error('No range selected.');
  var values = selection.getValues();
  var flat = [];
  for (var i = 0; i < values.length; i++) {
    for (var j = 0; j < values[i].length; j++) {
      var v = values[i][j];
      if (typeof v === 'number' && !isNaN(v)) flat.push(v);
    }
  }
  return flat;
}

// ══════════════════════════════════════════════════
// HELPER: Math functions
// ══════════════════════════════════════════════════

function mean_(arr) {
  var s = 0;
  for (var i = 0; i < arr.length; i++) s += arr[i];
  return s / arr.length;
}

function stdDev_(arr) {
  var m = mean_(arr);
  var ssq = 0;
  for (var i = 0; i < arr.length; i++) ssq += (arr[i] - m) * (arr[i] - m);
  return Math.sqrt(ssq / (arr.length - 1));
}

function percentile_(arr, p) {
  var sorted = arr.slice().sort(function(a, b) { return a - b; });
  var idx = (p / 100) * (sorted.length - 1);
  var lo = Math.floor(idx);
  var hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function normalCDF_(x) {
  var t = 1 / (1 + 0.2316419 * Math.abs(x));
  var d = 0.3989422804014327;
  var p = d * Math.exp(-x * x / 2) * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

function normalPPF_(p) {
  // Beasley-Springer-Moro approximation
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;
  var a = [0, -3.969683028665376e1, 2.209460984245205e2,
           -2.759285104469687e2, 1.383577518672690e2,
           -3.066479806614716e1, 2.506628277459239e0];
  var b = [0, -5.447609879822406e1, 1.615858368580409e2,
           -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  var c = [0, -7.784894002430293e-3, -3.223964580411365e-1,
           -2.400758277161838e0, -2.549732539343734e0,
            4.374664141464968e0, 2.938163982698783e0];
  var d = [0, 7.784695709041462e-3, 3.224671290700398e-1,
           2.445134137142996e0, 3.754408661907416e0];
  var plow = 0.02425, phigh = 1 - plow;
  var q, r;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[1]*q+c[2])*q+c[3])*q+c[4])*q+c[5])*q+c[6]) /
           ((((d[1]*q+d[2])*q+d[3])*q+d[4])*q+1);
  } else if (p <= phigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[1]*r+a[2])*r+a[3])*r+a[4])*r+a[5])*r+a[6]) * q /
           (((((b[1]*r+b[2])*r+b[3])*r+b[4])*r+b[5])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[1]*q+c[2])*q+c[3])*q+c[4])*q+c[5])*q+c[6]) /
            ((((d[1]*q+d[2])*q+d[3])*q+d[4])*q+1);
  }
}

function boxMuller_() {
  var u1 = Math.random(), u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ══════════════════════════════════════════════════
// 1. VALUE AT RISK (standalone — no API needed)
// ══════════════════════════════════════════════════

function calculateVaR(params) {
  var returns = params.returns;
  var pv = params.portfolio_value || 1000000;
  var cl = params.confidence_level || 0.95;
  var horizon = params.time_horizon || 1;
  var method = params.method || "historical";

  if (returns.length < 10) throw new Error("Need ≥ 10 data points");

  var mu = mean_(returns);
  var sigma = stdDev_(returns);
  var varPct, es;

  if (method === "parametric") {
    var z = normalPPF_(1 - cl);
    varPct = -(mu + z * sigma) * Math.sqrt(horizon);
    // ES for normal distribution
    var phi = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
    es = (mu + sigma * phi / (1 - cl)) * Math.sqrt(horizon) * pv;
  } else if (method === "monte_carlo") {
    var sims = [];
    for (var i = 0; i < 10000; i++) {
      var sim = 0;
      for (var d = 0; d < horizon; d++) sim += mu + sigma * boxMuller_();
      sims.push(sim);
    }
    sims.sort(function(a, b) { return a - b; });
    var cutoff = Math.floor(sims.length * (1 - cl));
    varPct = -sims[cutoff];
    var esSum = 0;
    for (var k = 0; k < cutoff; k++) esSum += sims[k];
    es = -(esSum / cutoff) * pv;
  } else {
    // Historical
    var sorted = returns.slice().sort(function(a, b) { return a - b; });
    var idx = Math.floor(sorted.length * (1 - cl));
    varPct = -sorted[idx] * Math.sqrt(horizon);
    var esSum2 = 0;
    for (var m = 0; m <= idx; m++) esSum2 += sorted[m];
    es = -(esSum2 / (idx + 1)) * Math.sqrt(horizon) * pv;
  }

  return {
    var_method: method,
    confidence_level: (cl * 100) + "%",
    var_absolute: Math.round(varPct * pv * 100) / 100,
    var_percentage: Math.round(varPct * 10000) / 100,
    expected_shortfall: Math.round(es * 100) / 100,
    time_horizon_days: horizon,
    data_points_used: returns.length,
    daily_vol_pct: Math.round(sigma * 10000) / 100,
    annual_vol_pct: Math.round(sigma * Math.sqrt(252) * 10000) / 100,
  };
}

function calculateVaRFromSelection() {
  try {
    var returns = getSelectedData();
    var result = calculateVaR({ returns: returns, portfolio_value: 1000000, confidence_level: 0.95, method: "historical" });
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var r = sheet.getActiveCell().getRow();
    var c = sheet.getActiveCell().getColumn() + 3;
    sheet.getRange(r, c).setValue("VaR Results").setFontWeight("bold");
    sheet.getRange(r+1, c).setValue("Method"); sheet.getRange(r+1, c+1).setValue(result.var_method);
    sheet.getRange(r+2, c).setValue("VaR ($)"); sheet.getRange(r+2, c+1).setValue(result.var_absolute);
    sheet.getRange(r+3, c).setValue("VaR (%)"); sheet.getRange(r+3, c+1).setValue(result.var_percentage + "%");
    sheet.getRange(r+4, c).setValue("CVaR ($)"); sheet.getRange(r+4, c+1).setValue(result.expected_shortfall);
    sheet.getRange(r+5, c).setValue("Daily Vol"); sheet.getRange(r+5, c+1).setValue(result.daily_vol_pct + "%");
  } catch (e) {
    SpreadsheetApp.getUi().alert("Error: " + e.message);
  }
}

// ══════════════════════════════════════════════════
// 2. MERTON CREDIT RISK (standalone)
// ══════════════════════════════════════════════════

function calculateMerton(params) {
  var V = params.asset_value;
  var D = params.debt_face_value;
  var r = params.risk_free_rate || 0.05;
  var sigma = params.volatility || 0.3;
  var T = params.time_to_maturity || 1;

  var d1 = (Math.log(V / D) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  var d2 = d1 - sigma * Math.sqrt(T);

  var nd1 = normalCDF_(d1);
  var nd2 = normalCDF_(d2);
  var nMinusD2 = normalCDF_(-d2);

  var equityValue = V * nd1 - D * Math.exp(-r * T) * nd2;
  var debtValue = V - equityValue;
  var pd = nMinusD2;
  var dd = d2;
  var creditSpread = pd > 0 ? -Math.log(1 - pd * (1 - Math.exp(-r * T))) / T - r : 0;

  return {
    d1: Math.round(d1 * 10000) / 10000,
    d2: Math.round(d2 * 10000) / 10000,
    equity_value: Math.round(equityValue * 100) / 100,
    debt_value: Math.round(debtValue * 100) / 100,
    probability_of_default: Math.round(pd * 1000000) / 1000000,
    distance_to_default: Math.round(dd * 10000) / 10000,
    credit_spread_bps: Math.round(creditSpread * 10000),
  };
}

// ══════════════════════════════════════════════════
// 3. MONTE CARLO SIMULATION (standalone)
// ══════════════════════════════════════════════════

function runMonteCarlo(params) {
  var n = params.num_simulations || 10000;
  var mu = params.mean || 100;
  var sigma = params.std_dev || 15;

  var results = [];
  for (var i = 0; i < n; i++) {
    results.push(mu + sigma * boxMuller_());
  }
  results.sort(function(a, b) { return a - b; });

  var statMean = mean_(results);
  var statStd = stdDev_(results);
  var median = results[Math.floor(n / 2)];
  var p5 = results[Math.floor(n * 0.05)];
  var p95 = results[Math.floor(n * 0.95)];
  var negCount = 0;
  for (var j = 0; j < n; j++) { if (results[j] < 0) negCount++; }

  return {
    mean: Math.round(statMean * 100) / 100,
    std_dev: Math.round(statStd * 100) / 100,
    median: Math.round(median * 100) / 100,
    min: Math.round(results[0] * 100) / 100,
    max: Math.round(results[n - 1] * 100) / 100,
    percentile_5: Math.round(p5 * 100) / 100,
    percentile_95: Math.round(p95 * 100) / 100,
    prob_negative: Math.round(negCount / n * 10000) / 100,
    num_simulations: n,
  };
}

// ══════════════════════════════════════════════════
// 4. DCF VALUATION (standalone)
// ══════════════════════════════════════════════════

function calculateDCF(params) {
  var fcf = params.current_fcf;
  var wacc = params.wacc || 0.10;
  var tgr = params.terminal_growth || 0.03;
  var netDebt = params.net_debt || 0;
  var shares = params.shares_outstanding || 1;
  var growthRates = params.growth_rates || [0.08, 0.07, 0.06, 0.05, 0.04];

  var projections = [];
  var currentFCF = fcf;
  var sumPV = 0;

  for (var i = 0; i < growthRates.length; i++) {
    currentFCF = currentFCF * (1 + growthRates[i]);
    var pv = currentFCF / Math.pow(1 + wacc, i + 1);
    sumPV += pv;
    projections.push({ year: i + 1, fcf: Math.round(currentFCF * 100) / 100, pv: Math.round(pv * 100) / 100 });
  }

  var tv = currentFCF * (1 + tgr) / (wacc - tgr);
  var pvTV = tv / Math.pow(1 + wacc, growthRates.length);
  var ev = sumPV + pvTV;
  var equityValue = ev - netDebt;
  var sharePrice = equityValue / (shares / 1000); // shares in millions, value in billions

  return {
    sum_pv_fcfs: Math.round(sumPV * 100) / 100,
    terminal_value: Math.round(tv * 100) / 100,
    pv_terminal: Math.round(pvTV * 100) / 100,
    enterprise_value: Math.round(ev * 100) / 100,
    equity_value: Math.round(equityValue * 100) / 100,
    implied_share_price: Math.round(sharePrice * 100) / 100,
    projections: projections,
  };
}

// ══════════════════════════════════════════════════
// 5. BOND VALUATION (standalone)
// ══════════════════════════════════════════════════

function calculateBond(params) {
  var face = params.face_value || 1000;
  var couponRate = params.coupon_rate || 0.06;
  var years = params.years || 10;
  var marketRate = params.market_rate || 0.05;
  var freq = params.frequency || 2;

  var c = face * couponRate / freq;
  var n = years * freq;
  var r = marketRate / freq;

  var pvCoupons = c * (1 - Math.pow(1 + r, -n)) / r;
  var pvFace = face / Math.pow(1 + r, n);
  var price = pvCoupons + pvFace;

  // Macaulay duration
  var dur = 0;
  for (var t = 1; t <= n; t++) {
    dur += t * c / Math.pow(1 + r, t);
  }
  dur += n * face / Math.pow(1 + r, n);
  dur /= price;
  dur /= freq; // Convert to years

  var modDur = dur / (1 + r);
  var currentYield = face * couponRate / price;
  var status = price > face ? "Premium" : price < face ? "Discount" : "Par";

  return {
    bond_price: Math.round(price * 100) / 100,
    current_yield: Math.round(currentYield * 10000) / 10000,
    ytm: marketRate,
    macaulay_duration: Math.round(dur * 10000) / 10000,
    modified_duration: Math.round(modDur * 10000) / 10000,
    premium_discount: status,
  };
}

// ══════════════════════════════════════════════════
// GENERIC: Write results to active sheet
// ══════════════════════════════════════════════════

function writeResultsToSheet(title, results) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var startRow = sheet.getLastRow() + 2;
  
  // Title
  sheet.getRange(startRow, 1).setValue(title).setFontWeight("bold").setFontSize(12);
  startRow++;
  
  // Data rows
  var keys = Object.keys(results);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var val = results[key];
    if (typeof val === 'object' && val !== null) continue; // skip arrays/objects
    sheet.getRange(startRow + i, 1).setValue(key.replace(/_/g, ' ').toUpperCase()).setFontWeight("bold");
    sheet.getRange(startRow + i, 2).setValue(val);
  }
  
  // Auto-size
  sheet.autoResizeColumn(1);
  sheet.autoResizeColumn(2);
  
  return startRow;
}
