import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { CheckCircle, Save } from 'lucide-react'

import type {
  PhysicalPayload,
  RecordItem,
  SANAnswerSubmission,
  SANQuestion,
} from '../types'

interface DataEntryPageProps {
  questions: SANQuestion[]
  latestRecord: RecordItem | null
  onSavePhysical: (payload: PhysicalPayload) => Promise<void>
  onSubmitSan: (date: string, answers: SANAnswerSubmission[]) => Promise<void>
}

interface PhysicalFormState {
  date: string
  sleep: string
  meals: string
  restingHR: string
  exerciseHR: string
  recovery: string
  fatigue: string
  rpe: string
}

interface SANResults {
  wellbeing: number
  activity: number
  mood: number
}

const SAN_GROUPS = {
  wellbeing: [1, 2, 7, 8, 13, 14, 19, 20, 25, 26],
  activity: [3, 4, 9, 10, 15, 16, 21, 22, 27, 28],
  mood: [5, 6, 11, 12, 17, 18, 23, 24, 29, 30],
} as const

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function getInitialPhysicalState(record: RecordItem | null): PhysicalFormState {
  const physical = record?.physical_data
  return {
    date: record?.date ?? todayIsoDate(),
    sleep: physical ? String(physical.sleep_hours) : '',
    meals: physical ? String(physical.meals) : '',
    restingHR: physical ? String(physical.heart_rate_rest) : '',
    exerciseHR: physical ? String(physical.heart_rate_load) : '',
    recovery: physical ? String(physical.recovery_time) : '',
    fatigue: physical ? String(physical.fatigue) : '',
    rpe: physical ? String(physical.rpe) : '',
  }
}

function getStatusText(value: number) {
  if (value < 4) return 'Плохое состояние'
  if (value <= 5.5) return 'Нормальное состояние'
  return 'Хорошее состояние'
}

function getStatusColor(value: number) {
  if (value < 4) return 'text-red-600'
  if (value <= 5.5) return 'text-yellow-600'
  return 'text-green-600'
}

function getProgressColor(value: number) {
  if (value < 4) return 'bg-red-500'
  if (value <= 5.5) return 'bg-yellow-500'
  return 'bg-green-500'
}

function calculateSanResults(answers: SANAnswerSubmission[]) {
  const getAverage = (numbers: readonly number[]) => {
    const values = numbers.map(
      (number) => answers.find((answer) => answer.question_number === number)?.value ?? 0
    )
    const total = values.reduce((sum, value) => sum + value, 0)
    return Number((total / numbers.length).toFixed(2))
  }

  return {
    wellbeing: getAverage(SAN_GROUPS.wellbeing),
    activity: getAverage(SAN_GROUPS.activity),
    mood: getAverage(SAN_GROUPS.mood),
  }
}

