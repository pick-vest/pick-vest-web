import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent, type SVGProps } from 'react'
import './App.css'

type Theme = 'dark' | 'light'
type Period = '1m' | '3m' | '1y'
type Market = 'ALL' | 'KOSPI' | 'KOSDAQ'
type RankMode = 'total' | 'krx' | 'sortino' | 'trade'
type SelectControl = 'period' | 'market' | 'sector' | 'rank'
type WidgetGroup = 'global' | 'stock'

type WidgetId =
  | 'macroBoard'
  | 'hotTrendRanking'
  | 'smartMoneyRanking'
  | 'etfTop10'
  | 'marketThermometer'
  | 'sectorRadar'
  | 'hiddenGemMatrix'
  | 'stockSummary'
  | 'accountLink'
  | 'valuationBand'
  | 'mdd'
  | 'liveFeed'
  | 'flowPercentiles'
  | 'reasonCards'
  | 'discoveryTrend'

type Indicator = {
  id: WidgetId
  group: WidgetGroup
  label: string
  isChecked: boolean
}

type WidgetLayoutItem = {
  id: WidgetId
  order: number
  span: 4 | 6 | 8 | 12
}

type Sector = {
  id: string
  label: string
  scores: Record<Period, number>
  return3m: number
  turnoverBoost: number
}

type Stock = {
  ticker: string
  name: string
  sector: string
  market: Exclude<Market, 'ALL'>
  latestDate?: string
  lastPrice?: number
  priceChange?: number
  changeRate?: number
  marketCapRaw?: number
  latestVolume?: number
  tradingValue?: number
  indexNames?: string[]
  sortino6mRaw?: number
  tradeValueRatioRaw?: number
  sixMonthReturn?: number
  eps?: number
  bps?: number
  per: number
  pbr: number
  roe: number
  mdd: number
  volatility: number
  drawdownDays: number
  etfHits: number
  etfWeight: number
  turnover: number
  volumeGap: number
  return3m: number
  news: number
  priceHeat: number
}

type EnrichedStock = Stock & {
  sectorScore: number
  krxIndexHits: number
  sortino6m: number
  tradeValueRatio: number
  fundamentalTrendScore: number
  mddInverse: number
  krxNorm: number
  sortinoNorm: number
  tradeNorm: number
  fundamentalNorm: number
  mddNorm: number
  totalScore: number
  intrinsicScore: number
  marketAttentionScore: number
  flowScore: number
  riskScore: number
}

type Profile = {
  price: string
  change: string
  marketCap: string
  volume: string
  eps: string
}

type DailyMetric = {
  ticker: string
  name: string
  market: Exclude<Market, 'ALL'>
  latestDate: string
  close: number
  previousClose: number
  priceChange: number
  dailyChangeRate: number
  volume: number
  tradingValue: number
  avgTradingValue5: number
  avgTradingValue20: number
  tradeValueRatio: number
  return3m: number
  sixMonthReturn: number
  sortino6m: number
  mdd: number
  volatility: number
  drawdownDays: number
}

type DailyMetricsPayload = {
  generatedAt: string
  symbolCount: number
  metrics: Record<string, DailyMetric>
}

type FundamentalMetric = {
  ticker: string
  name: string
  market: Exclude<Market, 'ALL'>
  price: number
  marketCapRaw: number
  listedShares: number
  per: number
  pbr: number
  eps: number
  bps: number
  volume: number
  tradingValue: number
  roe: number
}

const sectors: Sector[] = [
  { id: 'Semiconductor', label: '반도체', scores: { '1m': 88, '3m': 84, '1y': 71 }, return3m: 12.4, turnoverBoost: 1.9 },
  { id: 'Shipbuilding', label: '조선', scores: { '1m': 73, '3m': 76, '1y': 82 }, return3m: 8.1, turnoverBoost: 1.6 },
  { id: 'Finance', label: '금융', scores: { '1m': 61, '3m': 65, '1y': 74 }, return3m: 4.6, turnoverBoost: 1.2 },
  { id: 'Bio', label: '바이오', scores: { '1m': 66, '3m': 58, '1y': 49 }, return3m: 2.8, turnoverBoost: 1.4 },
  { id: 'Battery', label: '2차전지', scores: { '1m': 48, '3m': 51, '1y': 43 }, return3m: -3.2, turnoverBoost: 0.9 },
  { id: 'Auto', label: '자동차', scores: { '1m': 70, '3m': 68, '1y': 72 }, return3m: 5.9, turnoverBoost: 1.3 },
  { id: 'Materials', label: '소재/화학', scores: { '1m': 57, '3m': 59, '1y': 55 }, return3m: 2.4, turnoverBoost: 1.1 },
  { id: 'Industrial', label: '산업재', scores: { '1m': 64, '3m': 67, '1y': 70 }, return3m: 4.9, turnoverBoost: 1.4 },
  { id: 'Consumer', label: '소비/콘텐츠', scores: { '1m': 62, '3m': 60, '1y': 57 }, return3m: 3.2, turnoverBoost: 1.2 },
  { id: 'Other', label: '기타', scores: { '1m': 54, '3m': 55, '1y': 52 }, return3m: 1.8, turnoverBoost: 1.0 },
]

const initialIndicators: Indicator[] = [
  { id: 'macroBoard', group: 'global', label: '매크로 보드', isChecked: false },
  { id: 'hotTrendRanking', group: 'global', label: '트렌드 랭킹', isChecked: true },
  { id: 'smartMoneyRanking', group: 'global', label: '스마트 머니 랭킹', isChecked: true },
  { id: 'etfTop10', group: 'global', label: 'KRX 지수 Top 10', isChecked: true },
  { id: 'marketThermometer', group: 'global', label: '시장 온도계', isChecked: true },
  { id: 'sectorRadar', group: 'global', label: '섹터별 랭킹', isChecked: true },
  { id: 'hiddenGemMatrix', group: 'global', label: '스마트 머니 매트릭스', isChecked: true },
  { id: 'stockSummary', group: 'stock', label: '종목 정보', isChecked: true },
  { id: 'accountLink', group: 'stock', label: '계좌 현황', isChecked: true },
  { id: 'valuationBand', group: 'stock', label: '가치 평가 밴드', isChecked: true },
  { id: 'mdd', group: 'stock', label: 'MDD', isChecked: true },
  { id: 'liveFeed', group: 'stock', label: '실시간 피드', isChecked: true },
  { id: 'reasonCards', group: 'stock', label: '종목 분석 지표', isChecked: true },
]

const initialWidgetLayout: WidgetLayoutItem[] = [
  { id: 'stockSummary', order: 0, span: 4 },
  { id: 'accountLink', order: 1, span: 4 },
  { id: 'etfTop10', order: 2, span: 4 },
  { id: 'hotTrendRanking', order: 3, span: 4 },
  { id: 'hiddenGemMatrix', order: 4, span: 8 },
  { id: 'marketThermometer', order: 5, span: 4 },
  { id: 'sectorRadar', order: 6, span: 4 },
  { id: 'valuationBand', order: 7, span: 4 },
  { id: 'smartMoneyRanking', order: 8, span: 4 },
  { id: 'mdd', order: 9, span: 4 },
  { id: 'liveFeed', order: 10, span: 4 },
  { id: 'reasonCards', order: 11, span: 4 },
  { id: 'macroBoard', order: 12, span: 12 },
  { id: 'discoveryTrend', order: 13, span: 12 },
]

const marketOptions: Array<{ value: Market; label: string; detail: string }> = [
  { value: 'ALL', label: 'KOSPI + KOSDAQ', detail: '전체 시장' },
  { value: 'KOSPI', label: 'KOSPI', detail: '유가증권시장' },
  { value: 'KOSDAQ', label: 'KOSDAQ', detail: '코스닥시장' },
]

const macroData = [
  { label: 'USD/KRW', value: '1,361.40', change: '+0.18%' },
  { label: 'KOSPI', value: '2,742.18', change: '+0.62%' },
  { label: 'KOSDAQ', value: '872.44', change: '+0.41%' },
  { label: 'NASDAQ', value: '16,340.87', change: '+0.27%' },
  { label: 'S&P 500', value: '5,128.22', change: '+0.19%' },
  { label: 'DOW', value: '38,921.33', change: '-0.08%' },
]

const marketMood = [
  { label: 'VIX', key: 'vix', value: 17.2, min: 10, max: 35, avg: 19.5, unit: '' },
  { label: 'Fear & Greed', key: 'fearGreed', value: 64, min: 0, max: 100, avg: 50, unit: '' },
  { label: 'Market breadth', key: 'breadth', value: 58, min: 0, max: 100, avg: 50, unit: '%' },
]

const accountMock = {
  cash: '8,420,000원',
  totalValue: '42,760,000원',
  pnl: '+6.8%',
  holdings: {
    '005930': { qty: 18, avgPrice: '77,200원', pnl: '+6.7%' },
    '095340': { qty: 42, avgPrice: '68,100원', pnl: '+7.3%' },
    '086790': { qty: 55, avgPrice: '57,400원', pnl: '+4.1%' },
  } as Record<string, { qty: number; avgPrice: string; pnl: string }>,
}

