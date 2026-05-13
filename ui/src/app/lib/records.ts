import type { RecordItem } from '../types'

export interface DiaryEntry {
  id: number
  date: string
  physical: number
  psychology: number
  overall: number
  notes?: string
  sleep: number
  meals: number
  restingHR: number
  exerciseHR: number
  recovery: string
  fatigue: number
  rpe: number
  wellbeing: number
  activity: number
  mood: number
}

export function formatScore(value: number) {
  return Number(value.toFixed(1))
}

export function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function recordToDiaryEntry(record: RecordItem): DiaryEntry | null {
  if (!record.physical_data || !record.psychological_data) {
    return null
  }

  return {
    id: record.id,
    date: record.date,
    physical: formatScore(record.physical_score ?? 0),
    psychology: formatScore(record.psychological_score ?? 0),
    overall: formatScore(record.total_score ?? 0),
    sleep: record.physical_data.sleep_hours,
    meals: record.physical_data.meals,
    restingHR: record.physical_data.heart_rate_rest,
    exerciseHR: record.physical_data.heart_rate_load,
    recovery: String(record.physical_data.recovery_time),
    fatigue: record.physical_data.fatigue,
    rpe: record.physical_data.rpe,
    wellbeing: record.psychological_data.wellbeing,
    activity: record.psychological_data.activity,
    mood: record.psychological_data.mood,
  }
}

