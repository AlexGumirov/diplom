import { useCallback, useEffect, useMemo, useState } from 'react'
import { User, Brain, Activity, TrendingUp, ClipboardEdit, Settings, BarChart3, BookOpen } from 'lucide-react'

import { fetchBootstrap, savePhysicalData, submitSanTest } from './api'
import { ProfilePage } from './components/ProfilePage'
import { PsychologyPage } from './components/PsychologyPage'
import { PhysicsPage } from './components/PhysicsPage'
import { OverallPage } from './components/OverallPage'
import { DataEntryPage } from './components/DataEntryPage'
import { ProfileEditPage } from './components/ProfileEditPage'
import { StatisticsPage } from './components/StatisticsPage'
import { DiaryPage } from './components/DiaryPage'
import type { AppBootstrap, Page, PhysicalPayload, SANAnswerSubmission } from './types'

const PAGE_PATHS: Record<Page, string> = {
  profile: '/',
  psychology: '/psychology/',
  physics: '/physics/',
  overall: '/overall/',
  dataEntry: '/data-entry/',
  profileEdit: '/profile/edit/',
  statistics: '/statistics/',
  diary: '/diary/',
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
    case '/profile/edit/':
      return 'profileEdit'
    case '/statistics/':
      return 'statistics'
    case '/diary/':
      return 'diary'
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
          <div className="flex gap-2 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
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

              <button
                onClick={() => navigate('statistics')}
                className={`flex items-center gap-2 px-6 py-3 rounded-md transition-colors ${
                  currentPage === 'statistics'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                <BarChart3 className="w-5 h-5" />
                Статистика
              </button>

              <button
                onClick={() => navigate('diary')}
                className={`flex items-center gap-2 px-6 py-3 rounded-md transition-colors ${
                  currentPage === 'diary'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                <BookOpen className="w-5 h-5" />
                Дневник
              </button>
            </div>

            <button
              onClick={() => navigate('profileEdit')}
              className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors ${
                currentPage === 'profileEdit'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
              title="Редактировать профиль"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {currentPage === 'profile' && (
        <ProfilePage
          profile={data.profile}
          records={completedRecords.slice(0, 5)}
          onViewDiary={() => navigate('diary')}
        />
      )}
      {currentPage === 'psychology' && (
        <PsychologyPage records={data.records} latestDelta={data.latest_delta} deltaAnalysis={data.delta_analysis.psychological} />
      )}
      {currentPage === 'physics' && (
        <PhysicsPage records={data.records} latestDelta={data.latest_delta} deltaAnalysis={data.delta_analysis.physical} />
      )}
      {currentPage === 'overall' && (
        <OverallPage records={data.records} latestDelta={data.latest_delta} deltaAnalysis={data.delta_analysis.overall} />
      )}
      {currentPage === 'dataEntry' && (
        <DataEntryPage
          questions={data.questions}
          latestRecord={latestRecord}
          onSavePhysical={handleSavePhysical}
          onSubmitSan={handleSubmitSan}
        />
      )}
      {currentPage === 'profileEdit' && <ProfileEditPage />}
      {currentPage === 'statistics' && <StatisticsPage userName={data.profile.display_name} />}
      {currentPage === 'diary' && <DiaryPage records={completedRecords} />}
    </div>
  )
}