const feedTemplates: Record<string, string[]> = {
  Semiconductor: ['AI 서버 수요 확대로 후공정 장비 수주 기대', '주요 반도체 ETF 리밸런싱에서 편입 비중 확대', 'DART: 단일판매 공급계약 체결 공시'],
  Shipbuilding: ['LNG선 발주 사이클 지속 전망', '수주 잔고 증가로 실적 가시성 개선', 'DART: 투자판단 관련 주요경영사항'],
  Finance: ['배당 매력과 저PBR 정책 기대 동시 부각', '순이자마진 안정화에 따른 이익 방어', 'DART: 현금배당 결정'],
  Bio: ['신약 파이프라인 임상 데이터 업데이트', '수출 품목 허가 기대감 반영', 'DART: 기업설명회 개최'],
  Battery: ['원재료 가격 안정화에도 수요 회복은 지연', '북미 증설 속도 조절 관련 뉴스', 'DART: 시설투자 정정공시'],
  Auto: ['자동차 밸류체인 실적 개선 기대', '환율과 수출 물량 흐름 동시 점검', 'DART: 생산설비 투자 공시'],
  Materials: ['소재 가격 안정과 수요 회복 여부 점검', '에너지화학/철강 지수 내 상대 강도 확인', 'DART: 주요 원재료 계약 공시'],
  Industrial: ['산업재 수주 사이클과 설비 투자 확대 기대', '운송/기계장비 지수 편입 종목 관심 증가', 'DART: 단일판매 공급계약 공시'],
  Consumer: ['소비재와 콘텐츠 업종 단기 관심도 변화', '방송통신/커뮤니케이션 지수 편입 흐름 확인', 'DART: 실적 전망 정정 공시'],
  Other: ['복수 KRX 지수 편입 종목의 수급 방어력 점검', '시가총액과 등락률 기반 파생 점수 확인', 'DART: 정기보고서 제출'],
}

const sectorById = Object.fromEntries(sectors.map((sector) => [sector.id, sector]))
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value))
const avg = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)
const EOK_TO_MILLION_KRW = 100

function normalizeSearchText(value: string) {
  return value.trim().normalize('NFC').replace(/\s+/g, '').toLowerCase()
}

function parseCsvLine(line: string) {
  const cells: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]
    if (char === '"' && quoted && next === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }

  cells.push(current)
  return cells.map((cell) => cell.trim().replace(/^\uFEFF/, '').normalize('NFC'))
}

function numericCell(value?: string) {
  return Number(value?.replace(/,/g, '')) || 0
}

function inferSector(indexNames: string[]) {
  const joined = indexNames.join(' ')
  if (/반도체|정보기술/.test(joined)) return 'Semiconductor'
  if (/헬스케어|바이오/.test(joined)) return 'Bio'
  if (/은행|보험|증권|금융|밸류업/.test(joined)) return 'Finance'
  if (/자동차/.test(joined)) return 'Auto'
  if (/소재|에너지화학|철강/.test(joined)) return 'Materials'
  if (/기계장비|산업재|건설|운송/.test(joined)) return 'Industrial'
  if (/소비재|콘텐츠|방송통신|커뮤니케이션/.test(joined)) return 'Consumer'
  return 'Other'
}

function inferMarket(ticker: string, indexNames: string[]): Exclude<Market, 'ALL'> {
  const joined = indexNames.join(' ')
  if (/코스닥|KOSDAQ/i.test(joined)) return 'KOSDAQ'
  const code = Number(ticker)
  return code >= 90000 && code < 300000 ? 'KOSDAQ' : 'KOSPI'
}

function formatMarketCap(raw?: number) {
  if (!raw) return '-'
  const trillion = raw / 1_000_000
  if (trillion >= 1) return `${trillion.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}조`
  return `${Math.round(raw / EOK_TO_MILLION_KRW).toLocaleString('ko-KR')}억`
}

function buildFundamentalsFromCsv(csv: string): Record<string, FundamentalMetric> {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean)
  const [headerLine, ...rows] = lines
  const headers = parseCsvLine(headerLine)
  const columnIndex = Object.fromEntries(headers.map((header, index) => [header, index]))
  const fundamentals: Record<string, FundamentalMetric> = {}

  rows.forEach((line) => {
    const cells = parseCsvLine(line)
    const ticker = cells[columnIndex['symbol']]?.replace(/\D/g, '').padStart(6, '0')
    const name = cells[columnIndex['name']]
    const market = cells[columnIndex['market']] === 'KOSDAQ' ? 'KOSDAQ' : 'KOSPI'
    if (!ticker || !name) return

    const eps = numericCell(cells[columnIndex['eps']])
    const bps = numericCell(cells[columnIndex['bps']])
    fundamentals[ticker] = {
      ticker,
      name,
      market,
      price: numericCell(cells[columnIndex['price']]),
      marketCapRaw: numericCell(cells[columnIndex['market_cap']]) * EOK_TO_MILLION_KRW,
      listedShares: numericCell(cells[columnIndex['listed_shares']]),
      per: numericCell(cells[columnIndex['per']]),
      pbr: numericCell(cells[columnIndex['pbr']]),
      eps,
      bps,
      volume: numericCell(cells[columnIndex['volume']]),
      tradingValue: numericCell(cells[columnIndex['trading_value']]),
      roe: bps ? (eps / bps) * 100 : 0,
    }
  })

  return fundamentals
}

function buildStocksFromCsv(
  csv: string,
  dailyMetrics: Record<string, DailyMetric> = {},
  fundamentals: Record<string, FundamentalMetric> = {},
): Stock[] {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean)
  const [headerLine, ...rows] = lines
  const headers = parseCsvLine(headerLine)
  const columnIndex = Object.fromEntries(headers.map((header, index) => [header, index]))
  const grouped = new Map<string, {
    ticker: string
    name: string
    lastPrice: number
    priceChange: number
    changeRate: number
    marketCapRaw: number
    indexNames: Set<string>
  }>()

  rows.forEach((line) => {
    const cells = parseCsvLine(line)
    const ticker = cells[columnIndex['종목코드']]?.replace(/\D/g, '').padStart(6, '0')
    const name = cells[columnIndex['종목명']]
    const indexName = cells[columnIndex['지수명']]
    if (!ticker || !name || !indexName) return

    const current = grouped.get(ticker) ?? {
      ticker,
      name,
      lastPrice: numericCell(cells[columnIndex['종가']]),
      priceChange: numericCell(cells[columnIndex['대비']]),
      changeRate: numericCell(cells[columnIndex['등락률']]),
      marketCapRaw: numericCell(cells[columnIndex['상장시가총액']]),
      indexNames: new Set<string>(),
    }
    current.indexNames.add(indexName)
    grouped.set(ticker, current)
  })

  return [...grouped.values()]
    .map((item) => {
      const indexNames = [...item.indexNames]
      const daily = dailyMetrics[item.ticker]
      const fundamental = fundamentals[item.ticker]
      const hits = indexNames.length
      const currentChangeRate = daily?.dailyChangeRate ?? item.changeRate
      const absChange = Math.abs(currentChangeRate)
      const sector = inferSector(indexNames)
      const marketCapRaw = fundamental?.marketCapRaw || item.marketCapRaw
      const per = fundamental?.per ?? 0
      const pbr = fundamental?.pbr ?? 0
      const roe = fundamental?.roe ?? 0
      const mdd = daily?.mdd ?? -clamp(6 + absChange * 1.4 + (hits < 3 ? 7 : 0), 5, 42)
      const volatility = daily?.volatility ?? clamp(14 + absChange * 1.15 + Math.max(0, 10 - hits) * 0.7, 10, 50)
      const return3m = daily?.return3m ?? currentChangeRate * 1.8 + hits * 0.35 - 4
      const volumeGap = daily?.tradeValueRatio ?? 1

      return {
        ticker: item.ticker,
        name: fundamental?.name || item.name,
        sector,
        market: daily?.market ?? fundamental?.market ?? inferMarket(item.ticker, indexNames),
        latestDate: daily?.latestDate,
        lastPrice: fundamental?.price || daily?.close || item.lastPrice,
        priceChange: daily?.priceChange ?? item.priceChange,
        changeRate: currentChangeRate,
        marketCapRaw,
        latestVolume: fundamental?.volume || daily?.volume,
        tradingValue: fundamental?.tradingValue || daily?.tradingValue,
        indexNames,
        sortino6mRaw: daily?.sortino6m,
        tradeValueRatioRaw: daily?.tradeValueRatio,
        sixMonthReturn: daily?.sixMonthReturn,
        eps: fundamental?.eps,
        bps: fundamental?.bps,
        per,
        pbr,
        roe,
        mdd,
        volatility,
        drawdownDays: daily?.drawdownDays ?? Math.round(clamp(8 + Math.abs(mdd) * 0.9, 5, 60)),
        etfHits: hits,
        etfWeight: clamp(marketCapRaw / 1_000_000, 0.1, 25),
        turnover: daily ? daily.avgTradingValue20 / 100_000_000 : (fundamental?.tradingValue ?? 0) / 100_000_000,
        volumeGap,
        return3m,
        news: Math.round(clamp(hits * 2 + absChange, 1, 60)),
        priceHeat: clamp(50 + item.changeRate * 2 + hits, 0, 100),
      }
    })
    .sort((a, b) => b.etfHits - a.etfHits || (b.marketCapRaw ?? 0) - (a.marketCapRaw ?? 0))
}

function normalizeMap<T extends { ticker: string }>(items: T[], accessor: (item: T) => number) {
  const values = items.map(accessor)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const denom = max - min || 1
  return new Map(items.map((item) => [item.ticker, (accessor(item) - min) / denom]))
}

function normalizeValues(values: number[]) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const denom = max - min || 1
  return values.map((value) => (value - min) / denom)
}

function quantile(values: number[], q: number) {
  const sorted = [...values].sort((a, b) => a - b)
  if (!sorted.length) return 0
  const position = (sorted.length - 1) * q
  const base = Math.floor(position)
  const rest = position - base
  return sorted[base + 1] === undefined ? sorted[base] : sorted[base] + rest * (sorted[base + 1] - sorted[base])
}

function formatValue(value: number, unit: string) {
  if (unit === 'x') return `${value.toFixed(1)}x`
  if (unit === '%') return `${value.toFixed(1)}%`
  if (unit === 'money') return `${Math.round(value)}억`
  if (unit === 'count') return `${Math.round(value)}`
  if (unit === '원') return `${Math.round(value).toLocaleString()}원`
  return value.toFixed(1)
}

