import { useMemo, useState } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'

import type { DeltaInfo, RecordItem } from '../types'

interface PsychologyPageProps {
  records: RecordItem[]
  latestDelta: DeltaInfo | null
}

function formatLongDate(date?: string) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function PsychologyPage({ records, latestDelta }: PsychologyPageProps) {
  const [showDynamic, setShowDynamic] = useState(false)

  const psychologyData = useMemo(
    () =>
      records
        .filter((record) => record.psychological_score !== null)
        .slice(0, 7)
        .reverse()
        .map((record) => ({
          date: new Date(record.date).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
          }),
          score: record.psychological_score as number,
        })),
    [records]
  )

  const latestRecord = records.find((record) => record.psychological_score !== null) ?? null
  const currentScore = latestRecord?.psychological_score ?? null
  const currentDate = latestRecord?.date

  const firstScore = psychologyData[0]?.score ?? null
  const lastScore = psychologyData[psychologyData.length - 1]?.score ?? null
  const isPositiveDynamic = firstScore !== null && lastScore !== null ? lastScore >= firstScore : true

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="mb-8">Психология</h1>

        <div className="bg-card rounded-lg shadow-sm border border-border p-10 mb-8">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Оценка состояния психологии</p>
            <p className="text-muted-foreground mb-6">{formatLongDate(currentDate ?? undefined)}</p>

            <div className="inline-flex items-center justify-center w-40 h-40 rounded-full bg-primary text-primary-foreground mb-4">
              <span className="text-6xl">{currentScore === null ? '—' : Number(currentScore.toFixed(1))}</span>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-center gap-2">
                <div className="h-2 w-full max-w-md bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${currentScore ? (currentScore / 10) * 100 : 0}%` }}
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
            <button
              onClick={() => setShowDynamic(!showDynamic)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              {showDynamic ? 'Скрыть динамику' : 'Показать динамику'}
            </button>
          </div>

          <div className="w-full" style={{ height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={psychologyData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--muted-foreground)' }}
                  label={{ value: 'Дата', position: 'insideBottom', offset: -10, fill: 'var(--foreground)' }}
                />
                <YAxis
                  domain={[0, 10]}
                  ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                  tick={{ fill: 'var(--muted-foreground)' }}
                  label={{ value: 'Оценка', angle: -90, position: 'insideLeft', fill: 'var(--foreground)' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--foreground)',
                  }}
                  labelStyle={{ color: 'var(--foreground)' }}
                />
                <Bar dataKey="score" fill="var(--primary)" radius={[8, 8, 0, 0]} name="Психология" />
                {showDynamic && psychologyData.length > 1 && (
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

          {showDynamic && latestDelta && (
            <div
              className={`mt-6 p-6 rounded-lg border-2 ${
                isPositiveDynamic
                  ? 'bg-green-50 border-green-500 dark:bg-green-950/30 dark:border-green-600'
                  : 'bg-red-50 border-red-500 dark:bg-red-950/30 dark:border-red-600'
              }`}
            >
              <div className="flex items-center gap-3">
                {isPositiveDynamic ? (
                  <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-600 dark:text-red-400" />
                )}
                <div>
                  <h3 className={isPositiveDynamic ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}>
                    {isPositiveDynamic ? 'Положительная тенденция' : 'Отрицательная тенденция'}
                  </h3>
                  <p className={`mt-1 ${isPositiveDynamic ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {latestDelta.delta === null
                      ? 'Нужно больше данных, чтобы отследить изменение состояния.'
                      : `Последнее изменение общего состояния: ${latestDelta.delta > 0 ? '+' : ''}${latestDelta.delta}`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
