import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, CheckCircle, TrendingDown, TrendingUp } from 'lucide-react'

import { fetchCorrelations } from '../api'
import type { CorrelationItem, CorrelationPeriod, CorrelationReport } from '../types'

interface StatisticsPageProps {
  userName: string
}

const PERIOD_OPTIONS: Array<{ value: CorrelationPeriod; label: string }> = [
  { value: '7', label: '7 дней' },
  { value: '14', label: '14 дней' },
  { value: '31', label: '31 день' },
  { value: 'all', label: 'Весь период' },
]

function DirectionIcon({ item }: { item: CorrelationItem }) {
  if (item.direction === 'positive') {
    return <TrendingUp className="w-5 h-5 text-green-600" />
  }
  if (item.direction === 'negative') {
    return <TrendingDown className="w-5 h-5 text-red-600" />
  }
  return <ArrowRight className="w-5 h-5 text-muted-foreground" />
}

function formatCorrelation(value: number) {
  return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2)
}

export function StatisticsPage({ userName }: StatisticsPageProps) {
  const [period, setPeriod] = useState<CorrelationPeriod>('all')
  const [report, setReport] = useState<CorrelationReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError('')

    fetchCorrelations(period)
      .then((payload) => {
        if (isMounted) {
          setReport(payload)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить корреляции.')
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [period])

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <h1>Статистика</h1>
          <div className="flex gap-2 flex-wrap">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriod(option.value)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  period === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-border p-8 mb-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2>Самые зависимые показатели</h2>
              {report && (
                <p className="text-sm text-muted-foreground mt-2">
                  Для каждой шкалы САН показан самый связанный с ней физический показатель.
                  Метод: корреляция Пирсона, записей в расчете: {report.records_count}
                </p>
              )}
            </div>
            {report?.status === 'ok' && <CheckCircle className="w-6 h-6 text-green-600" />}
          </div>

          {loading && (
            <div className="bg-muted/50 rounded-lg p-6 text-muted-foreground">
              Загружаем корреляционный анализ...
            </div>
          )}

          {!loading && error && (
            <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-500 rounded-lg p-6 text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {!loading && !error && report?.status === 'insufficient_data' && (
            <div className="bg-yellow-50 dark:bg-yellow-950/30 border-2 border-yellow-500 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-yellow-800 dark:text-yellow-300 mb-2">
                    Недостаточно данных
                  </h3>
                  <p className="text-yellow-700 dark:text-yellow-400">
                    {report.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && report?.status === 'ok' && report.items.length === 0 && (
            <div className="bg-muted/50 rounded-lg p-6 text-muted-foreground">
              За выбранный период не найдено физических показателей, связанных со шкалами САН с |r| выше 0.30.
            </div>
          )}

          {!loading && !error && report?.status === 'ok' && report.items.length > 0 && (
            <div className="space-y-6">
              {report.items.map((item) => (
                <div key={`${item.left_key}-${item.right_key}`}>
                  <div className="bg-accent/30 rounded-lg p-6 mb-3">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="px-4 py-2 bg-primary/10 text-primary rounded-lg">
                          {item.left_label}
                        </span>
                        <DirectionIcon item={item} />
                        <span className="px-4 py-2 bg-primary/10 text-primary rounded-lg">
                          {item.right_label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                        <span className="px-3 py-1 bg-background border border-border rounded-md">
                          r = {formatCorrelation(item.correlation)}
                        </span>
                        <span className="px-3 py-1 bg-background border border-border rounded-md">
                          {item.strength_label}
                        </span>
                        <span className="px-3 py-1 bg-background border border-border rounded-md">
                          {item.direction_label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-primary">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{userName}</span>, {item.message.replace('У спортсмена', 'у вас')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-border p-8">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h2>Как читать результат</h2>
          </div>
          <p className="text-muted-foreground">
            Коэффициент Пирсона показывает статистическую связь между показателями на шкале от -1 до 1.
            Положительное значение означает прямую связь, отрицательное значение означает обратную связь.
            На этой странице для Самочувствия, Активности и Настроения выбирается самый связанный физический показатель.
            Корреляция описывает наблюдаемую зависимость и не доказывает причину.
          </p>
        </div>
      </div>
    </div>
  )
}
