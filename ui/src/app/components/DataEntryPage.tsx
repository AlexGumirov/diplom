import { useState } from 'react'
import { AlertTriangle, Save, CheckCircle } from 'lucide-react'

import type { CompleteRecordPayload, SANAnswerSubmission, SANQuestion } from '../types'

interface PhysicalData {
  date: string
  sleep: string
  meals: string
  restingHR: string
  exerciseHR: string
  recovery: string
  fatigue: string
  rpe: string
  notes: string
}

interface SANResults {
  wellbeing: number
  activity: number
  mood: number
}

interface DataEntryPageProps {
  questions: SANQuestion[]
  existingDates: string[]
  onSaveRecord: (payload: CompleteRecordPayload) => Promise<void>
}

type SaveNotice = {
  type: 'success' | 'error'
  message: string
} | null

const SAN_GROUPS = {
  wellbeing: [1, 2, 7, 8, 13, 14, 19, 20, 25, 26],
  activity: [3, 4, 9, 10, 15, 16, 21, 22, 27, 28],
  mood: [5, 6, 11, 12, 17, 18, 23, 24, 29, 30],
} as const

const SAN_REVERSE_QUESTIONS = new Set([3, 4, 9, 10, 13, 15, 16, 21, 22, 27, 28])

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function getInitialPhysicalState(): PhysicalData {
  return {
    date: todayIsoDate(),
    sleep: '',
    meals: '',
    restingHR: '',
    exerciseHR: '',
    recovery: '',
    fatigue: '',
    rpe: '',
    notes: '',
  }
}

function calculateSANResults(answers: SANAnswerSubmission[]) {
  const normalizedValue = (answer: SANAnswerSubmission) =>
    SAN_REVERSE_QUESTIONS.has(answer.question_number) ? 8 - answer.value : answer.value

  const getAverage = (numbers: readonly number[]) => {
    const total = numbers.reduce((sum, number) => {
      const answer = answers.find((item) => item.question_number === number)
      return sum + (answer ? normalizedValue(answer) : 0)
    }, 0)
    return Number((total / numbers.length).toFixed(1))
  }

  return {
    wellbeing: getAverage(SAN_GROUPS.wellbeing),
    activity: getAverage(SAN_GROUPS.activity),
    mood: getAverage(SAN_GROUPS.mood),
  }
}

function getStatusText(value: number) {
  if (value < 4) return 'Плохое состояние'
  if (value > 5.5) return 'Хорошее состояние'
  return 'Нормальное состояние'
}

function getStatusColor(value: number) {
  if (value < 4) return 'text-red-600'
  if (value > 5.5) return 'text-green-600'
  return 'text-yellow-600'
}

function getProgressColor(value: number) {
  if (value < 4) return 'bg-red-500'
  if (value > 5.5) return 'bg-green-500'
  return 'bg-yellow-500'
}

function isFutureDate(value: string) {
  return value > todayIsoDate()
}

function validateNumberField(
  value: string,
  label: string,
  min: number,
  max: number,
  integerOnly = false
) {
  if (value.trim() === '') {
    return `${label}: заполните поле.`
  }

  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) {
    return `${label}: введите число.`
  }
  if (integerOnly && !Number.isInteger(numberValue)) {
    return `${label}: введите целое число.`
  }
  if (numberValue < min || numberValue > max) {
    return `${label}: допустимый диапазон ${min}-${max}.`
  }

  return ''
}

function parseRecoveryValue(value: string) {
  const trimmed = value.trim()
  if (trimmed.includes(':')) {
    const [minutesRaw, secondsRaw] = trimmed.split(':')
    if (minutesRaw === undefined || secondsRaw === undefined || trimmed.split(':').length !== 2) {
      return Number.NaN
    }

    const minutes = Number(minutesRaw)
    const seconds = Number(secondsRaw)
    if (!Number.isInteger(minutes) || !Number.isInteger(seconds) || seconds < 0 || seconds >= 60) {
      return Number.NaN
    }
    return minutes + seconds / 60
  }

  return Number(trimmed)
}

