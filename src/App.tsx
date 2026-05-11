import { useEffect, useMemo, useState, type DragEvent } from 'react'
import './App.css'

type Theme = 'dark' | 'light'
type Period = '1m' | '3m' | '1y'
type Market = 'ALL' | 'KOSPI' | 'KOSDAQ'
type RankMode = 'total' | 'krx' | 'sortino' | 'trade'
type TrendView = 'all' | 'total' | 'sector' | 'flow' | 'risk' | 'attention'
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
  lastPrice?: number
  priceChange?: number
  changeRate?: number
  marketCapRaw?: number
  indexNames?: string[]
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

const fallbackStocks: Stock[] = [
  { ticker: '095340', name: 'ISC', sector: 'Semiconductor', market: 'KOSDAQ', per: 11.2, pbr: 1.1, roe: 14.1, mdd: -9, volatility: 24, drawdownDays: 12, etfHits: 5, etfWeight: 3.8, turnover: 104, volumeGap: 1.9, return3m: 5.6, news: 7, priceHeat: 38 },
  { ticker: '058470', name: '리노공업', sector: 'Semiconductor', market: 'KOSDAQ', per: 18.4, pbr: 2.6, roe: 19.2, mdd: -7, volatility: 21, drawdownDays: 9, etfHits: 4, etfWeight: 2.9, turnover: 82, volumeGap: 1.4, return3m: 7.2, news: 10, priceHeat: 47 },
  { ticker: '067310', name: '하나마이크론', sector: 'Semiconductor', market: 'KOSDAQ', per: 9.7, pbr: 1.5, roe: 11.8, mdd: -14, volatility: 33, drawdownDays: 18, etfHits: 4, etfWeight: 2.5, turnover: 118, volumeGap: 2.1, return3m: 3.8, news: 6, priceHeat: 31 },
  { ticker: '000660', name: 'SK하이닉스', sector: 'Semiconductor', market: 'KOSPI', per: 16.8, pbr: 2.0, roe: 15.5, mdd: -11, volatility: 28, drawdownDays: 14, etfHits: 7, etfWeight: 14.2, turnover: 2480, volumeGap: 1.7, return3m: 15.9, news: 28, priceHeat: 76 },
  { ticker: '005930', name: '삼성전자', sector: 'Semiconductor', market: 'KOSPI', per: 14.8, pbr: 1.3, roe: 10.7, mdd: -10, volatility: 19, drawdownDays: 13, etfHits: 8, etfWeight: 18.4, turnover: 3660, volumeGap: 1.3, return3m: 8.4, news: 42, priceHeat: 82 },
  { ticker: '329180', name: 'HD현대중공업', sector: 'Shipbuilding', market: 'KOSPI', per: 22.6, pbr: 2.1, roe: 8.9, mdd: -13, volatility: 27, drawdownDays: 17, etfHits: 5, etfWeight: 3.6, turnover: 226, volumeGap: 1.8, return3m: 10.4, news: 18, priceHeat: 61 },
  { ticker: '010140', name: '삼성중공업', sector: 'Shipbuilding', market: 'KOSPI', per: 13.9, pbr: 1.7, roe: 7.3, mdd: -16, volatility: 31, drawdownDays: 22, etfHits: 4, etfWeight: 2.2, turnover: 192, volumeGap: 1.5, return3m: 6.5, news: 11, priceHeat: 45 },
  { ticker: '042660', name: '한화오션', sector: 'Shipbuilding', market: 'KOSPI', per: 19.4, pbr: 2.3, roe: 6.8, mdd: -21, volatility: 36, drawdownDays: 29, etfHits: 4, etfWeight: 2.7, turnover: 252, volumeGap: 1.9, return3m: 13.1, news: 21, priceHeat: 68 },
  { ticker: '086790', name: '하나금융지주', sector: 'Finance', market: 'KOSPI', per: 5.1, pbr: 0.42, roe: 9.8, mdd: -8, volatility: 18, drawdownDays: 10, etfHits: 5, etfWeight: 2.8, turnover: 154, volumeGap: 1.1, return3m: 2.8, news: 8, priceHeat: 29 },
  { ticker: '055550', name: '신한지주', sector: 'Finance', market: 'KOSPI', per: 5.8, pbr: 0.48, roe: 8.7, mdd: -9, volatility: 17, drawdownDays: 11, etfHits: 5, etfWeight: 3.1, turnover: 168, volumeGap: 1.0, return3m: 1.6, news: 9, priceHeat: 26 },
  { ticker: '316140', name: '우리금융지주', sector: 'Finance', market: 'KOSPI', per: 4.9, pbr: 0.38, roe: 10.1, mdd: -7, volatility: 16, drawdownDays: 8, etfHits: 4, etfWeight: 2.0, turnover: 96, volumeGap: 1.3, return3m: 4.2, news: 5, priceHeat: 24 },
  { ticker: '068270', name: '셀트리온', sector: 'Bio', market: 'KOSPI', per: 34.5, pbr: 2.4, roe: 6.6, mdd: -18, volatility: 32, drawdownDays: 27, etfHits: 5, etfWeight: 4.2, turnover: 312, volumeGap: 1.5, return3m: 4.4, news: 24, priceHeat: 57 },
  { ticker: '145020', name: '휴젤', sector: 'Bio', market: 'KOSDAQ', per: 19.7, pbr: 1.8, roe: 12.8, mdd: -10, volatility: 25, drawdownDays: 14, etfHits: 3, etfWeight: 1.7, turnover: 64, volumeGap: 1.2, return3m: 1.9, news: 6, priceHeat: 28 },
  { ticker: '237690', name: '에스티팜', sector: 'Bio', market: 'KOSDAQ', per: 27.4, pbr: 2.0, roe: 8.1, mdd: -15, volatility: 35, drawdownDays: 24, etfHits: 2, etfWeight: 1.1, turnover: 52, volumeGap: 1.7, return3m: 0.8, news: 4, priceHeat: 22 },
  { ticker: '373220', name: 'LG에너지솔루션', sector: 'Battery', market: 'KOSPI', per: 41.6, pbr: 3.3, roe: 5.2, mdd: -24, volatility: 34, drawdownDays: 33, etfHits: 6, etfWeight: 5.4, turnover: 488, volumeGap: 0.9, return3m: -4.8, news: 20, priceHeat: 43 },
  { ticker: '247540', name: '에코프로비엠', sector: 'Battery', market: 'KOSDAQ', per: 55.2, pbr: 4.4, roe: 4.8, mdd: -31, volatility: 48, drawdownDays: 42, etfHits: 5, etfWeight: 3.9, turnover: 276, volumeGap: 1.2, return3m: -7.1, news: 18, priceHeat: 48 },
  { ticker: '066970', name: '엘앤에프', sector: 'Battery', market: 'KOSPI', per: 38.9, pbr: 2.9, roe: 3.6, mdd: -28, volatility: 42, drawdownDays: 39, etfHits: 4, etfWeight: 2.6, turnover: 142, volumeGap: 1.0, return3m: -5.6, news: 9, priceHeat: 35 },
]

