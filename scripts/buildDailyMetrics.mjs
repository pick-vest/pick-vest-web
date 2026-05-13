import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'

const root = process.cwd()
const sourceDir = path.join(root, 'public', 'daily_3y')
const outputPath = path.join(root, 'public', 'processed_daily_metrics.json')
const files = ['krx_daily_2023.csv', 'krx_daily_2024.csv', 'krx_daily_2025.csv', 'krx_daily_2026.csv']

const toNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

const avg = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)

const std = (values) => {
  if (!values.length) return 0
  const mean = avg(values)
  return Math.sqrt(avg(values.map((value) => (value - mean) ** 2)))
}

const tickerOf = (value) => value.replace(/\D/g, '').padStart(6, '0')

const rowsByTicker = new Map()

for (const file of files) {
  const filePath = path.join(sourceDir, file)
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' })
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })
  let isHeader = true

  for await (const line of rl) {
    if (isHeader) {
      isHeader = false
      continue
    }
    if (!line.trim()) continue

    const [date, symbol, name, market, open, high, low, close, volume, tradingValue] = line.split(',')
    if (!date || !symbol || !close) continue

    const ticker = tickerOf(symbol)
    const record = rowsByTicker.get(ticker) ?? {
      ticker,
      name,
      market,
      rows: [],
    }

    record.name = name || record.name
    record.market = market || record.market
    record.rows.push({
      date,
      open: toNumber(open),
      high: toNumber(high),
      low: toNumber(low),
      close: toNumber(close),
      volume: toNumber(volume),
      tradingValue: toNumber(tradingValue),
    })
    rowsByTicker.set(ticker, record)
  }
}

const metrics = {}

for (const [ticker, record] of rowsByTicker) {
  const rows = record.rows
    .filter((row) => row.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (rows.length < 2) continue

  const latest = rows.at(-1)
  const previous = rows.at(-2)
  const last20 = rows.slice(-20)
  const last5 = rows.slice(-5)
  const last60 = rows.slice(-60)
  const last120 = rows.slice(-120)
  const base120 = rows.at(-121) ?? rows[0]
  const base60 = rows.at(-61) ?? rows[0]
  const returns120 = last120.slice(1).map((row, index) => {
    const prev = last120[index].close
    return prev ? (row.close - prev) / prev : 0
  })
  const downside = returns120.filter((value) => value < 0)
  const downsideDeviation = Math.sqrt(avg(downside.map((value) => value ** 2))) || 1e-6
  const sixMonthReturn = base120.close ? (latest.close - base120.close) / base120.close : 0
  const return3m = base60.close ? ((latest.close - base60.close) / base60.close) * 100 : 0
  const sortino6m = sixMonthReturn > 0 ? sixMonthReturn / downsideDeviation : 0
  const avgTradingValue5 = avg(last5.map((row) => row.tradingValue))
  const avgTradingValue20 = avg(last20.map((row) => row.tradingValue))
  const tradeValueRatio = avgTradingValue20 ? avgTradingValue5 / avgTradingValue20 : 1
  const dailyReturns = rows.slice(1).map((row, index) => {
    const prev = rows[index].close
    return prev ? (row.close - prev) / prev : 0
  })
  let peak = rows[0].close
  let peakDate = rows[0].date
  let maxDrawdown = 0

  rows.forEach((row) => {
    if (row.close > peak) {
      peak = row.close
      peakDate = row.date
    }
    const drawdown = peak ? ((row.close - peak) / peak) * 100 : 0
    if (drawdown < maxDrawdown) maxDrawdown = drawdown
  })

  const latestPeakIndex = rows.findLastIndex((row) => row.date === peakDate)
  const drawdownDays = latestPeakIndex >= 0 ? rows.length - latestPeakIndex - 1 : 0
  const dailyChangeRate = previous.close ? ((latest.close - previous.close) / previous.close) * 100 : 0

  metrics[ticker] = {
    ticker,
    name: record.name,
    market: record.market,
    latestDate: latest.date,
    close: latest.close,
    previousClose: previous.close,
    priceChange: latest.close - previous.close,
    dailyChangeRate,
    volume: latest.volume,
    tradingValue: latest.tradingValue,
    avgTradingValue5,
    avgTradingValue20,
    tradeValueRatio,
    return3m,
    sixMonthReturn: sixMonthReturn * 100,
    sortino6m,
    mdd: maxDrawdown,
    volatility: std(dailyReturns.slice(-120)) * Math.sqrt(252) * 100,
    drawdownDays,
  }
}

fs.writeFileSync(
  outputPath,
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: files.map((file) => `public/daily_3y/${file}`),
    symbolCount: Object.keys(metrics).length,
    metrics,
  }),
)

console.log(`Wrote ${Object.keys(metrics).length} symbols to ${outputPath}`)