function validateRecovery(value: string) {
  if (value.trim() === '') {
    return 'Восстановление: заполните поле.'
  }

  const recovery = parseRecoveryValue(value)
  if (!Number.isFinite(recovery)) {
    return 'Восстановление: используйте формат мм:сс или число минут.'
  }
  if (recovery < 1 || recovery > 5) {
    return 'Восстановление: допустимый диапазон 1-5 минут.'
  }

  return ''
}

export function DataEntryPage({
  questions,
  existingDates,
  onSaveRecord,
}: DataEntryPageProps) {
  const [physicalData, setPhysicalData] = useState<PhysicalData>(() => getInitialPhysicalState())
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [sanAnswers, setSanAnswers] = useState<SANAnswerSubmission[]>([])
  const [sanResults, setSanResults] = useState<SANResults | null>(null)
  const [notice, setNotice] = useState<SaveNotice>(null)
  const [isSavingRecord, setIsSavingRecord] = useState(false)

  const currentQuestionData = questions[currentQuestion]

  const validateEntry = () => {
    const errors = [
      !physicalData.date ? 'Дата записи: выберите дату.' : '',
      physicalData.date && isFutureDate(physicalData.date)
        ? 'Дата записи: нельзя создавать запись на будущую дату.'
        : '',
      existingDates.includes(physicalData.date)
        ? 'Дата записи: за выбранную дату уже есть запись в дневнике.'
        : '',
      validateNumberField(physicalData.sleep, 'Сон', 0, 12),
      validateNumberField(physicalData.meals, 'Приемы пищи', 0, 5, true),
      validateNumberField(physicalData.restingHR, 'ЧСС в покое', 50, 90, true),
      validateNumberField(physicalData.exerciseHR, 'ЧСС при нагрузке', 90, 220, true),
      validateRecovery(physicalData.recovery),
      validateNumberField(physicalData.fatigue, 'Усталость', 1, 10, true),
      validateNumberField(physicalData.rpe, 'RPE', 1, 10, true),
      !sanResults || sanAnswers.length !== questions.length ? 'САН: пройдите тест полностью.' : '',
    ].filter(Boolean)

    return errors
  }

  const handleSANAnswer = (rawValue: number) => {
    setNotice(null)
    const value = rawValue + 4
    const questionNumber = currentQuestionData.number
    const nextAnswers = [
      ...sanAnswers.filter((answer) => answer.question_number !== questionNumber),
      { question_number: questionNumber, value },
    ].sort((left, right) => left.question_number - right.question_number)

    setSanAnswers(nextAnswers)

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      return
    }

    setSanResults(calculateSANResults(nextAnswers))
  }

  const handleSaveRecord = async () => {
    const errors = validateEntry()
    if (errors.length > 0) {
      setNotice({ type: 'error', message: errors.join('\n') })
      return
    }

    setNotice(null)
    setIsSavingRecord(true)

    try {
      await onSaveRecord({
        date: physicalData.date,
        notes: physicalData.notes,
        physical_data: {
          sleep_hours: Number(physicalData.sleep),
          meals: Number(physicalData.meals),
          heart_rate_rest: Number(physicalData.restingHR),
          heart_rate_load: Number(physicalData.exerciseHR),
          recovery_time: physicalData.recovery,
          fatigue: Number(physicalData.fatigue),
          rpe: Number(physicalData.rpe),
        },
        answers: sanAnswers,
      })
      setNotice({ type: 'success', message: 'Данные сохранены. Запись добавлена в дневник.' })
      setPhysicalData(getInitialPhysicalState())
      setCurrentQuestion(0)
      setSanAnswers([])
      setSanResults(null)
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Не удалось сохранить данные.',
      })
    } finally {
      setIsSavingRecord(false)
    }
  }

  const resetSan = () => {
    setSanResults(null)
    setCurrentQuestion(0)
    setSanAnswers([])
    setNotice(null)
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {notice && (
        <div
          className={`fixed right-6 top-6 z-50 max-w-lg rounded-lg border p-4 shadow-lg whitespace-pre-line ${
            notice.type === 'success'
              ? 'border-green-500 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
              : 'border-red-500 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
          }`}
          role="status"
        >
          <div className="flex items-start gap-3">
            {notice.type === 'success' ? (
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            )}
            <p className="text-sm">{notice.message}</p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="mb-8">Заполнение данных</h1>

        <div className="bg-card rounded-xl shadow-sm border border-border p-8">
          <h2 className="mb-6">Физические показатели</h2>

          <div className="space-y-6">
            <div>
              <label className="block mb-2">Дата записи</label>
              <input
                type="date"
                value={physicalData.date}
                max={todayIsoDate()}
                required
                onChange={(e) => {
                  setPhysicalData({ ...physicalData, date: e.target.value })
                  setNotice(null)
                }}
                className="w-full px-4 py-3 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {existingDates.includes(physicalData.date) && (
                <p className="mt-2 text-sm text-red-600">
                  За выбранную дату уже есть запись в дневнике.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block mb-2">Сон (часы)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="12"
                  required
                  placeholder="0-12"
                  value={physicalData.sleep}
                  onChange={(e) => {
                    setPhysicalData({ ...physicalData, sleep: e.target.value })
                    setNotice(null)
                  }}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block mb-2">Приемы пищи</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  required
                  placeholder="0-5"
                  value={physicalData.meals}
                  onChange={(e) => {
                    setPhysicalData({ ...physicalData, meals: e.target.value })
                    setNotice(null)
                  }}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block mb-2">ЧСС в покое</label>
                <input
                  type="number"
                  min="50"
                  max="90"
                  required
                  placeholder="50-90"
                  value={physicalData.restingHR}
                  onChange={(e) => {
                    setPhysicalData({ ...physicalData, restingHR: e.target.value })
                    setNotice(null)
                  }}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block mb-2">ЧСС при нагрузке</label>
                <input
                  type="number"
                  min="90"
                  max="220"
                  required
                  placeholder="90-220"
                  value={physicalData.exerciseHR}
                  onChange={(e) => {
                    setPhysicalData({ ...physicalData, exerciseHR: e.target.value })
                    setNotice(null)
                  }}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block mb-2">Восстановление</label>
                <input
                  type="text"
                  placeholder="мм:сс или 2.5"
                  value={physicalData.recovery}
                  required
                  onChange={(e) => {
                    setPhysicalData({ ...physicalData, recovery: e.target.value })
                    setNotice(null)
                  }}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block mb-2">Усталость</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  placeholder="1-10"
                  value={physicalData.fatigue}
                  onChange={(e) => {
                    setPhysicalData({ ...physicalData, fatigue: e.target.value })
                    setNotice(null)
                  }}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="col-span-2">
                <label className="block mb-2">RPE</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  placeholder="1-10"
                  value={physicalData.rpe}
                  onChange={(e) => {
                    setPhysicalData({ ...physicalData, rpe: e.target.value })
                    setNotice(null)
                  }}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="col-span-2">
                <label className="block mb-2">Заметки</label>
                <textarea
                  placeholder="Добавьте комментарий к записи"
                  value={physicalData.notes}
                  onChange={(e) => {
                    setPhysicalData({ ...physicalData, notes: e.target.value })
                    setNotice(null)
                  }}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {sanResults === null && currentQuestionData && (
          <div className="bg-card rounded-xl shadow-sm border border-border p-8">
            <h2 className="mb-2">Тест психологического состояния (САН)</h2>
            <p className="text-muted-foreground mb-8">Оцените своё состояние по шкале</p>

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
                      type="button"
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
                  style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
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

            <div className="mt-6 grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => void handleSaveRecord()}
                disabled={isSavingRecord}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70"
              >
                <Save className="w-5 h-5" />
                {isSavingRecord ? 'Сохраняем...' : 'Сохранить данные'}
              </button>

              <button
                type="button"
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