const initialIndicators: Indicator[] = [
  { id: 'macroBoard', group: 'global', label: 'Macro Board', isChecked: true },
  { id: 'hotTrendRanking', group: 'global', label: 'Hot Trend Ranking', isChecked: true },
  { id: 'smartMoneyRanking', group: 'global', label: 'Smart Money Ranking', isChecked: true },
  { id: 'etfTop10', group: 'global', label: 'KRX Index Top 10', isChecked: true },
  { id: 'marketThermometer', group: 'global', label: 'Market Thermometer', isChecked: true },
  { id: 'sectorRadar', group: 'global', label: 'Sector Radar', isChecked: true },
  { id: 'hiddenGemMatrix', group: 'global', label: 'Smart Money Matrix', isChecked: true },
  { id: 'stockSummary', group: 'stock', label: 'Stock Summary', isChecked: true },
  { id: 'accountLink', group: 'stock', label: 'Account Link View', isChecked: true },
  { id: 'valuationBand', group: 'stock', label: 'Valuation Band', isChecked: true },
  { id: 'mdd', group: 'stock', label: 'MDD / Risk', isChecked: true },
  { id: 'liveFeed', group: 'stock', label: 'Live Feed', isChecked: true },
  { id: 'flowPercentiles', group: 'stock', label: 'Flow Percentiles', isChecked: false },
  { id: 'reasonCards', group: 'stock', label: 'Reason Cards', isChecked: true },
  { id: 'discoveryTrend', group: 'stock', label: 'Smart Money Trend', isChecked: true },
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

const etfTopHoldings = [
  { name: '삼성전자', weight: 18.4 },
  { name: 'SK하이닉스', weight: 14.2 },
  { name: '현대차', weight: 7.8 },
  { name: 'LG에너지솔루션', weight: 5.4 },
  { name: '셀트리온', weight: 4.2 },
  { name: '한화오션', weight: 2.7 },
  { name: '하나금융지주', weight: 2.8 },
  { name: '신한지주', weight: 3.1 },
  { name: 'ISC', weight: 3.8 },
  { name: 'HD현대중공업', weight: 3.6 },
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

const stockProfiles: Record<string, Profile> = {
  '095340': { price: '73,100원', change: '+2.41%', marketCap: '1.3조', volume: '1.04M', eps: '6,527' },
  '058470': { price: '214,500원', change: '+1.12%', marketCap: '3.2조', volume: '0.18M', eps: '11,660' },
  '067310': { price: '23,850원', change: '+3.08%', marketCap: '1.1조', volume: '2.21M', eps: '2,459' },
  '005930': { price: '82,400원', change: '+1.48%', marketCap: '492조', volume: '18.4M', eps: '5,568' },
  '000660': { price: '188,700원', change: '+2.05%', marketCap: '137조', volume: '5.9M', eps: '11,232' },
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
  return cells.map((cell) => cell.trim().normalize('NFC'))
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
  return `${Math.round(raw / 1000).toLocaleString('ko-KR')}억`
}

function buildStocksFromCsv(csv: string): Stock[] {
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
      lastPrice: Number(cells[columnIndex['종가']]) || 0,
      priceChange: Number(cells[columnIndex['대비']]) || 0,
      changeRate: Number(cells[columnIndex['등락률']]) || 0,
      marketCapRaw: Number(cells[columnIndex['상장시가총액']]) || 0,
      indexNames: new Set<string>(),
    }
    current.indexNames.add(indexName)
    grouped.set(ticker, current)
  })

  return [...grouped.values()]
    .map((item) => {
      const indexNames = [...item.indexNames]
      const hits = indexNames.length
      const capLog = Math.log10(Math.max(item.marketCapRaw, 1))
      const absChange = Math.abs(item.changeRate)
      const sector = inferSector(indexNames)
      const per = clamp(7 + (capLog % 13) + Math.max(item.changeRate, 0) * 0.18, 4, 60)
      const pbr = clamp(0.45 + hits * 0.08 + absChange * 0.035, 0.25, 6)
      const roe = clamp(5 + hits * 0.65 + item.changeRate * 0.24, 0.5, 24)
      const mdd = -clamp(6 + absChange * 1.4 + (hits < 3 ? 7 : 0), 5, 42)
      const volatility = clamp(14 + absChange * 1.15 + Math.max(0, 10 - hits) * 0.7, 10, 50)
      const return3m = item.changeRate * 1.8 + hits * 0.35 - 4
      const volumeGap = clamp(1 + item.changeRate / 20 + hits / 80, 0.4, 3)

      return {
        ticker: item.ticker,
        name: item.name,
        sector,
        market: inferMarket(item.ticker, indexNames),
        lastPrice: item.lastPrice,
        priceChange: item.priceChange,
        changeRate: item.changeRate,
        marketCapRaw: item.marketCapRaw,
        indexNames,
        per,
        pbr,
        roe,
        mdd,
        volatility,
        drawdownDays: Math.round(clamp(8 + Math.abs(mdd) * 0.9, 5, 60)),
        etfHits: hits,
        etfWeight: clamp(item.marketCapRaw / 1_000_000, 0.1, 25),
        turnover: Math.max(1, item.marketCapRaw / 100_000),
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
  if (stock.lastPrice !== undefined) {
    return {
      price: `${Math.round(stock.lastPrice).toLocaleString('ko-KR')}원`,
      change: `${(stock.changeRate ?? 0) >= 0 ? '+' : ''}${(stock.changeRate ?? 0).toFixed(2)}%`,
      marketCap: formatMarketCap(stock.marketCapRaw),
      volume: `${Math.round(stock.turnover).toLocaleString('ko-KR')}억`,
      eps: `${Math.round(stock.lastPrice / Math.max(stock.per, 1)).toLocaleString('ko-KR')}`,
    }
  }
  return stockProfiles[stock.ticker] || {
    price: `${Math.round(18000 + stock.turnover * 95).toLocaleString()}원`,
    change: `${stock.return3m >= 0 ? '+' : ''}${(stock.return3m / 4).toFixed(2)}%`,
    marketCap: `${Math.max(0.4, stock.etfWeight * 0.9).toFixed(1)}조`,
    volume: `${stock.volumeGap.toFixed(2)}M`,
    eps: `${Math.round(stock.per ? 24000 / stock.per : 2200).toLocaleString()}`,
  }
}

function enrichStocks(sourceStocks: Stock[], period: Period): EnrichedStock[] {
  const raw = sourceStocks.map((stock) => {
    const sectorScore = sectorById[stock.sector].scores[period]
    const krxIndexHits = Math.min(34, stock.indexNames?.length ?? Math.round(stock.etfHits * 3 + stock.etfWeight * 0.7 + sectorScore / 18))
    const sixMonthReturn = Math.max(0, stock.return3m * 1.55)
    const downsideDeviation = Math.max(0.8, stock.volatility / 18 + Math.abs(stock.mdd) / 28)
    const sortino6m = sixMonthReturn <= 0 ? 0 : sixMonthReturn / (downsideDeviation + 1e-6)
    const tradeValueRatio = stock.volumeGap
    const fundamentalTrendScore =
      (stock.mdd > -18 ? 1 : 0) +
      (stock.roe > 8 ? 1 : 0) +
      (stock.return3m > 0 ? 1 : 0) +
      (stock.per < 25 && stock.pbr < 3 ? 1 : 0)
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

function pathPoints(values: number[]) {
  const width = 1318
  return values
    .map((value, index) => {
      const x = 42 + index * (width / (values.length - 1))
      const y = 318 - value * 2.55
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function buildSeries(base: number, wave: number[], scale = 1) {
  return wave.map((value) => clamp(base + value * scale))
}

function App() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [selectedTicker, setSelectedTicker] = useState('005930')
  const [searchValue, setSearchValue] = useState('삼성전자')
  const [period, setPeriod] = useState<Period>('3m')
  const [market, setMarket] = useState<Market>('ALL')
  const [sector, setSector] = useState('ALL')
  const [rankMode, setRankMode] = useState<RankMode>('total')
  const [trendView, setTrendView] = useState<TrendView>('all')
  const [trend, setTrend] = useState<Exclude<TrendView, 'all'>>('total')
  const [favorites, setFavorites] = useState(() => new Set(['095340']))
  const [indicators, setIndicators] = useState(initialIndicators)
  const [csvStocks, setCsvStocks] = useState<Stock[]>([])
  const [dataStatus, setDataStatus] = useState<'loading' | 'ready' | 'fallback'>('loading')

  useEffect(() => {
    let cancelled = false
    fetch('/merge_df_중복제거.csv')
      .then((response) => {
        if (!response.ok) throw new Error(`CSV load failed: ${response.status}`)
        return response.text()
      })
      .then((text) => {
        const parsed = buildStocksFromCsv(text)
        if (cancelled) return
        if (!parsed.length) {
          setDataStatus('fallback')
          return
        }
        setCsvStocks(parsed)
        setSelectedTicker(parsed[0].ticker)
        setSearchValue(parsed[0].name)
        setDataStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setDataStatus('fallback')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const stocks = csvStocks.length ? csvStocks : fallbackStocks
  const enriched = useMemo(() => enrichStocks(stocks, period), [period, stocks])
  const candidates = useMemo(
    () => enriched.filter((stock) => (market === 'ALL' || stock.market === market) && (sector === 'ALL' || stock.sector === sector)),
    [enriched, market, sector],
  )
  const sorted = useMemo(() => sortCandidates(candidates, rankMode), [candidates, rankMode])
  const selected = enriched.find((stock) => stock.ticker === selectedTicker) ?? sorted[0] ?? enriched[0]
  const hotSectors = useMemo(() => hotTrendSectors(enriched), [enriched])
  const selectedProfile = getProfile(selected)
  const sectorLabel = sector === 'ALL' ? 'All sectors' : sectorById[sector].label
  const visibleWidgets = new Set(indicators.filter((indicator) => indicator.isChecked).map((indicator) => indicator.id))
  const isVisible = (id: WidgetId) => visibleWidgets.has(id)
  const selectStock = (ticker: string) => {
    const stock = enriched.find((item) => item.ticker === ticker)
    if (!stock) return
    setSelectedTicker(ticker)
    setSearchValue(stock.name)
  }
  const setIndicatorVisible = (id: WidgetId, isChecked: boolean) => {
    setIndicators((items) => items.map((item) => (item.id === id ? { ...item, isChecked } : item)))
  }
  const toggleIndicator = (id: WidgetId) => {
    setIndicators((items) => items.map((item) => (item.id === id ? { ...item, isChecked: !item.isChecked } : item)))
  }
  const handleDragStart = (event: DragEvent<HTMLElement>, id: WidgetId, source: 'palette' | 'canvas') => {
    event.dataTransfer.setData('application/x-pickvest-widget', JSON.stringify({ id, source }))
    event.dataTransfer.effectAllowed = source === 'palette' ? 'copy' : 'move'
  }
  const handleDropToCanvas = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    const payload = JSON.parse(event.dataTransfer.getData('application/x-pickvest-widget') || '{}') as { id?: WidgetId }
    if (payload.id) setIndicatorVisible(payload.id, true)
  }
  const handleDropToSidebar = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    const payload = JSON.parse(event.dataTransfer.getData('application/x-pickvest-widget') || '{}') as { id?: WidgetId; source?: string }
    if (payload.id && payload.source === 'canvas') setIndicatorVisible(payload.id, false)
  }
  const resetDashboard = () => {
    setPeriod('3m')
    setMarket('ALL')
    setSector('ALL')
    setRankMode('total')
    setTrendView('all')
    setTrend('total')
    setSelectedTicker(stocks[0]?.ticker ?? '005930')
    setSearchValue(stocks[0]?.name ?? '삼성전자')
    setIndicators(initialIndicators.map((indicator) => ({ ...indicator, isChecked: indicator.id !== 'flowPercentiles' })))
  }

  const WidgetTools = ({ id }: { id: WidgetId }) => (
    <div className="widget-tools">
      <span className="widget-handle" draggable onDragStart={(event) => handleDragStart(event, id, 'canvas')} title="사이드바로 드래그하면 숨김">
        Drag
      </span>
      <button className="widget-remove" type="button" onClick={() => setIndicatorVisible(id, false)}>
        Remove
      </button>
    </div>
  )

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
          onDragStart={(event) => handleDragStart(event, indicator.id, 'palette')}
          title="대시보드로 드래그해서 추가, 더블클릭으로 토글"
        >
          <input
            checked={indicator.isChecked}
            onChange={(event) => setIndicatorVisible(indicator.id, event.target.checked)}
            aria-label={`${indicator.label} 표시`}
            type="checkbox"
          />
          <span>↕</span>
          <span>{indicator.label}</span>
          <small>{indicator.isChecked ? 'ON' : 'OFF'}</small>
        </div>
      ))

  const peers = enriched.filter((stock) => stock.sector === selected.sector)
  const epsOf = (stock: Stock) => Number(String(getProfile(stock).eps).replace(/,/g, ''))
  const metricGauge = (label: string, value: number, values: number[], unit: string, goodHigh = false) => {
    const historyAvg = value * (label === 'ROE' || label === 'EPS' ? 0.92 : 1.06)
    const sectorAverage = avg(values)
    const min = Math.min(...values, value, historyAvg, sectorAverage) * 0.92
    const max = Math.max(...values, value, historyAvg, sectorAverage) * 1.08
    return <LinearGauge average={historyAvg} goodHigh={goodHigh} key={label} label={label} max={max} min={min} sectorAverage={sectorAverage} unit={unit} value={value} />
  }

  const valuationRows = [
    percentileRow('PER', peers.map((stock) => stock.per), selected.per, 'x', (now, p50) => now <= p50),
    percentileRow('PBR', peers.map((stock) => stock.pbr), selected.pbr, 'x', (now, p50) => now <= p50),
    percentileRow('ROE', peers.map((stock) => stock.roe), selected.roe, '%', (now, p50) => now >= p50),
  ]
  const flowRows = [
    percentileRow('KRX hits', enriched.map((stock) => stock.krxIndexHits), selected.krxIndexHits, 'count', (now, p50) => now >= p50),
    percentileRow('Sortino 6M', enriched.map((stock) => stock.sortino6m), selected.sortino6m, 'x', (now, p50) => now >= p50),
    percentileRow('5D/20D trade', enriched.map((stock) => stock.tradeValueRatio), selected.tradeValueRatio, 'x', (now, p50) => now >= p50),
  ]
  const riskRows = [
    percentileRow('MDD', peers.map((stock) => stock.mdd), selected.mdd, '%', (now, p50) => now >= p50),
    percentileRow('Volatility', peers.map((stock) => stock.volatility), selected.volatility, '%', (now, p50) => now <= p50),
    percentileRow('Drawdown days', peers.map((stock) => stock.drawdownDays), selected.drawdownDays, 'count', (now, p50) => now <= p50),
  ]
  const reasons = [
    [`KRX 지수 ${selected.krxIndexHits}/34개에 중복 편입되어 패시브 수급 방어력 확인`, selected.krxNorm >= 0.65 ? 'A' : 'B'],
    [selected.sortino6m > 0 ? `6개월 소르티노 ${selected.sortino6m.toFixed(1)}x로 하방 위험 대비 성과 양호` : '6개월 수익률이 음수라 소르티노는 0점 처리', selected.sortinoNorm >= 0.65 ? 'A-' : 'C+'],
    [`최근 5일/20일 거래대금 비율 ${selected.tradeValueRatio.toFixed(1)}x로 단기 관심도 측정`, selected.tradeNorm >= 0.6 ? 'B+' : 'B'],
    [`펀더멘털/추세 체크 ${selected.fundamentalTrendScore}/4개 충족`, selected.fundamentalTrendScore >= 3 ? 'A' : 'B-'],
    [selected.riskScore >= 60 ? 'MDD 역수 점수가 높아 낙폭 방어력이 양호' : 'MDD와 변동성은 추가 확인 필요', selected.riskScore >= 60 ? 'B+' : 'C+'],
  ]
  const wave = [-8, -2, 6, -3, 10, 3, 14, -5, 9, 1, 13, 8]
  const trendSeries = {
    total: { color: '#06b6d4', values: buildSeries(selected.totalScore, wave, 0.9) },
    sector: { color: '#7c6df0', values: buildSeries(selected.sectorScore, wave, 0.55) },
    flow: { color: '#f59e0b', values: buildSeries(selected.flowScore, wave, 0.5) },
    risk: { color: '#22c55e', values: buildSeries(selected.riskScore, wave, 0.45) },
    attention: { color: '#ef4444', values: buildSeries(selected.marketAttentionScore, wave, 0.65) },
  }
  const trendKeys = trendView === 'all' ? (['total', 'sector', 'flow', 'risk', 'attention'] as const) : ([trendView] as const)
  const holding = accountMock.holdings[selected.ticker]
  const indexTopHoldings = useMemo(() => {
    if (!csvStocks.length) return etfTopHoldings
    const top = [...candidates]
      .sort((a, b) => (b.marketCapRaw ?? 0) - (a.marketCapRaw ?? 0))
      .slice(0, 10)
    const totalMarketCap = top.reduce((sum, stock) => sum + (stock.marketCapRaw ?? 0), 0) || 1
    return top.map((stock) => ({
      name: stock.name,
      weight: ((stock.marketCapRaw ?? 0) / totalMarketCap) * 100,
    }))
  }, [candidates, csvStocks.length])
  const maxEtfWeight = Math.max(...indexTopHoldings.map((item) => item.weight), 1)

  return (
    <div className="pickvest-app" data-theme={theme}>
      <aside className="sidebar" aria-label="대시보드 사이드바" onDragOver={(event) => event.preventDefault()} onDrop={handleDropToSidebar}>
        <div className="brand">Pick-Vest</div>
        <div className="search">
          <div className="search-box">
            <span className="search-icon">⌕</span>
            <input
              aria-label="종목 검색"
              list="stockOptions"
              onChange={(event) => setSearchValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                const match = stocks.find((stock) => stock.name === searchValue || stock.ticker === searchValue)
                if (match) selectStock(match.ticker)
              }}
              placeholder="종목명/티커 검색"
              value={searchValue}
            />
            <datalist id="stockOptions">
              {stocks.map((stock) => (
                <option key={stock.ticker} value={stock.name}>
                  {stock.ticker}
                </option>
              ))}
            </datalist>
            <span className="kbd">Enter</span>
          </div>
        </div>

        <nav className="nav-section" aria-label="주요 메뉴">
          <p className="nav-title">Overview</p>
          <a className="nav-item active" href="#home"><span>⌂</span><span>Home</span></a>
          <a className="nav-item" href="#dashboard"><span>▦</span><span>Dashboards</span></a>
          <p className="nav-title">Discovery</p>
          <a className="nav-item" href="#matrix"><span>◇</span><span>Hidden Finder</span></a>
          <a className="nav-item" href="#sector"><span>↗</span><span>Sector Radar</span></a>
          <a className="nav-item" href="#money"><span>◎</span><span>Smart Money</span></a>
          <p className="nav-title">Signals</p>
          <a className="nav-item" href="#valuation"><span>▤</span><span>Valuation Bands</span></a>
          <a className="nav-item" href="#risk"><span>◷</span><span>Risk Monitor</span></a>
          <a className="nav-item" href="#watch"><span>☆</span><span>Watchlist</span></a>
        </nav>

        <section className="indicator-panel" aria-label="위젯 선택">
          <p className="nav-title">Global Widgets</p>
          <div className="widget-palette">{indicatorControls('global')}</div>
          <p className="nav-title">Stock Widgets</p>
          <div className="widget-palette">{indicatorControls('stock')}</div>
        </section>

        <div className="side-footer">
          <a className="nav-item" href="#settings"><span>*</span><span>Settings</span></a>
          <div className="profile">
            <span className="avatar">J</span>
            <span>JH<small>hidden.stock@pickvest.ai</small></span>
            <span>⌄</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="top-nav">
          <div className="workspace">
            <span>▮</span>
            <span className="accent">Pick-Vest</span>
            <span>⌄</span>
            <span className="divider" />
            <span>Hidden Stock Finder</span>
            <span>⌄</span>
          </div>
          <div className="top-actions" aria-label="상단 액션">
            <button className="icon-button" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <span className="icon-button">?</span>
            <span className="icon-button">●</span>
          </div>
        </header>

        <section className="content" id="home" aria-label="투자 대시보드">
          <div className="page-title">
            <div>
              <h1>Home</h1>
              <p>섹터 흐름에서 출발해 아직 덜 발견된 우량 후보를 좁혀보는 React 대시보드</p>
            </div>
            <span className="score-pill">
              {dataStatus === 'ready' ? `CSV loaded · ${stocks.length.toLocaleString('ko-KR')} stocks` : dataStatus === 'loading' ? 'Loading CSV...' : 'Fallback mock data'}
            </span>
          </div>

          <form className="filter-bar" id="dashboard" onSubmit={(event) => event.preventDefault()}>
            <label className="control wide"><span>Date May 04, 09:00 - May 04, 15:30</span></label>
            <label className="control">
              <span>Period</span>
              <select value={period} onChange={(event) => setPeriod(event.target.value as Period)} aria-label="기간">
                <option value="3m">Past 3 months</option>
                <option value="1m">Past 1 month</option>
                <option value="1y">Past 1 year</option>
              </select>
            </label>
            <label className="control">
              <span>Market</span>
              <select value={market} onChange={(event) => setMarket(event.target.value as Market)} aria-label="시장">
                <option value="ALL">KOSPI + KOSDAQ</option>
                <option value="KOSPI">KOSPI</option>
                <option value="KOSDAQ">KOSDAQ</option>
              </select>
            </label>
            <label className="control">
              <span>Sector</span>
              <select value={sector} onChange={(event) => setSector(event.target.value)} aria-label="섹터">
                <option value="ALL">All sectors</option>
                {sectors.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className="control">
              <span>Rank by</span>
              <select value={rankMode} onChange={(event) => setRankMode(event.target.value as RankMode)} aria-label="랭킹 기준">
                <option value="total">Total Score</option>
                <option value="krx">KRX Index</option>
                <option value="sortino">Sortino</option>
                <option value="trade">Trade Flow</option>
              </select>
            </label>
            <button className="control" type="button" onClick={resetDashboard}>Reset</button>
          </form>

          <section className="drop-zone" aria-label="위젯 드롭 영역" onDragOver={(event) => event.preventDefault()} onDrop={handleDropToCanvas}>
            <div>
              <strong>Drag widgets here</strong>
              <span>왼쪽 팔레트의 위젯을 끌어오면 대시보드에 추가됩니다.</span>
            </div>
          </section>

          {isVisible('macroBoard') && (
            <section className="macro-strip widget" data-widget="macroBoard" aria-label="매크로 보드">
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
              <article className="card pad widget">
                <div className="card-head">
                  <div>
                    <h2>Hot Trend Sector Ranking</h2>
                    <p className="caption">수급 모멘텀과 가격 모멘텀 기준 Top 5 섹터</p>
                  </div>
                  <span className="score-pill">{sectorLabel} Top {Math.min(candidates.length, 20)}</span>
                </div>
                <div className="big-number"><span>{candidates.length}</span> <small>stocks screened</small></div>
                <div className="mini-line">
                  <span className="mini-chip">{selected.name}</span>
                  <span className="mini-chip">{sectorById[selected.sector].label}</span>
                  <span className="mini-chip">Total {selected.totalScore.toFixed(0)}</span>
                  <span className="mini-chip">KRX {selected.krxIndexHits}/34</span>
                  <span className="mini-chip">Trade {selected.tradeValueRatio.toFixed(1)}x</span>
                </div>
                <div className="bar-list">
                  {hotSectors.slice(0, 5).map((item) => (
                    <div className="bar-row" key={item.id}>
                      <button className={`bar-track clickable ${item.id === selected.sector ? 'active' : ''}`} type="button" onClick={() => setSector(item.id)}>
                        <span style={{ width: `${clamp(item.hotTrendScore, 24, 100)}%` }}>{item.label}</span>
                      </button>
                      <strong>{item.hotTrendScore.toFixed(0)}</strong>
                    </div>
                  ))}
                </div>
              </article>
            )}

            {isVisible('smartMoneyRanking') && (
              <article className="card pad widget" id="money">
                <div className="card-head">
                  <div>
                    <h2>Smart Money Ranking</h2>
                    <p className="caption">KRX 지수 편입, 소르티노, 거래대금, 펀더멘털 종합 점수</p>
                  </div>
                  <WidgetTools id="smartMoneyRanking" />
                </div>
                <div className="big-number"><span>{avg(candidates.map((stock) => stock.totalScore)).toFixed(1)}</span> <small>avg score</small></div>
                <table className="table" aria-label="스마트 머니 테이블">
                  <thead><tr><th>Stock</th><th>KRX hits</th><th>Total</th></tr></thead>
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
              <article className="card pad widget">
                <div className="card-head">
                  <div>
                    <h2>Market Thermometer</h2>
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
              <article className="card pad widget" id="sector">
                <div className="card-head">
                  <div>
                    <h2>Sector Radar</h2>
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
              <article className="card pad widget" id="matrix">
                <div className="card-head">
                  <div>
                    <h2>Smart Money Matrix</h2>
                    <p className="caption">X축 시장 관심, Y축 내재 가치, 버블 크기 Total Score</p>
                  </div>
                  <WidgetTools id="hiddenGemMatrix" />
                </div>
                <div className="matrix-wrap">
                  <svg viewBox="0 0 320 230" role="img" aria-label="Smart Money Matrix">
                    <rect x="44" y="25" width="123" height="85" rx="6" fill="#22c55e" opacity="0.08" />
                    <line x1="44" y1="25" x2="44" y2="194" stroke="#33445f" />
                    <line x1="44" y1="194" x2="290" y2="194" stroke="#33445f" />
                    <line x1="167" y1="25" x2="167" y2="194" stroke="#253247" strokeDasharray="4 5" />
                    <line x1="44" y1="110" x2="290" y2="110" stroke="#253247" strokeDasharray="4 5" />
                    <text x="50" y="40" fill="#4ade80" fontSize="11" fontWeight="800">숨은 후보</text>
                    <text x="203" y="40" fill="#93c5fd" fontSize="11" fontWeight="800">이미 주목</text>
                    <text x="106" y="218" fill="#8d9bb2" fontSize="11">시장 관심도: 5일/20일 거래대금</text>
                    <text x="7" y="132" fill="#8d9bb2" fontSize="11" transform="rotate(-90 7 132)">내재 가치: KRX 편입 + 소르티노</text>
                    {sorted.slice(0, 20).map((stock, index) => {
                      const x = 44 + (stock.marketAttentionScore / 100) * 246
                      const y = 194 - (stock.intrinsicScore / 100) * 169
                      const radius = 2.8 + (stock.totalScore / 100) * 4.2
                      const fill = stock.marketAttentionScore < 50 && stock.intrinsicScore >= 50 ? '#22c55e' : '#7c6df0'
                      const labelDx = x > 238 ? -6 : 6
                      const labelAnchor = x > 238 ? 'end' : 'start'
                      const labelDy = index % 2 === 0 ? -6 : 10
                      const showLabel = index < 10 || stock.ticker === selected.ticker
                      return (
                        <g className="matrix-point" key={stock.ticker} onClick={() => selectStock(stock.ticker)}>
                          <circle className={stock.ticker === selected.ticker ? 'active' : ''} cx={x} cy={y} r={radius} fill={fill} opacity="0.82" />
                          {showLabel && (
                            <text
                              className="matrix-label"
                              x={x + labelDx}
                              y={y + labelDy}
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
              <article className="card pad widget">
                <div className="card-head">
                  <div>
                    <h2>KRX Index Top 10</h2>
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
              <article className="card pad widget" id="valuation">
                <div className="card-head">
                  <div>
                    <h2>Valuation Gauge</h2>
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
              <article className="card pad widget">
                <div className="card-head">
                  <div>
                    <h2>Stock Summary</h2>
                    <p className="caption">{selected.ticker} · {selected.market} · {sectorById[selected.sector].label}</p>
                  </div>
                  <button
                    className={`favorite-btn ${favorites.has(selected.ticker) ? 'active' : ''}`}
                    type="button"
                    aria-label="관심 종목 토글"
                    onClick={() => setFavorites((items) => {
                      const next = new Set(items)
                      if (next.has(selected.ticker)) next.delete(selected.ticker)
                      else next.add(selected.ticker)
                      return next
                    })}
                  >
                    {favorites.has(selected.ticker) ? '★' : '☆'}
                  </button>
                </div>
                <div className="stock-summary">
                  <div className="summary-main">
                    <div>
                      <p className="caption">{selected.name}</p>
                      <strong>{selectedProfile.price}</strong>
                      <span className={selectedProfile.change.startsWith('-') ? 'negative' : 'positive'}>{selectedProfile.change}</span>
                    </div>
                    <span className="score-pill">Total {selected.totalScore.toFixed(0)}</span>
                  </div>
                  <div className="stat-grid">
                    <div className="stat-box"><span>시가총액</span><strong>{selectedProfile.marketCap}</strong></div>
                    <div className="stat-box"><span>거래량</span><strong>{selectedProfile.volume}</strong></div>
                    <div className="stat-box"><span>EPS</span><strong>{selectedProfile.eps}</strong></div>
                    <div className="stat-box"><span>KRX hits</span><strong>{selected.krxIndexHits}/34</strong></div>
                  </div>
                </div>
              </article>
            )}

            {isVisible('accountLink') && (
              <article className="card pad widget">
                <div className="card-head">
                  <div>
                    <h2>Account Link View</h2>
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
              <article className="card pad widget" id="risk">
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
              <article className="card pad widget">
                <div className="card-head">
                  <div>
                    <h2>Live Feed</h2>
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
            {isVisible('valuationBand') && (
              <article className="card pad widget">
                <h2>Valuation percentiles</h2>
                <p className="caption">섹터 내 상대 순위 기준</p>
                <MetricTable columns={['Metric', 'p25', 'p50', 'p75', 'Now']} rows={valuationRows} />
              </article>
            )}
            {isVisible('flowPercentiles') && (
              <article className="card pad widget">
                <h2>Flow percentiles</h2>
                <p className="caption">KRX 지수 편입과 단기 거래대금 증가율</p>
                <MetricTable columns={['Signal', 'p25', 'p50', 'p75', 'Now']} rows={flowRows} />
              </article>
            )}
            {isVisible('mdd') && (
              <article className="card pad widget">
                <h2>Risk percentiles</h2>
                <p className="caption">최근 3개월 기준</p>
                <MetricTable columns={['Risk', 'p25', 'p50', 'p75', 'Now']} rows={riskRows} />
              </article>
            )}
            {isVisible('reasonCards') && (
              <article className="card pad widget">
                <h2>Reason cards</h2>
                <p className="caption">왜 이 종목인지 자동 근거화</p>
                <table className="table">
                  <thead><tr><th>Reason</th><th>Score</th></tr></thead>
                  <tbody>{reasons.map(([reason, grade]) => <tr key={reason}><td>{reason}</td><td className="positive">{grade}</td></tr>)}</tbody>
                </table>
              </article>
            )}
          </div>

          {isVisible('discoveryTrend') && (
            <article className="card line-card widget">
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
