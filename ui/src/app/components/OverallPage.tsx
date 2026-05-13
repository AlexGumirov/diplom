import { useMemo, useState } from 'react'
import { ComposedChart, Bar, Cell, Line, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'

import type { DeltaAnalysisByPeriod, DeltaInfo, PeriodFilter, RecordItem } from '../types'

interface OverallPageProps {
  records: RecordItem[]
  latestDelta: DeltaInfo | null
  deltaAnalysis: DeltaAnalysisByPeriod
}

function formatLongDate(date?: string) {
  return date
    ? new Date(date).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '—'
}

function describeBackendDelta(delta: DeltaInfo | null) {
  if (!delta || delta.delta === null) return 'Нужно больше данных для дельта-анализа.'
  if (delta.status === 'improvement') return `Состояние улучшилось на ${delta.delta}.`
  if (delta.status === 'deterioration') return `Состояние ухудшилось на ${Math.abs(delta.delta)}.`
  return `Состояние стабильно, изменение ${delta.delta}.`
}

function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}

function describeStatus(status: string) {
  if (status === 'improvement') return 'улучшение'
  if (status === 'deterioration') return 'ухудшение'
  if (status === 'stable') return 'стабильно'
  return 'недостаточно данных'
}

function describeNeighborDelta(delta: number) {
  if (delta > 0) return 'Состояние улучшилось'
  if (delta < 0) return 'Состояние ухудшилось'
  return 'Состояние стабильно'
}

export function OverallPage({ records, latestDelta, deltaAnalysis }: OverallPageProps) {
  const [showDynamic, setShowDynamic] = useState(false)
  const [period, setPeriod] = useState<PeriodFilter>('7')

  const scoredRecords = useMemo(() => records.filter((record) => record.total_score !== null), [records])
  const currentRecord = scoredRecords[0] ?? null
  const currentScore = currentRecord?.total_score ?? null
  const periodAnalysis = deltaAnalysis[period]
  const neighborData = periodAnalysis.neighbors ?? []
  const days = period === 'all' || period === 'neighbors' ? scoredRecords.length : Number(period)
  const scoreChartData = scoredRecords
    .slice(0, days)
    .reverse()
    .map((record) => ({
      date: new Date(record.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      score: record.total_score,
    }))
  const neighborChartData = neighborData.map((item) => ({
    date: `${formatShortDate(item.from_date)} → ${formatShortDate(item.to_date)}`,
    delta: item.delta,
    fill: item.delta > 0 ? '#22c55e' : item.delta < 0 ? '#ef4444' : '#94a3b8',
  }))
  const chartData = period === 'neighbors' ? neighborChartData : scoreChartData
  const maxAbsDelta = Math.max(1, ...neighborChartData.map((item) => Math.abs(item.delta)))
  const deltaDomain = [-Number(maxAbsDelta.toFixed(2)), Number(maxAbsDelta.toFixed(2))]
  const isPositiveDynamic = latestDelta?.status !== 'deterioration'
  const aggregated = periodAnalysis.aggregated

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="mb-8">Общее состояние</h1>

        <div className="bg-card rounded-lg shadow-sm border border-border p-10 mb-8">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Общая оценка состояния спортсмена</p>
            <p className="text-muted-foreground mb-6">{formatLongDate(currentRecord?.date)}</p>

            <div className="inline-flex items-center justify-center w-40 h-40 rounded-full bg-primary text-primary-foreground mb-4">
              <span className="text-6xl">{currentScore === null ? '—' : Number(currentScore.toFixed(1))}</span>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-center gap-2">
                <div className="h-2 w-full max-w-md bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${currentScore === null ? 0 : (currentScore / 10) * 100}%` }}
                  ></div>
                </div>
                <span className="text-muted-foreground">из 10</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2>Динамика оценок</h2>

            <div className="flex items-center gap-3">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
                className="px-4 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="7">7 дней</option>
                <option value="14">14 дней</option>
                <option value="31">31 день</option>
                <option value="all">Весь период</option>
                <option value="neighbors">Соседние дни</option>
              </select>

              <button
                onClick={() => setShowDynamic(!showDynamic)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                {showDynamic ? 'Скрыть динамику' : 'Показать динамику'}
              </button>
            </div>
          </div>

          <div className="w-full" style={{ height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--muted-foreground)' }} />
                <YAxis
                  domain={period === 'neighbors' ? deltaDomain : [0, 10]}
                  ticks={period === 'neighbors' ? undefined : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                  tick={{ fill: 'var(--muted-foreground)' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--foreground)',
                  }}
                  labelStyle={{ color: 'var(--foreground)' }}
                  formatter={(value) => [Number(value).toFixed(2), period === 'neighbors' ? 'Изменение' : 'Оценка']}
                />
                {period === 'neighbors' && <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="4 4" />}
                <Bar dataKey={period === 'neighbors' ? 'delta' : 'score'} fill="var(--primary)" radius={[8, 8, 0, 0]} name={period === 'neighbors' ? 'Дельта общего состояния' : 'Общее состояние'}>
                  {period === 'neighbors' &&
                    neighborChartData.map((entry) => <Cell key={entry.date} fill={entry.fill} />)}
                </Bar>
                {showDynamic && period !== 'neighbors' && chartData.length > 1 && (
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke={isPositiveDynamic ? '#22c55e' : '#ef4444'}
                    strokeWidth={3}
                    dot={{ fill: isPositiveDynamic ? '#22c55e' : '#ef4444', r: 5 }}
                    activeDot={{ r: 7 }}
                    name="Тренд"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {showDynamic && (
            <div className="mt-6 rounded-lg bg-card border border-border p-6 shadow-xl">
              <div className="w-full">
                <div className="flex items-center gap-3 mb-4">
                  {aggregated.status === 'deterioration' ? (
                    <TrendingDown className="w-8 h-8 text-red-600 dark:text-red-400" />
                  ) : (
                    <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
                  )}
                  <div>
                    <h3>Дельта-анализ общего состояния</h3>
                    <p className="text-sm text-muted-foreground">
                      {period === 'neighbors' ? 'Изменения между соседними записями' : 'Агрегированная динамика за период'}
                    </p>
                  </div>
                </div>

                {period !== 'neighbors' && (
                  aggregated.total_delta === null ? (
                    <p className="text-sm text-muted-foreground">Недостаточно данных для дельта-анализа.</p>
                  ) : (
                    <div className="space-y-2 text-sm text-foreground">
                      <p>Период: {formatLongDate(aggregated.period_start)} — {formatLongDate(aggregated.period_end)}</p>
                      <p>Первая оценка: {aggregated.first_score?.toFixed(2)}</p>
                      <p>Последняя оценка: {aggregated.last_score?.toFixed(2)}</p>
                      <p>Суммарная динамика: {aggregated.total_delta.toFixed(2)} ({describeStatus(aggregated.status)})</p>
                      <p>{describeBackendDelta(latestDelta)}</p>
                    </div>
                  )
                )}

                {period === 'neighbors' && (
                  neighborData.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Недостаточно данных для анализа соседних дней.</p>
                  ) : (
                    <div className="space-y-2 text-sm text-foreground">
                      {neighborData.slice(-8).map((item) => (
                        <p key={`${item.from_date}-${item.to_date}`}>
                          {formatShortDate(item.from_date)} → {formatShortDate(item.to_date)}: {item.delta.toFixed(2)} —{' '}
                          {describeNeighborDelta(item.delta)}
                        </p>
                      ))}
                    </div>
                  )
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowDynamic(false)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
