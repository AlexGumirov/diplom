import { useCallback, useEffect, useMemo, useState } from 'react'
import { User, Brain, Activity, TrendingUp, ClipboardEdit } from 'lucide-react'

import { fetchBootstrap, savePhysicalData, submitSanTest } from './api'
import { ProfilePage } from './components/ProfilePage'
import { PsychologyPage } from './components/PsychologyPage'
import { PhysicsPage } from './components/PhysicsPage'
import { OverallPage } from './components/OverallPage'
import { DataEntryPage } from './components/DataEntryPage'
import type { AppBootstrap, Page, PhysicalPayload, SANAnswerSubmission } from './types'

const PAGE_PATHS: Record<Page, string> = {
  profile: '/',
  psychology: '/psychology/',
  physics: '/physics/',
  overall: '/overall/',
  dataEntry: '/data-entry/',
}

function getPageFromPath(pathname: string): Page {
  switch (pathname) {
    case '/psychology/':
      return 'psychology'
    case '/physics/':
      return 'physics'
    case '/overall/':
      return 'overall'
    case '/data-entry/':
      return 'dataEntry'
    case '/':
    case '/profile/':
    default:
      return 'profile'
  }
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>(() => getPageFromPath(window.location.pathname))
  const [data, setData] = useState<AppBootstrap | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const payload = await fetchBootstrap()
      setData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить данные приложения.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    const onPopState = () => setCurrentPage(getPageFromPath(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = (page: Page) => {
    const path = PAGE_PATHS[page]
    window.history.pushState({}, '', path)
    setCurrentPage(page)
  }

  const latestRecord = useMemo(() => data?.records[0] ?? null, [data])
  const completedRecords = useMemo(
    () => data?.records.filter((record) => record.total_score !== null) ?? [],
    [data]
  )

  const handleSavePhysical = async (payload: PhysicalPayload) => {
    await savePhysicalData(payload)
    await loadData()
  }

  const handleSubmitSan = async (date: string, answers: SANAnswerSubmission[]) => {
    await submitSanTest(date, answers)
    await loadData()
  }

  const handleOpenEntry = () => {
    window.alert('Страница записи будет добавлена позже.')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card border border-border rounded-xl px-8 py-6 shadow-sm">
          Загрузка данных спортсмена...
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-xl bg-card border border-border rounded-xl px-8 py-6 shadow-sm space-y-4">
          <h2>Не удалось открыть приложение</h2>
          <p className="text-muted-foreground break-words">{error || 'Нет данных для отображения.'}</p>
          <button
            onClick={() => void loadData()}
            className="px-5 py-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Повторить загрузку
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate('profile')}
              className={`flex items-center gap-2 px-6 py-3 rounded-md transition-colors ${
                currentPage === 'profile'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <User className="w-5 h-5" />
              Профиль
            </button>

            <button
              onClick={() => navigate('psychology')}
              className={`flex items-center gap-2 px-6 py-3 rounded-md transition-colors ${
                currentPage === 'psychology'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <Brain className="w-5 h-5" />
              Психология
            </button>

            <button
              onClick={() => navigate('physics')}
              className={`flex items-center gap-2 px-6 py-3 rounded-md transition-colors ${
                currentPage === 'physics'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <Activity className="w-5 h-5" />
              Физика
            </button>

            <button
              onClick={() => navigate('overall')}
              className={`flex items-center gap-2 px-6 py-3 rounded-md transition-colors ${
                currentPage === 'overall'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              Общее состояние
            </button>

            <button
              onClick={() => navigate('dataEntry')}
              className={`flex items-center gap-2 px-6 py-3 rounded-md transition-colors ${
                currentPage === 'dataEntry'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <ClipboardEdit className="w-5 h-5" />
              Заполнение данных
            </button>
          </div>
        </div>
      </nav>

      {currentPage === 'profile' && (
        <ProfilePage profile={data.profile} records={completedRecords.slice(0, 5)} onOpenEntry={handleOpenEntry} />
      )}
      {currentPage === 'psychology' && (
        <PsychologyPage records={data.records} latestDelta={data.latest_delta} />
      )}
      {currentPage === 'physics' && (
        <PhysicsPage records={data.records} latestDelta={data.latest_delta} />
      )}
      {currentPage === 'overall' && (
        <OverallPage records={data.records} latestDelta={data.latest_delta} />
      )}
      {currentPage === 'dataEntry' && (
        <DataEntryPage
          questions={data.questions}
          latestRecord={latestRecord}
          onSavePhysical={handleSavePhysical}
          onSubmitSan={handleSubmitSan}
        />
      )}
    </div>
  )
}