function getProfile(stock: Stock): Profile {
  const price = stock.lastPrice ?? 0
  return {
    price: price ? `${Math.round(price).toLocaleString('ko-KR')}원` : '-',
    change: `${(stock.changeRate ?? 0) >= 0 ? '+' : ''}${(stock.changeRate ?? 0).toFixed(2)}%`,
    marketCap: formatMarketCap(stock.marketCapRaw),
    volume: stock.latestVolume !== undefined ? `${Math.round(stock.latestVolume).toLocaleString('ko-KR')}주` : `${Math.round(stock.turnover).toLocaleString('ko-KR')}억`,
    eps: stock.eps !== undefined ? `${Math.round(stock.eps).toLocaleString('ko-KR')}` : '-',
  }
}

function enrichStocks(sourceStocks: Stock[], period: Period): EnrichedStock[] {
  const raw = sourceStocks.map((stock) => {
    const sectorScore = sectorById[stock.sector].scores[period]
    const krxIndexHits = Math.min(34, stock.indexNames?.length ?? Math.round(stock.etfHits * 3 + stock.etfWeight * 0.7 + sectorScore / 18))
    const sixMonthReturn = Math.max(0, stock.sixMonthReturn ?? stock.return3m * 1.55)
    const downsideDeviation = Math.max(0.8, stock.volatility / 18 + Math.abs(stock.mdd) / 28)
    const sortino6m = stock.sortino6mRaw ?? (sixMonthReturn <= 0 ? 0 : sixMonthReturn / (downsideDeviation + 1e-6))
    const tradeValueRatio = stock.tradeValueRatioRaw ?? stock.volumeGap
    const fundamentalTrendScore =
      (stock.mdd > -18 ? 1 : 0) +
      (stock.roe > 8 ? 1 : 0) +
      (stock.return3m > 0 ? 1 : 0) +
      (stock.per > 0 && stock.per < 25 && stock.pbr > 0 && stock.pbr < 3 ? 1 : 0)
    const mddInverse = 1 / (Math.abs(stock.mdd) + 1)
    return { ...stock, sectorScore, krxIndexHits, sortino6m, tradeValueRatio, fundamentalTrendScore, mddInverse }
  })

  const krxNorm = normalizeMap(raw, (stock) => stock.krxIndexHits)
  const sortinoNorm = normalizeMap(raw, (stock) => stock.sortino6m)
  const tradeNorm = normalizeMap(raw, (stock) => stock.tradeValueRatio)
  const fundamentalNorm = normalizeMap(raw, (stock) => stock.fundamentalTrendScore)
  const mddNorm = normalizeMap(raw, (stock) => stock.mddInverse)

  return raw.map((stock) => {
    const ticker = stock.ticker
    const total =
      (krxNorm.get(ticker) ?? 0) * 0.2 +
      (sortinoNorm.get(ticker) ?? 0) * 0.2 +
      (tradeNorm.get(ticker) ?? 0) * 0.2 +
      (fundamentalNorm.get(ticker) ?? 0) * 0.3 +
      (mddNorm.get(ticker) ?? 0) * 0.1
    const intrinsic = avg([krxNorm.get(ticker) ?? 0, sortinoNorm.get(ticker) ?? 0])
    return {
      ...stock,
      krxNorm: krxNorm.get(ticker) ?? 0,
      sortinoNorm: sortinoNorm.get(ticker) ?? 0,
      tradeNorm: tradeNorm.get(ticker) ?? 0,
      fundamentalNorm: fundamentalNorm.get(ticker) ?? 0,
      mddNorm: mddNorm.get(ticker) ?? 0,
      totalScore: total * 100,
      intrinsicScore: intrinsic * 100,
      marketAttentionScore: (tradeNorm.get(ticker) ?? 0) * 100,
      flowScore: (tradeNorm.get(ticker) ?? 0) * 100,
      riskScore: (mddNorm.get(ticker) ?? 0) * 100,
    }
  })
}

function sortCandidates(candidates: EnrichedStock[], rankMode: RankMode) {
  const key = rankMode === 'krx' ? 'krxNorm' : rankMode === 'sortino' ? 'sortinoNorm' : rankMode === 'trade' ? 'tradeNorm' : 'totalScore'
  return [...candidates].sort((a, b) => b[key] - a[key])
}

function hotTrendSectors(enriched: EnrichedStock[]) {
  const grouped = sectors.map((sector) => {
    const members = enriched.filter((stock) => stock.sector === sector.id)
    return {
      ...sector,
      supplyMomentum: avg(members.map((stock) => stock.volumeGap)),
      priceMomentum: avg(members.map((stock) => stock.return3m)),
    }
  })
  const supply = normalizeValues(grouped.map((sector) => sector.supplyMomentum))
  const price = normalizeValues(grouped.map((sector) => sector.priceMomentum))
  return grouped
    .map((sector, index) => ({ ...sector, hotTrendScore: (supply[index] * 0.5 + price[index] * 0.5) * 100 }))
    .sort((a, b) => b.hotTrendScore - a.hotTrendScore)
}

function LinearGauge({
  label,
  value,
  min,
  max,
  average,
  unit,
  goodHigh = false,
  sectorAverage,
}: {
  label: string
  value: number
  min: number
  max: number
  average: number
  unit: string
  goodHigh?: boolean
  sectorAverage?: number
}) {
  const denom = max - min || 1
  const marker = clamp(((value - min) / denom) * 100)
  const averagePoint = clamp(((average - min) / denom) * 100)
  const sectorPoint = sectorAverage === undefined ? 0 : clamp(((sectorAverage - min) / denom) * 100)
  return (
    <div className="gauge-block">
      <div className="gauge-title">
        <span>{label}</span>
        <span>{formatValue(value, unit)}</span>
      </div>
      <div className={`gauge-track ${goodHigh ? 'good-high' : ''}`}>
        <span className="gauge-average" style={{ left: `${averagePoint}%` }} />
        {sectorAverage !== undefined && (
          <span className="gauge-sector" style={{ left: `${sectorPoint}%` }}>
            ▼ 업종 {formatValue(sectorAverage, unit)}
          </span>
        )}
        <span className="gauge-marker" style={{ left: `${marker}%` }}>
          {formatValue(value, unit)}
        </span>
      </div>
      <div className="gauge-labels">
        <span>{formatValue(min, unit)}</span>
        <span>avg {formatValue(average, unit)}</span>
        <span>{formatValue(max, unit)}</span>
      </div>
    </div>
  )
}

function percentileRow(label: string, values: number[], now: number, unit: string, good: (now: number, p50: number) => boolean) {
  const p25 = quantile(values, 0.25)
  const p50 = quantile(values, 0.5)
  const p75 = quantile(values, 0.75)
  return { label, p25, p50, p75, now, unit, good: good(now, p50) }
}

function Maximize2(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" {...props}>
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" x2="14" y1="3" y2="10" />
      <line x1="3" x2="10" y1="21" y2="14" />
    </svg>
  )
}

function Minimize2(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" {...props}>
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <line x1="14" x2="21" y1="10" y2="3" />
      <line x1="3" x2="10" y1="21" y2="14" />
    </svg>
  )
}

function SquareMousePointer(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" {...props}>
      <rect height="14" rx="2" width="14" x="3" y="3" />
      <path d="m12 12 7 3-3 1 3 3-2 2-3-3-1 3z" />
    </svg>
  )
}

function SquareX(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" {...props}>
      <rect height="18" rx="2" width="18" x="3" y="3" />
      <path d="m9 9 6 6" />
      <path d="m15 9-6 6" />
    </svg>
  )
}

function PickVestLogo() {
  return (
    <svg aria-hidden="true" className="pv-logo" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="pvLogoGradient" x1="8" x2="56" y1="8" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#08b8f4" />
          <stop offset="0.52" stopColor="#2563eb" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect className="pv-logo-frame" x="8" y="8" width="48" height="48" rx="13" />
      <path className="pv-logo-mark" d="M21 45V27.8c0-8 5.3-13.2 13.4-13.2 7.4 0 12.4 4.5 12.4 11.1 0 6.9-5.4 11.7-13 11.7h-4.5v7.6" />
      <path className="pv-logo-mark" d="M34.7 35.8 41 46.2c1.2 2 4.1 1.8 5-.4L56 20" />
    </svg>
  )
}