export function DataEntryPage({
  questions,
  latestRecord,
  onSavePhysical,
  onSubmitSan,
}: DataEntryPageProps) {
  const [physicalData, setPhysicalData] = useState<PhysicalFormState>(() => getInitialPhysicalState(latestRecord))
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [sanAnswers, setSanAnswers] = useState<SANAnswerSubmission[]>([])
  const [sanResults, setSanResults] = useState<SANResults | null>(null)
  const [physicalSaved, setPhysicalSaved] = useState(false)
  const [sanSaved, setSanSaved] = useState(false)
  const [physicalError, setPhysicalError] = useState('')
  const [sanError, setSanError] = useState('')
  const [isSavingPhysical, setIsSavingPhysical] = useState(false)
  const [isSavingSan, setIsSavingSan] = useState(false)

  useEffect(() => {
    setPhysicalData(getInitialPhysicalState(latestRecord))
  }, [latestRecord])

  const currentQuestionData = questions[currentQuestion]
  const progress = useMemo(() => ((currentQuestion + 1) / questions.length) * 100, [currentQuestion, questions.length])

  const handleSavePhysical = async (e: FormEvent) => {
    e.preventDefault()
    setPhysicalError('')
    setPhysicalSaved(false)
    setIsSavingPhysical(true)

    try {
      await onSavePhysical({
        date: physicalData.date,
        sleep_hours: Number(physicalData.sleep),
        meals: Number(physicalData.meals),
        heart_rate_rest: Number(physicalData.restingHR),
        heart_rate_load: Number(physicalData.exerciseHR),
        recovery_time: physicalData.recovery,
        fatigue: Number(physicalData.fatigue),
        rpe: Number(physicalData.rpe),
      })
      setPhysicalSaved(true)
    } catch (err) {
      setPhysicalError(err instanceof Error ? err.message : 'Не удалось сохранить физические данные.')
    } finally {
      setIsSavingPhysical(false)
    }
  }

  const handleSANAnswer = (rawValue: number) => {
    setSanError('')
    setSanSaved(false)
    const answerValue = rawValue + 4
    const questionNumber = currentQuestionData.number
    const nextAnswers = [
      ...sanAnswers.filter((answer) => answer.question_number !== questionNumber),
      { question_number: questionNumber, value: answerValue },
    ].sort((left, right) => left.question_number - right.question_number)

    setSanAnswers(nextAnswers)

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      return
    }

    setSanResults(calculateSanResults(nextAnswers))
  }

  const handleSaveSan = async () => {
    if (!sanResults || sanAnswers.length !== questions.length) {
      setSanError('Сначала полностью пройди тест САН.')
      return
    }

    setSanError('')
    setSanSaved(false)
    setIsSavingSan(true)

    try {
      await onSubmitSan(physicalData.date, sanAnswers)
      setSanSaved(true)
    } catch (err) {
      setSanError(err instanceof Error ? err.message : 'Не удалось сохранить данные САН.')
    } finally {
      setIsSavingSan(false)
    }
  }

  const resetSan = () => {
    setSanResults(null)
    setCurrentQuestion(0)
    setSanAnswers([])
    setSanError('')
    setSanSaved(false)
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="mb-8">Заполнение данных</h1>

        <div className="bg-card rounded-xl shadow-sm border border-border p-8">
          <h2 className="mb-6">Физические показатели</h2>

          <form onSubmit={handleSavePhysical} className="space-y-6">
            <div>
              <label className="block mb-2">Дата записи</label>
              <input
                type="date"
                value={physicalData.date}
                onChange={(e) => {
                  setPhysicalData({ ...physicalData, date: e.target.value })
                  setPhysicalSaved(false)
                  setSanSaved(false)
                }}
                className="w-full px-4 py-3 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block mb-2">Сон (часы)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="0–10"
                  value={physicalData.sleep}
                  onChange={(e) => setPhysicalData({ ...physicalData, sleep: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block mb-2">Приемы пищи</label>
                <input
                  type="number"
                  placeholder="0–5"
                  value={physicalData.meals}
                  onChange={(e) => setPhysicalData({ ...physicalData, meals: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block mb-2">ЧСС в покое</label>
                <input
                  type="number"
                  placeholder="50–90"
                  value={physicalData.restingHR}
                  onChange={(e) => setPhysicalData({ ...physicalData, restingHR: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block mb-2">ЧСС при нагрузке</label>
                <input
                  type="number"
                  placeholder="90–220"
                  value={physicalData.exerciseHR}
                  onChange={(e) => setPhysicalData({ ...physicalData, exerciseHR: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block mb-2">Восстановление</label>
                <input
                  type="text"
                  placeholder="мм:сс или 2.5"
                  value={physicalData.recovery}
                  onChange={(e) => setPhysicalData({ ...physicalData, recovery: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block mb-2">Усталость</label>
                <input
                  type="number"
                  placeholder="1–10"
                  value={physicalData.fatigue}
                  onChange={(e) => setPhysicalData({ ...physicalData, fatigue: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="col-span-2">
                <label className="block mb-2">RPE</label>
                <input
                  type="number"
                  placeholder="1–10"
                  value={physicalData.rpe}
                  onChange={(e) => setPhysicalData({ ...physicalData, rpe: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {physicalSaved && !physicalError && (
              <p className="text-sm text-green-600">Физические данные сохранены.</p>
            )}
            {physicalError && <p className="text-sm text-red-600 break-words">{physicalError}</p>}

            <button
              type="submit"
              disabled={isSavingPhysical}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70"
            >
              {physicalSaved ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Физические данные сохранены
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {isSavingPhysical ? 'Сохраняем...' : 'Сохранить физические данные'}
                </>
              )}
            </button>
          </form>
        </div>

        {sanResults === null && currentQuestionData && (
          <div className="bg-card rounded-xl shadow-sm border border-border p-8">
            <h2 className="mb-2">Тест психологического состояния (САН)</h2>
            <p className="text-muted-foreground mb-8">Оцени своё состояние по шкале, затем сохрани данные САН.</p>

            <div className="space-y-6">
              <div className="text-center">
                <span className="text-sm text-muted-foreground">
                  Вопрос {currentQuestion + 1} из {questions.length}
                </span>
              </div>

              <div className="bg-accent/30 rounded-lg p-6">
                <div className="flex justify-between items-center mb-8 gap-6">
                  <span className="text-foreground">{currentQuestionData.left_text}</span>
                  <span className="text-foreground text-right">{currentQuestionData.right_text}</span>
                </div>

                <div className="flex justify-center items-center gap-3 flex-wrap">
                  {[3, 2, 1, 0, -1, -2, -3].map((value) => (
                    <button
                      key={value}
                      onClick={() => handleSANAnswer(value)}
                      className="w-12 h-12 rounded-full border-2 border-primary bg-background hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center"
                    >
                      {Math.abs(value)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {sanResults && (
          <div className="bg-card rounded-xl shadow-sm border border-border p-8">
            <h2 className="mb-6">Результаты психологического состояния</h2>

            <div className="grid grid-cols-3 gap-6">
              {([
                ['Самочувствие', sanResults.wellbeing],
                ['Активность', sanResults.activity],
                ['Настроение', sanResults.mood],
              ] as const).map(([label, value]) => (
                <div key={label} className="bg-accent/30 rounded-lg p-6 text-center">
                  <h3 className="mb-4">{label}</h3>
                  <div className="text-4xl mb-3">{value}</div>
                  <p className={`text-sm ${getStatusColor(value)}`}>{getStatusText(value)}</p>
                  <div className="mt-4 w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressColor(value)}`}
                      style={{ width: `${((value - 1) / 6) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {sanSaved && !sanError && (
              <p className="mt-6 text-sm text-green-600">
                Данные САН сохранены. Если физические данные уже сохранены за эту дату, оценки появятся в профиле и графиках.
              </p>
            )}
            {sanError && <p className="mt-6 text-sm text-red-600 break-words">{sanError}</p>}

            <div className="mt-6 grid grid-cols-2 gap-4">
              <button
                onClick={() => void handleSaveSan()}
                disabled={isSavingSan}
                className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70"
              >
                {isSavingSan ? 'Сохраняем...' : sanSaved ? 'Данные САН сохранены' : 'Сохранить данные САН'}
              </button>

              <button
                onClick={resetSan}
                className="w-full px-6 py-4 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
              >
                Пройти тест заново
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