function App() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [themeSwitching, setThemeSwitching] = useState(false)
  const [selectedTicker, setSelectedTicker] = useState('005930')
  const [searchValue, setSearchValue] = useState('삼성전자')
  const [searchPressed, setSearchPressed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1)
  const [activeMarketIndex, setActiveMarketIndex] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [period, setPeriod] = useState<Period>('3m')
  const [market, setMarket] = useState<Market>('ALL')
  const [sector, setSector] = useState('ALL')
  const [rankMode, setRankMode] = useState<RankMode>('total')
  const [highlightedSector, setHighlightedSector] = useState<string | null>(null)
  const [openSelect, setOpenSelect] = useState<SelectControl | null>(null)
  const [resetPressed, setResetPressed] = useState(false)
  const [indicators, setIndicators] = useState(initialIndicators)
  const [widgetLayout, setWidgetLayout] = useState(initialWidgetLayout)
  const [csvStocks, setCsvStocks] = useState<Stock[]>([])
  const searchOptionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const marketOptionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const isDraggingWidgetRef = useRef(false)
  const dragAutoScrollFrameRef = useRef<number | null>(null)
  const dragPointRef = useRef({ x: 0, y: 0 })

  const stopDragAutoScroll = () => {
    isDraggingWidgetRef.current = false
    if (dragAutoScrollFrameRef.current === null) return
    window.cancelAnimationFrame(dragAutoScrollFrameRef.current)
    dragAutoScrollFrameRef.current = null
  }

  useEffect(() => {
    const getScrollSpeed = (position: number, start: number, end: number) => {
      const threshold = Math.min(96, Math.max(48, (end - start) / 3))
      const maxSpeed = 18
      const topEdge = start + threshold
      const bottomEdge = end - threshold
      if (position < topEdge) return -Math.ceil(((topEdge - position) / threshold) * maxSpeed)
      if (position > bottomEdge) return Math.ceil(((position - bottomEdge) / threshold) * maxSpeed)
      return 0
    }

    const findScrollableParent = (element: Element | null) => {
      let current = element instanceof HTMLElement ? element : null
      while (current && current !== document.body) {
        const style = window.getComputedStyle(current)
        const canScroll = /(auto|scroll|overlay)/.test(style.overflowY)
        if (canScroll && current.scrollHeight > current.clientHeight) return current
        current = current.parentElement
      }
      return null
    }

    const runAutoScroll = () => {
      if (!isDraggingWidgetRef.current) {
        dragAutoScrollFrameRef.current = null
        return
      }

      const { x, y } = dragPointRef.current
      const scrollParent = findScrollableParent(document.elementFromPoint(x, y))
      if (scrollParent) {
        const rect = scrollParent.getBoundingClientRect()
        const speed = getScrollSpeed(y, rect.top, rect.bottom)
        if (speed !== 0) scrollParent.scrollBy({ top: speed })
      } else {
        const speed = getScrollSpeed(y, 0, window.innerHeight)
        if (speed !== 0) window.scrollBy({ top: speed })
      }

      dragAutoScrollFrameRef.current = window.requestAnimationFrame(runAutoScroll)
    }

    const handleWindowDragOver = (event: globalThis.DragEvent) => {
      if (!isDraggingWidgetRef.current) return
      dragPointRef.current = { x: event.clientX, y: event.clientY }
      if (dragAutoScrollFrameRef.current === null) {
        dragAutoScrollFrameRef.current = window.requestAnimationFrame(runAutoScroll)
      }
    }

    window.addEventListener('dragover', handleWindowDragOver)
    window.addEventListener('drop', stopDragAutoScroll)
    window.addEventListener('dragend', stopDragAutoScroll)

    return () => {
      window.removeEventListener('dragover', handleWindowDragOver)
      window.removeEventListener('drop', stopDragAutoScroll)
      window.removeEventListener('dragend', stopDragAutoScroll)
      stopDragAutoScroll()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/merge_df_중복제거.csv').then((response) => {
        if (!response.ok) throw new Error(`CSV load failed: ${response.status}`)
        return response.text()
      }),
      fetch('/krx_fundamentals_latest.csv').then((response) => {
        if (!response.ok) throw new Error(`Fundamentals load failed: ${response.status}`)
        return response.text()
      }),
      fetch('/processed_daily_metrics.json').then((response) => {
        if (!response.ok) throw new Error(`Daily metrics load failed: ${response.status}`)
        return response.json() as Promise<DailyMetricsPayload>
      }).catch(() => null),
    ])
      .then(([indexText, fundamentalsText, daily]) => {
        const parsed = buildStocksFromCsv(indexText, daily?.metrics ?? {}, buildFundamentalsFromCsv(fundamentalsText))
        if (cancelled) return
        if (!parsed.length) return
        setCsvStocks(parsed)
        setSelectedTicker(parsed[0].ticker)
        setSearchValue(parsed[0].name)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const stocks = csvStocks
  const enriched = useMemo(() => enrichStocks(stocks, period), [period, stocks])
  const candidates = useMemo(
    () => enriched.filter((stock) => (market === 'ALL' || stock.market === market) && (sector === 'ALL' || stock.sector === sector)),
    [enriched, market, sector],
  )
  const sorted = useMemo(() => sortCandidates(candidates, rankMode), [candidates, rankMode])
  const hotSectors = useMemo(() => hotTrendSectors(enriched), [enriched])
  const marketLabel = marketOptions.find((option) => option.value === market)?.label ?? market
  const marketLatestDate = useMemo(() => {
    const dates = enriched
      .filter((stock) => market === 'ALL' || stock.market === market)
      .map((stock) => stock.latestDate)
      .filter((date): date is string => Boolean(date))
      .sort()
    return dates.at(-1)?.replace(/-/g, '.') ?? '데이터 없음'
  }, [enriched, market])
  const indexTopHoldings = useMemo(() => {
    const top = [...candidates]
      .sort((a, b) => (b.marketCapRaw ?? 0) - (a.marketCapRaw ?? 0))
      .slice(0, 10)
    const totalMarketCap = top.reduce((sum, stock) => sum + (stock.marketCapRaw ?? 0), 0) || 1
    return top.map((stock) => ({
      name: stock.name,
      weight: ((stock.marketCapRaw ?? 0) / totalMarketCap) * 100,
    }))
  }, [candidates])
  const maxEtfWeight = Math.max(...indexTopHoldings.map((item) => item.weight), 1)
  const selected = enriched.find((stock) => stock.ticker === selectedTicker) ?? sorted[0] ?? enriched[0]
  const searchMatches = useMemo(() => {
    const normalized = normalizeSearchText(searchValue)
    if (!normalized) return []
    return stocks
      .filter((stock) => {
        const name = normalizeSearchText(stock.name)
        const shortName = normalizeSearchText(stock.name.replace(/보통주$/, ''))
        const ticker = normalizeSearchText(stock.ticker)
        return name.includes(normalized) || shortName.includes(normalized) || ticker.includes(normalized)
      })
      .slice(0, 40)
  }, [searchValue, stocks])

  useEffect(() => {
    if (!searchOpen || activeSearchIndex < 0) return
    searchOptionRefs.current[activeSearchIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeSearchIndex, searchOpen])

  useEffect(() => {
    if (openSelect !== 'market') return
    marketOptionRefs.current[activeMarketIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeMarketIndex, openSelect])

  const visibleWidgets = new Set(indicators.filter((indicator) => indicator.isChecked).map((indicator) => indicator.id))
  const isVisible = (id: WidgetId) => visibleWidgets.has(id)
  const selectStock = (ticker: string) => {
    const stock = enriched.find((item) => item.ticker === ticker)
    if (!stock) return
    setSelectedTicker(ticker)
    setSearchValue(stock.name)
  }
  const findExactStockByQuery = (query: string) => {
    const normalized = query.trim()
    if (!normalized) return undefined
    const compact = normalizeSearchText(normalized)
    return stocks.find((stock) => (
      normalizeSearchText(stock.name) === compact ||
      normalizeSearchText(stock.name.replace(/보통주$/, '')) === compact ||
      normalizeSearchText(stock.ticker) === compact
    ))
  }
  const activateSearchFeedback = () => {
    setSearchPressed(true)
    window.setTimeout(() => setSearchPressed(false), 90)
  }
  const runSearch = (query = searchValue) => {
    activateSearchFeedback()
    const activeMatch = searchOpen && activeSearchIndex >= 0 ? searchMatches[activeSearchIndex] : undefined
    const match = activeMatch ?? findExactStockByQuery(query) ?? (searchMatches.length === 1 ? searchMatches[0] : undefined)
    if (!match) return
    selectStock(match.ticker)
    setSearchOpen(false)
    setActiveSearchIndex(-1)
  }
  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    setSearchOpen(Boolean(value.trim()))
    setActiveSearchIndex(-1)
  }
  const chooseSearchMatch = (ticker: string) => {
    selectStock(ticker)
    setSearchOpen(false)
    setActiveSearchIndex(-1)
  }
  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      if (!searchMatches.length) return
      event.preventDefault()
      setSearchOpen(true)
      setActiveSearchIndex((index) => Math.min(index + 1, searchMatches.length - 1))
      return
    }
    if (event.key === 'ArrowUp') {
      if (!searchMatches.length) return
      event.preventDefault()
      setSearchOpen(true)
      setActiveSearchIndex((index) => Math.max(index - 1, 0))
      return
    }
    if (event.key === 'Escape') {
      setSearchOpen(false)
      setActiveSearchIndex(-1)
      return
    }
    if (event.key !== 'Enter') return
    event.preventDefault()
    runSearch(event.currentTarget.value)
  }
  const openMarketDropdown = () => {
    setActiveMarketIndex(Math.max(0, marketOptions.findIndex((option) => option.value === market)))
    setOpenSelect('market')
  }
  const chooseMarket = (value: Market) => {
    setMarket(value)
    setOpenSelect(null)
  }
  const handleMarketKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (openSelect !== 'market') {
        openMarketDropdown()
        return
      }
      setActiveMarketIndex((index) => Math.min(index + 1, marketOptions.length - 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (openSelect !== 'market') {
        openMarketDropdown()
        return
      }
      setActiveMarketIndex((index) => Math.max(index - 1, 0))
      return
    }
    if (event.key === 'Escape') {
      setOpenSelect(null)
      return
    }
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (openSelect !== 'market') {
      openMarketDropdown()
      return
    }
    chooseMarket(marketOptions[activeMarketIndex]?.value ?? market)
  }
  const selectHotSector = (sectorId: string) => {
    setSector(sectorId)
    setHighlightedSector(null)
  }
  const setIndicatorVisible = (id: WidgetId, isChecked: boolean) => {
    setIndicators((items) => items.map((item) => (item.id === id ? { ...item, isChecked } : item)))
  }
  const toggleIndicator = (id: WidgetId) => {
    setIndicators((items) => items.map((item) => (item.id === id ? { ...item, isChecked: !item.isChecked } : item)))
  }
  const placeWidgetAtEnd = (draggedId: WidgetId) => {
    setWidgetLayout((items) => {
      const maxOrder = Math.max(...items.filter((item) => item.id !== draggedId).map((item) => item.order), 0)
      return items.map((item) => (item.id === draggedId ? { ...item, order: maxOrder + 1 } : item))
    })
  }
  const swapWidgetOrder = (draggedId: WidgetId, targetId: WidgetId) => {
    setWidgetLayout((items) => {
      const dragged = items.find((item) => item.id === draggedId)
      const target = items.find((item) => item.id === targetId)
      if (!dragged || !target) return items
      return items.map((item) => {
        if (item.id === draggedId) return { ...item, order: target.order }
        if (item.id === targetId) return { ...item, order: dragged.order }
        return item
      })
    })
  }
  const resizeWidget = (id: WidgetId) => {
    const sizes: WidgetLayoutItem['span'][] = [4, 6, 8, 12]
    setWidgetLayout((items) => items.map((item) => {
      if (item.id !== id) return item
      const nextSpan = sizes[(sizes.indexOf(item.span) + 1) % sizes.length]
      return { ...item, span: nextSpan }
    }))
  }
  const handleDragStart = (event: DragEvent<HTMLElement>, id: WidgetId, source: 'palette' | 'canvas') => {
    isDraggingWidgetRef.current = true
    dragPointRef.current = { x: event.clientX, y: event.clientY }
    event.dataTransfer.setData('application/x-pickvest-widget', JSON.stringify({ id, source }))
    event.dataTransfer.effectAllowed = source === 'palette' ? 'copy' : 'move'
  }
  const handleDropToCanvas = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    stopDragAutoScroll()
    const payload = JSON.parse(event.dataTransfer.getData('application/x-pickvest-widget') || '{}') as { id?: WidgetId }
    if (!payload.id) return
    setIndicatorVisible(payload.id, true)
    placeWidgetAtEnd(payload.id)
  }
  const handleDropOnWidget = (event: DragEvent<HTMLElement>, targetId: WidgetId) => {
    event.preventDefault()
    event.stopPropagation()
    stopDragAutoScroll()
    const payload = JSON.parse(event.dataTransfer.getData('application/x-pickvest-widget') || '{}') as { id?: WidgetId }
    if (!payload.id || payload.id === targetId) return
    setIndicatorVisible(payload.id, true)
    swapWidgetOrder(payload.id, targetId)
  }
  const handleDropToSidebar = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    stopDragAutoScroll()
    const payload = JSON.parse(event.dataTransfer.getData('application/x-pickvest-widget') || '{}') as { id?: WidgetId; source?: string }
    if (payload.id && payload.source === 'canvas') setIndicatorVisible(payload.id, false)
  }
  const resetDashboard = () => {
    setPeriod('3m')
    setMarket('ALL')
    setSector('ALL')
    setRankMode('total')
    setSelectedTicker(stocks[0]?.ticker ?? '005930')
    setSearchValue(stocks[0]?.name ?? '삼성전자')
    setIndicators(initialIndicators)
    setWidgetLayout(initialWidgetLayout)
  }
  const toggleSelectArrow = (id: SelectControl) => {
    if (id === 'market') setActiveMarketIndex(Math.max(0, marketOptions.findIndex((option) => option.value === market)))
    setOpenSelect((current) => (current === id ? null : id))
  }
  const handleResetDashboard = () => {
    setResetPressed(true)
    resetDashboard()
    window.setTimeout(() => setResetPressed(false), 140)
  }
  const toggleTheme = () => {
    setThemeSwitching(true)
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
    window.setTimeout(() => setThemeSwitching(false), 120)
  }

  const WidgetTools = ({ id }: { id: WidgetId }) => {
    const span = widgetLayout.find((item) => item.id === id)?.span ?? 4
    const spanLabel = span === 4 ? '1/3' : span === 6 ? '1/2' : span === 8 ? '2/3' : 'Full'

    return (
      <div className="widget-tools">
        <span
          className="widget-handle"
          draggable
          onDragEnd={stopDragAutoScroll}
          onDragStart={(event) => handleDragStart(event, id, 'canvas')}
          title="사이드바로 드래그하면 숨김"
        >
          <SquareMousePointer aria-hidden="true" />
        </span>
        <button
          aria-label={`위젯 폭 변경, 현재 ${spanLabel}`}
          className="widget-remove widget-resize"
          type="button"
          onClick={() => resizeWidget(id)}
          title={`위젯 폭 변경 (${spanLabel})`}
        >
          {span === 12 ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
        </button>
        <button
          aria-label="위젯 숨기기"
          className="widget-remove widget-remove-action"
          type="button"
          onClick={() => setIndicatorVisible(id, false)}
          title="위젯 숨기기"
        >
          <SquareX aria-hidden="true" />
        </button>
      </div>
    )
  }

  const widgetGridProps = (id: WidgetId): {
    draggable: boolean
    onDragStart: (event: DragEvent<HTMLElement>) => void
    onDragEnd: () => void
    onDragOver: (event: DragEvent<HTMLElement>) => void
    onDrop: (event: DragEvent<HTMLElement>) => void
    style: CSSProperties
  } => {
    const layout = widgetLayout.find((item) => item.id === id) ?? initialWidgetLayout.find((item) => item.id === id)
    return {
      draggable: id === 'macroBoard',
      onDragStart: (event) => handleDragStart(event, id, 'canvas'),
      onDragEnd: stopDragAutoScroll,
      onDragOver: (event) => event.preventDefault(),
      onDrop: (event) => handleDropOnWidget(event, id),
      style: {
        order: layout?.order ?? 999,
        gridColumn: `span ${layout?.span ?? 4}`,
      },
    }
  }

  const indicatorControls = (group: WidgetGroup) =>
    indicators
      .filter((indicator) => indicator.group === group)
      .map((indicator) => (
        <div
          className={`widget-drag ${indicator.isChecked ? 'is-active' : 'is-hidden'}`}
          draggable
          data-indicator={indicator.id}
          key={indicator.id}
          onDoubleClick={() => toggleIndicator(indicator.id)}
          onDragEnd={stopDragAutoScroll}
          onDragStart={(event) => handleDragStart(event, indicator.id, 'palette')}
          title="대시보드로 드래그해서 추가, 더블클릭으로 토글"
        >
          <input
            checked={indicator.isChecked}
            onChange={(event) => setIndicatorVisible(indicator.id, event.target.checked)}
            aria-label={`${indicator.label} 표시`}
            type="checkbox"
          />
          <span>{indicator.label}</span>
          <small>{indicator.isChecked ? 'ON' : 'OFF'}</small>
        </div>
      ))

  if (!selected) {
    return (
      <div className="pickvest-app loading-app" data-theme={theme}>
        <main className="main loading-main">
          <section className="content">
            <div className="card pad">
              <h2>Pick-Vest 데이터를 불러오는 중입니다</h2>
              <p className="caption">KRX 지수 CSV와 krx_fundamentals_latest.csv를 연결하고 있습니다.</p>
            </div>
          </section>
        </main>
      </div>
    )
  }

  const selectedProfile = getProfile(selected)
  const peers = enriched.filter((stock) => stock.sector === selected.sector)
  const epsOf = (stock: Stock) => Number(String(getProfile(stock).eps).replace(/,/g, ''))
  const metricGauge = (label: string, value: number, values: number[], unit: string, goodHigh = false) => {
    const historyAvg = value * (label === 'ROE' || label === 'EPS' ? 0.92 : 1.06)
    const sectorAverage = avg(values)
    const min = Math.min(...values, value, historyAvg, sectorAverage) * 0.92
    const max = Math.max(...values, value, historyAvg, sectorAverage) * 1.08
    return <LinearGauge average={historyAvg} goodHigh={goodHigh} key={label} label={label} max={max} min={min} sectorAverage={sectorAverage} unit={unit} value={value} />
  }

  const flowRows = [
    percentileRow('KRX hits', enriched.map((stock) => stock.krxIndexHits), selected.krxIndexHits, 'count', (now, p50) => now >= p50),
    percentileRow('Sortino 6M', enriched.map((stock) => stock.sortino6m), selected.sortino6m, 'x', (now, p50) => now >= p50),
    percentileRow('5D/20D trade', enriched.map((stock) => stock.tradeValueRatio), selected.tradeValueRatio, 'x', (now, p50) => now >= p50),
  ]
  const reasons = [
    [`KRX 지수`, selected.krxNorm >= 0.65 ? '강함' : '보통'],
    [selected.sortino6m > 0 ? `소르티노 지수` : '6개월 수익률 음수', selected.sortinoNorm >= 0.65 ? '좋음' : '주의'],
    [`거래대금`, selected.tradeNorm >= 0.6 ? '관심 증가' : '평균 수준'],
    [`펀더멘털/추세`, selected.fundamentalTrendScore >= 3 ? '탄탄함' : '확인 필요'],
    [selected.riskScore >= 60 ? 'MDD / 변동성' : 'MDD / 변동성', selected.riskScore >= 60 ? '안정' : '주의'],
  ]
  const holding = accountMock.holdings[selected.ticker]
  const matrixStocks = sorted.slice(0, 20)
  const matrixData = matrixStocks.length ? matrixStocks : [selected]
  const matrixXValues = matrixData.map((stock) => stock.marketAttentionScore)
  const matrixYValues = matrixData.map((stock) => stock.intrinsicScore)
  const matrixXMin = Math.floor(Math.min(...matrixXValues) - 10)
  const matrixXMax = Math.ceil(Math.max(...matrixXValues) + 10)
  const matrixYMin = Math.floor(Math.min(...matrixYValues) - 10)
  const matrixYMax = Math.ceil(Math.max(...matrixYValues) + 10)
  const matrixXRange = matrixXMax - matrixXMin || 1
  const matrixYRange = matrixYMax - matrixYMin || 1
  const matrixXMidValue = (matrixXMin + matrixXMax) / 2
  const matrixYMidValue = (matrixYMin + matrixYMax) / 2
  const matrixSpan = widgetLayout.find((item) => item.id === 'hiddenGemMatrix')?.span ?? 8
  const matrixWidth = matrixSpan === 12 ? 920 : matrixSpan === 8 ? 760 : matrixSpan === 6 ? 620 : 520
  const matrixHeight = matrixSpan === 12 ? 390 : matrixSpan === 8 ? 340 : matrixSpan === 6 ? 315 : 290
  const matrixPlot = {
    left: matrixSpan === 4 ? 72 : 78,
    top: 38,
    right: matrixWidth - 30,
    bottom: matrixHeight - 56,
  }
  const matrixScaleX = (value: number) => matrixPlot.left + ((value - matrixXMin) / matrixXRange) * (matrixPlot.right - matrixPlot.left)
  const matrixScaleY = (value: number) => matrixPlot.bottom - ((value - matrixYMin) / matrixYRange) * (matrixPlot.bottom - matrixPlot.top)
  const matrixMidX = matrixScaleX(matrixXMidValue)
  const matrixMidY = matrixScaleY(matrixYMidValue)
  const matrixLabelLimit = matrixSpan === 12 ? 13 : matrixSpan === 8 ? 10 : matrixSpan === 6 ? 7 : 5
  const matrixFontSize = matrixSpan === 12 ? 12 : matrixSpan === 8 ? 11 : 10
  const matrixRadiusScale = matrixSpan >= 8 ? 8.8 : 7.4

  return (
    <div className={`pickvest-app ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${themeSwitching ? 'theme-switching' : ''}`} data-theme={theme}>
      <aside className="sidebar" aria-expanded={!sidebarCollapsed} aria-label="대시보드 사이드바" onDragOver={(event) => event.preventDefault()} onDrop={handleDropToSidebar}>
        <div className="brand">
          <span className="brand-name">Pick-Vest</span>
          <button
            aria-label={sidebarCollapsed ? '사이드바 열기' : '사이드바 닫기'}
            className="sidebar-toggle"
            type="button"
            onClick={() => setSidebarCollapsed((value) => !value)}
            title={sidebarCollapsed ? '사이드바 열기' : '사이드바 닫기'}
          >
            {sidebarCollapsed ? '›' : '‹'}
          </button>
        </div>
        <div className="search">
          <div className="search-box">
            <span className="search-icon">⌕</span>
            <input
              aria-activedescendant={activeSearchIndex >= 0 && searchMatches[activeSearchIndex] ? `search-option-${searchMatches[activeSearchIndex].ticker}` : undefined}
              aria-autocomplete="list"
              aria-label="종목 검색"
              aria-expanded={searchOpen && searchMatches.length > 0}
              aria-controls="stockOptions"
              onChange={(event) => handleSearchChange(event.target.value)}
              onBlur={() => {
                window.setTimeout(() => {
                  setSearchOpen(false)
                  setActiveSearchIndex(-1)
                }, 80)
              }}
              onFocus={(event) => {
                event.currentTarget.select()
                setSearchOpen(Boolean(event.currentTarget.value.trim()))
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="종목명/티커 검색"
              role="combobox"
              value={searchValue}
            />
            {searchOpen && searchMatches.length > 0 && (
              <div className="search-results" id="stockOptions" role="listbox">
                {searchMatches.map((stock, index) => (
                  <button
                    aria-selected={index === activeSearchIndex}
                    className={`search-result ${index === activeSearchIndex ? 'is-active' : ''}`}
                    id={`search-option-${stock.ticker}`}
                    key={stock.ticker}
                    ref={(node) => {
                      searchOptionRefs.current[index] = node
                    }}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      chooseSearchMatch(stock.ticker)
                    }}
                    onMouseEnter={() => setActiveSearchIndex(index)}
                    role="option"
                    type="button"
                  >
                    <span>{stock.name}</span>
                    <small>{stock.ticker}</small>
                  </button>
                ))}
              </div>
            )}
            <button className={`kbd ${searchPressed ? 'is-pressed' : ''}`} type="button" onClick={() => runSearch()}>
              검색
            </button>
          </div>
        </div>

        <section className="indicator-panel" aria-label="위젯 선택">
          <p className="nav-title">Global Widgets</p>
          <div className="widget-palette">{indicatorControls('global')}</div>
          <p className="nav-title">Stock Widgets</p>
          <div className="widget-palette">{indicatorControls('stock')}</div>
        </section>
      </aside>

      <main className="main">
        <header className="top-nav">
          <div className="workspace">
            <PickVestLogo />
            <span className="accent">Pick-Vest</span>
            <span className="divider" />
            <span>내 손으로 만드는 나만의 대시보드</span>
          </div>
          <div className="top-actions" aria-label="상단 액션">
            <button className="icon-button theme-toggle" type="button" onClick={toggleTheme}>
              {theme === 'dark' ? 'Dark' : 'Light'}
            </button>
          </div>
        </header>

        <section className="content" id="home" aria-label="투자 대시보드">
          <div className="page-title">
            <div>
              <h1>{selected?.name ?? 'Pick-Vest'}</h1>
              <p>{selected?.ticker ?? '내 손으로 만드는 나만의 대시보드'}</p>
            </div>
            <form className="title-controls" id="dashboard" onSubmit={(event) => event.preventDefault()}>
              <div
                className={`control select-control market-control ${openSelect === 'market' ? 'is-open' : ''}`}
                onBlur={() => window.setTimeout(() => setOpenSelect(null), 80)}
              >
                <span>Market  |</span>
                <button
                  aria-activedescendant={openSelect === 'market' ? `market-option-${marketOptions[activeMarketIndex]?.value}` : undefined}
                  aria-expanded={openSelect === 'market'}
                  aria-controls="marketOptions"
                  aria-haspopup="listbox"
                  className="market-trigger"
                  type="button"
                  onClick={() => toggleSelectArrow('market')}
                  onKeyDown={handleMarketKeyDown}
                >
                  {marketLabel}
                </button>
                {openSelect === 'market' && (
                  <div className="search-results market-results" id="marketOptions" role="listbox">
                    {marketOptions.map((option, index) => (
                      <button
                        aria-selected={index === activeMarketIndex}
                        className={`search-result market-result ${index === activeMarketIndex ? 'is-active' : ''}`}
                        id={`market-option-${option.value}`}
                        key={option.value}
                        ref={(node) => {
                          marketOptionRefs.current[index] = node
                        }}
                        onMouseDown={(event) => {
                          event.preventDefault()
                          chooseMarket(option.value)
                        }}
                        onMouseEnter={() => setActiveMarketIndex(index)}
                        role="option"
                        type="button"
                      >
                        <span>{option.label}</span>
                        <small>{option.detail}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <label className="control wide"><span>Date  | {marketLabel} · {marketLatestDate}</span></label>
              <button className={`control reset-control ${resetPressed ? 'is-resetting' : ''}`} type="button" onClick={handleResetDashboard}>Reset</button>
            </form>
          </div>
{/*
          <section className="drop-zone" aria-label="위젯 드롭 영역" onDragOver={(event) => event.preventDefault()} onDrop={handleDropToCanvas}>
            <div>
              <strong>Grid layout builder</strong>
              <span>위젯을 카드 위로 끌어 순서를 바꾸고 크기 아이콘으로 폭을 조절합니다.</span>
            </div>
          </section>
*/}

          <section className="layout-board" aria-label="격자 기반 위젯 배치 영역" onDragOver={(event) => event.preventDefault()} onDrop={handleDropToCanvas}>
          {isVisible('macroBoard') && (
            <section className="macro-strip widget" data-widget="macroBoard" aria-label="매크로 보드" {...widgetGridProps('macroBoard')}>
              {macroData.map((item) => (
                <div className="macro-item" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small className={item.change.startsWith('-') ? 'negative' : 'positive'}>{item.change}</small>
                </div>
              ))}
            </section>
          )}

          <div className="grid grid-3">
            {isVisible('hotTrendRanking') && (
              <article className="card pad widget" {...widgetGridProps('hotTrendRanking')}>
                <div className="card-head">
                  <div>
                    <h2>트렌드 랭킹</h2>
                    <p className="caption">수급 모멘텀과 가격 모멘텀 기준 Top 5 섹터</p>
                  </div>
                {/* 
                 <span className="score-pill">{sectorLabel} Top {Math.min(candidates.length, 20)}</span> 
                 */}
                  <WidgetTools id="hotTrendRanking" />
                </div>
                <div className="big-number"><span>{candidates.length}</span> <small>stocks screened</small></div>
               {/*
                <div className="mini-line" aria-label="핫 트렌드 섹터 산식">
                  <span className="mini-chip">수급 모멘텀 50%</span>
                  <span className="mini-chip">가격 모멘텀 50%</span>
                  <span className="mini-chip">5D/20D 거래대금</span>
                  <span className="mini-chip">최근 수익률</span>
                </div>
            */}
                <div className="bar-list">
                  {hotSectors.slice(0, 5).map((item) => (
                    <div className="bar-row" key={item.id}>
                      <button
                        className={`bar-track clickable ${item.id === sector ? 'active' : ''} ${item.id === highlightedSector ? 'is-highlighted' : ''}`}
                        type="button"
                        onClick={() => selectHotSector(item.id)}
                      >
                        <span style={{ width: `${clamp(item.hotTrendScore, 24, 100)}%` }}>{item.label}</span>
                      </button>
                      <strong>{item.hotTrendScore.toFixed(0)}</strong>
                    </div>
                  ))}
                </div>
              </article>
            )}

            {isVisible('smartMoneyRanking') && (
              <article className="card pad widget" id="money" {...widgetGridProps('smartMoneyRanking')}>
                <div className="card-head">
                  <div>
                    <h2>스마트 머니 랭킹</h2>
                    <p className="caption">KRX 지수 편입, 소르티노, 거래대금, 펀더멘털 종합 점수</p>
                  </div>
                  <WidgetTools id="smartMoneyRanking" />
                </div>
                <div className="big-number"><span>{avg(candidates.map((stock) => stock.totalScore)).toFixed(1)}</span> <small>avg score</small></div>
                <table className="table" aria-label="스마트 머니 테이블">
                  <thead><tr><th>Stock</th><th>KRX 편입현황</th><th>Total</th></tr></thead>
                  <tbody>
                    {sorted.slice(0, 5).map((stock) => (
                      <tr key={stock.ticker} className={stock.ticker === selected.ticker ? 'active' : ''} onClick={() => selectStock(stock.ticker)}>
                        <td>{stock.name}</td><td>{stock.krxIndexHits}</td><td>{stock.totalScore.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>
            )}

            {isVisible('marketThermometer') && (
              <article className="card pad widget" {...widgetGridProps('marketThermometer')}>
                <div className="card-head">
                  <div>
                    <h2>시장 온도계</h2>
                    <p className="caption">VIX와 공포-탐욕 지수 가로형 온도계</p>
                  </div>
                  <WidgetTools id="marketThermometer" />
                </div>
                <div className="big-number"><span>{Math.round(avg(marketMood.map((item) => item.value)))}</span> <small>market heat</small></div>
                <div className="gauge-stack">
                  {marketMood.map((item) => (
                    <LinearGauge average={item.avg} goodHigh={item.key !== 'vix'} key={item.key} label={item.label} max={item.max} min={item.min} unit={item.unit} value={item.value} />
                  ))}
                </div>
              </article>
            )}
          </div>

          <div className="grid grid-3 wide-row">
            {isVisible('sectorRadar') && (
              <article className="card pad widget" id="sector" {...widgetGridProps('sectorRadar')}>
                <div className="card-head">
                  <div>
                    <h2>섹터별 랭킹</h2>
                    <p className="caption">최근 수익률, 거래대금 증가, 상대강도 합산</p>
                  </div>
                  <WidgetTools id="sectorRadar" />
                </div>
                <div className="sector-bars">
                  {[...sectors].sort((a, b) => b.scores[period] - a.scores[period]).map((item) => (
                    <div className="sector-line" key={item.id}>
                      <span>{item.label}</span>
                      <div className="sector-meter"><span style={{ width: `${item.scores[period]}%` }} /></div>
                      <span>{item.scores[period]}</span>
                    </div>
                  ))}
                </div>
              </article>
            )}

            {isVisible('hiddenGemMatrix') && (
              <article className="card pad widget" id="matrix" {...widgetGridProps('hiddenGemMatrix')}>
                <div className="card-head">
                  <div>
                    <h2>스마트 머니 매트릭스</h2>
                    <p className="caption">
                      자체 AI 알고리즘으로 숨은 유망 종목을 찾아주는 4분면 분석 차트
                    </p>
                  </div>
                  <WidgetTools id="hiddenGemMatrix" />
                </div>
                <div className="matrix-wrap" style={{ minHeight: matrixHeight }}>
                  <svg
                    viewBox={`0 0 ${matrixWidth} ${matrixHeight}`}
                    role="img"
                    aria-label="Smart Money Matrix"
                    style={{ aspectRatio: `${matrixWidth} / ${matrixHeight}`, minHeight: matrixHeight }}
                  >
                    <defs>
                      <marker id="matrixArrow" markerHeight="7" markerWidth="7" orient="auto" refX="5" refY="3.5">
                        <path d="M0 0 7 3.5 0 7z" fill="var(--matrix-axis)" />
                      </marker>
                      <radialGradient cx="42%" cy="30%" id="matrixGlow" r="70%">
                        <stop offset="0%" stopColor="var(--matrix-glow-core)" />
                        <stop offset="62%" stopColor="var(--matrix-glow-mid)" />
                        <stop offset="100%" stopColor="var(--matrix-glow-edge)" />
                      </radialGradient>
                    </defs>
                    <rect className="matrix-bg" height={matrixHeight - 6} rx="10" width={matrixWidth - 6} x="3" y="3" />
                    <rect className="matrix-glow" height={matrixHeight - 6} rx="10" width={matrixWidth - 6} x="3" y="3" />
                    <rect
                      className="matrix-hidden-zone"
                      height={matrixMidY - matrixPlot.top}
                      rx="10"
                      width={matrixMidX - matrixPlot.left}
                      x={matrixPlot.left}
                      y={matrixPlot.top}
                    />
                    <line className="matrix-axis" markerEnd="url(#matrixArrow)" x1={matrixPlot.left} x2={matrixPlot.left} y1={matrixPlot.bottom} y2={matrixPlot.top - 8} />
                    <line className="matrix-axis" markerEnd="url(#matrixArrow)" x1={matrixPlot.left - 8} x2={matrixPlot.right + 8} y1={matrixPlot.bottom} y2={matrixPlot.bottom} />
                    <line className="matrix-cross" x1={matrixMidX} y1={matrixPlot.top} x2={matrixMidX} y2={matrixPlot.bottom} />
                    <line className="matrix-cross" x1={matrixPlot.left} y1={matrixMidY} x2={matrixPlot.right} y2={matrixMidY} />
                    <text className="matrix-zone-title zone-hidden" x={matrixPlot.left + 32} y={matrixPlot.top + 28}>숨은 후보</text>
                    <text className="matrix-zone-copy" x={matrixPlot.left + 32} y={matrixPlot.top + 50}>
                      <tspan x={matrixPlot.left + 32}>매력도는 높지만</tspan>
                      <tspan dy="17" x={matrixPlot.left + 32}>아직 시장의 관심이 낮은 종목</tspan>
                    </text>
                    <text className="matrix-zone-title zone-popular" textAnchor="end" x={matrixPlot.right - 22} y={matrixPlot.top + 28}>이미 주목받는 우량주</text>
                    <text className="matrix-zone-copy" textAnchor="end" x={matrixPlot.right - 22} y={matrixPlot.top + 50}>시장 관심도와 매력도 모두 높은 종목</text>
                    <text className="matrix-zone-title zone-ignore" x={matrixPlot.left + 32} y={matrixPlot.bottom - 44}>관심 제외</text>
                    <text className="matrix-zone-copy" x={matrixPlot.left + 32} y={matrixPlot.bottom - 22}>매력도와 관심도 모두 낮은 종목</text>
                    <text className="matrix-zone-title zone-caution" textAnchor="end" x={matrixPlot.right - 22} y={matrixPlot.bottom - 44}>과열 주의</text>
                    <text className="matrix-zone-copy" textAnchor="end" x={matrixPlot.right - 22} y={matrixPlot.bottom - 22}>관심은 높지만 매력도가 낮은 종목</text>
                    <text className="matrix-axis-label" textAnchor="middle" x={(matrixPlot.left + matrixPlot.right) / 2} y={matrixHeight - 15}>시장 관심도</text>
                    <text className="matrix-axis-label" textAnchor="middle" x={matrixMidX} y={matrixPlot.bottom + 22}>{Math.round(matrixXMidValue)}</text>
                    <text className="matrix-axis-label matrix-y-midpoint" textAnchor="end" x={matrixPlot.left - 10} y={matrixMidY + 4}>{Math.round(matrixYMidValue)}</text>
                    <text className="matrix-axis-end" x={matrixPlot.left - 30} y={matrixPlot.bottom + 22}>낮음</text>
                    <text className="matrix-axis-end" textAnchor="end" x={matrixPlot.right + 8} y={matrixPlot.bottom + 22}>높음</text>
                    <text className="matrix-axis-end" x={matrixPlot.left - 30} y={matrixPlot.top + 4}>높음</text>
                    <text className="matrix-y-label" textAnchor="middle" x={matrixPlot.left - 46} y={matrixMidY - 5}>
                      <tspan x={matrixPlot.left - 46}>투자</tspan>
                      <tspan dy="18" x={matrixPlot.left - 46}>매력도</tspan>
                    </text>
                    {matrixData.map((stock, index) => {
                      const x = matrixScaleX(stock.marketAttentionScore)
                      const y = matrixScaleY(stock.intrinsicScore)
                      const isSelected = stock.ticker === selected.ticker
                      const radius = (isSelected ? 7 : 3.5) + (stock.totalScore / 100) * matrixRadiusScale
                      const zone =
                        stock.marketAttentionScore < matrixXMidValue && stock.intrinsicScore >= matrixYMidValue
                          ? 'hidden'
                          : stock.marketAttentionScore >= matrixXMidValue && stock.intrinsicScore >= matrixYMidValue
                            ? 'popular'
                            : stock.marketAttentionScore >= matrixXMidValue
                              ? 'caution'
                              : 'ignore'
                      const labelDx = x > matrixPlot.right - 70 ? -7 : 7
                      const labelAnchor = x > matrixPlot.right - 70 ? 'end' : 'start'
                      const labelDy = index % 3 === 0 ? -8 : index % 3 === 1 ? 11 : 1
                      const showLabel = index < matrixLabelLimit || stock.ticker === selected.ticker
                      return (
                        <g className={`matrix-point zone-${zone}`} key={stock.ticker} onClick={() => selectStock(stock.ticker)}>
                          <title>{`${stock.name} · 관심도 ${stock.marketAttentionScore.toFixed(0)} · 매력도 ${stock.intrinsicScore.toFixed(0)} · Total ${stock.totalScore.toFixed(0)}`}</title>
                          {isSelected && <circle className="matrix-halo" cx={x} cy={y} r={radius + 12} />}
                          <circle className={`matrix-dot ${isSelected ? 'active' : ''}`} cx={x} cy={y} r={radius} />
                          {showLabel && (
                            <text
                              className="matrix-label"
                              x={x + labelDx}
                              y={y + labelDy}
                              fontSize={matrixFontSize}
                              textAnchor={labelAnchor}
                            >
                              {stock.name.length > 7 ? `${stock.name.slice(0, 7)}…` : stock.name}
                            </text>
                          )}
                        </g>
                      )
                    })}
                  </svg>
                </div>
              </article>
            )}

            {isVisible('etfTop10') && (
              <article className="card pad widget" {...widgetGridProps('etfTop10')}>
                <div className="card-head">
                  <div>
                    <h2>Market Top 10</h2>
                    <p className="caption">CSV 시가총액 기준 현재 유니버스 상위 종목</p>
                  </div>
                  <WidgetTools id="etfTop10" />
                </div>
                <div className="etf-stack">
                  {indexTopHoldings.map((item) => (
                    <div className="etf-row" key={item.name}>
                      <span>{item.name}</span>
                      <div className="sector-meter"><span style={{ width: `${clamp((item.weight / maxEtfWeight) * 100, 6, 100)}%` }} /></div>
                      <span>{item.weight.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </article>
            )}

            {isVisible('valuationBand') && (
              <article className="card pad widget" id="valuation" {...widgetGridProps('valuationBand')}>
                <div className="card-head">
                  <div>
                    <h2>가치평가 밴드</h2>
                    <p className="caption">{selected.name} · {sectorById[selected.sector].label} 섹터 내 상대 위치</p>
                  </div>
                  <WidgetTools id="valuationBand" />
                </div>
                <div className="gauge-stack">
                  {metricGauge('PER', selected.per, peers.map((stock) => stock.per), 'x')}
                  {metricGauge('PBR', selected.pbr, peers.map((stock) => stock.pbr), 'x')}
                  {metricGauge('ROE', selected.roe, peers.map((stock) => stock.roe), '%', true)}
                  {metricGauge('EPS', epsOf(selected), peers.map((stock) => epsOf(stock)), '원', true)}
                </div>
              </article>
            )}
          </div>

          <div className="grid grid-3 wide-row">
            {isVisible('stockSummary') && (
              <article className="card pad widget" {...widgetGridProps('stockSummary')}>
                <div className="card-head">
                  <div>
                    <h2>종목 정보</h2>
                    <p className="caption">{selected.ticker} · {selected.market} · {sectorById[selected.sector].label}</p>
                  </div>
                  <WidgetTools id="stockSummary" />
                </div>
                <div className="stock-summary">
                  <div className="summary-main">
                    <div>
                      <p className="caption">{selected.name}</p>
                      <strong>{selectedProfile.price}</strong>
                      <span className={selectedProfile.change.startsWith('-') ? 'negative' : 'positive'}>{selectedProfile.change}</span>
                    </div>
                  </div>
                  <div className="stat-grid">
                    <div className="stat-box"><span>시가총액</span><strong>{selectedProfile.marketCap}</strong></div>
                    <div className="stat-box"><span>거래량</span><strong>{selectedProfile.volume}</strong></div>
                    <div className="stat-box"><span>EPS</span><strong>{selectedProfile.eps}</strong></div>
                    <div className="stat-box"><span>KRX 편입현황</span><strong>34개 지수 중 {selected.krxIndexHits}개</strong></div>
                  </div>
                </div>
              </article>
            )}

            {isVisible('accountLink') && (
              <article className="card pad widget" {...widgetGridProps('accountLink')}>
                <div className="card-head">
                  <div>
                    <h2>계좌 현황</h2>
                    <p className="caption">목업 계좌 잔액, 보유 종목, 수익률</p>
                  </div>
                  <WidgetTools id="accountLink" />
                </div>
                <div className="stock-summary">
                  <div className="stat-grid">
                    <div className="stat-box"><span>예수금</span><strong>{accountMock.cash}</strong></div>
                    <div className="stat-box"><span>평가금액</span><strong>{accountMock.totalValue}</strong></div>
                    <div className="stat-box"><span>총 수익률</span><strong className="positive">{accountMock.pnl}</strong></div>
                    <div className="stat-box"><span>선택 종목</span><strong>{holding ? `${holding.qty}주` : '미보유'}</strong></div>
                  </div>
                  <div className="mini-line">
                    <span className="mini-chip">평균단가 {holding ? holding.avgPrice : '-'}</span>
                    <span className="mini-chip">종목 수익률 {holding ? holding.pnl : '-'}</span>
                  </div>
                </div>
              </article>
            )}

            {isVisible('mdd') && (
              <article className="card pad widget" id="risk" {...widgetGridProps('mdd')}>
                <div className="card-head">
                  <div>
                    <h2>MDD</h2>
                    <p className="caption">최근 3개월 최대 낙폭과 변동성</p>
                  </div>
                  <WidgetTools id="mdd" />
                </div>
                <div className="big-number"><span>{selected.mdd.toFixed(1)}%</span> <small>max drawdown</small></div>
                <div className="mdd-track"><span className="mdd-fill" style={{ width: `${clamp(Math.abs(selected.mdd) * 2.4, 8, 100)}%` }} /></div>
                <div className="stat-grid mdd-stats">
                  <div className="stat-box"><span>Volatility</span><strong>{selected.volatility.toFixed(1)}%</strong></div>
                  <div className="stat-box"><span>Drawdown days</span><strong>{selected.drawdownDays}</strong></div>
                </div>
              </article>
            )}

            {isVisible('liveFeed') && (
              <article className="card pad widget" {...widgetGridProps('liveFeed')}>
                <div className="card-head">
                  <div>
                    <h2>실시간 피드</h2>
                    <p className="caption">뉴스 및 DART 공시 목업 리스트</p>
                  </div>
                  <WidgetTools id="liveFeed" />
                </div>
                <div className="feed-list">
                  {(feedTemplates[selected.sector] || []).map((title, index) => (
                    <div className="feed-item" key={title}>
                      <strong>{title}</strong>
                      <span>{index === 2 ? 'DART' : 'News'} · 2026.05.{String(4 - index).padStart(2, '0')} · {selected.name}</span>
                    </div>
                  ))}
                </div>
              </article>
            )}
          </div>

          <div className="metric-row">
            {isVisible('flowPercentiles') && (
              <article className="card pad widget" {...widgetGridProps('flowPercentiles')}>
                <div className="card-head">
                  <div>
                    <h2>Flow percentiles</h2>
                    <p className="caption">KRX 지수 편입과 단기 거래대금 증가율</p>
                  </div>
                  <WidgetTools id="flowPercentiles" />
                </div>
                <MetricTable columns={['Signal', 'p25', 'p50', 'p75', 'Now']} rows={flowRows} />
              </article>
            )}
            {isVisible('reasonCards') && (
              <article className="card pad widget" {...widgetGridProps('reasonCards')}>
                <div className="card-head">
                  <div>
                    <h2>종목 분석 지표</h2>
                    <p className="caption">왜 이 종목인지 자동 근거화</p>
                  </div>
                  <WidgetTools id="reasonCards" />
                </div>
                <table className="table">
                  <thead><tr><th>근거</th><th>판단</th></tr></thead>
                  <tbody>{reasons.map(([reason, grade]) => <tr key={reason}><td>{reason}</td><td className={grade === '탄탄함' ? 'reason-strong' : 'positive'}>{grade}</td></tr>)}</tbody>
                </table>
              </article>
            )}
          </div>

{/*
          {isVisible('discoveryTrend') && (
            <article className="card line-card widget" {...widgetGridProps('discoveryTrend')}>
              <div className="card-head">
                <div>
                  <h2>Smart Money Score Trend</h2>
                  <p className="caption">{selected.name} · Total {selected.totalScore.toFixed(0)} / KRX {selected.krxIndexHits}/34 / Trade {selected.tradeValueRatio.toFixed(1)}x</p>
                </div>
                <label className="control">
                  <span>View</span>
                  <select value={trendView} onChange={(event) => setTrendView(event.target.value as TrendView)} aria-label="차트 보기">
                    <option value="all">All signals</option>
                    <option value="total">Total score</option>
                    <option value="sector">Sector heat</option>
                    <option value="attention">Market attention</option>
                  </select>
                </label>
                <WidgetTools id="discoveryTrend" />
              </div>
              <div className="tabs" role="tablist" aria-label="차트 탭">
                {(['total', 'sector', 'flow', 'risk'] as const).map((key) => (
                  <button className={`tab ${trend === key ? 'active' : ''}`} key={key} type="button" onClick={() => { setTrend(key); setTrendView('all') }}>
                    {key === 'total' ? 'Total Score' : key === 'sector' ? 'Sector Heat' : key === 'flow' ? 'Trade Flow' : 'Risk'}
                  </button>
                ))}
              </div>
              <div className="chart" aria-label="샘플 라인 차트">
                <svg viewBox="0 0 1400 360" role="img" aria-labelledby="lineTitle lineDesc">
                  <title id="lineTitle">Smart Money Score Trend</title>
                  <desc id="lineDesc">선택 종목의 KRX 편입, 거래대금, 리스크 점수 추이를 목업 데이터로 렌더링합니다.</desc>
                  {trendKeys.map((key) => (
                    <polyline
                      fill="none"
                      key={key}
                      points={pathPoints(trendSeries[key].values)}
                      stroke={trendSeries[key].color}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={key === trend ? 3.8 : 2.4}
                    />
                  ))}
                </svg>
              </div>
              <div className="legend" aria-label="차트 범례">
                <span className="legend-total"><i className="dot" />Total score</span>
                <span className="legend-sector"><i className="dot" />Sector heat</span>
                <span className="legend-flow"><i className="dot" />Trade flow</span>
                <span className="legend-risk"><i className="dot" />Risk stability</span>
                <span className="legend-attention"><i className="dot" />Market attention</span>
              </div>
            </article>
          )}

          */}
          </section>
        </section>
      </main>
    </div>
  )
}

function MetricTable({ columns, rows }: { columns: string[]; rows: ReturnType<typeof percentileRow>[] }) {
  return (
    <table className="table">
      <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <td>{row.label}</td>
            <td>{formatValue(row.p25, row.unit)}</td>
            <td>{formatValue(row.p50, row.unit)}</td>
            <td>{formatValue(row.p75, row.unit)}</td>
            <td className={row.good ? 'positive' : ''}>{formatValue(row.now, row.unit)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default App
