export type Page = 'profile' | 'psychology' | 'physics' | 'overall' | 'dataEntry'

export interface Profile {
  id: number
  username: string
  display_name: string
  age: number | null
  gender: string
  sport: string
}

export interface PhysicalDataRecord {
  sleep_hours: number
  meals: number
  heart_rate_rest: number
  heart_rate_load: number
  recovery_time: number
  fatigue: number
  rpe: number
}

export interface PsychologicalDataRecord {
  wellbeing: number
  activity: number
  mood: number
}

export interface RecordItem {
  id: number
  date: string
  created_at: string
  physical_score: number | null
  psychological_score: number | null
  total_score: number | null
  physical_data: PhysicalDataRecord | null
  psychological_data: PsychologicalDataRecord | null
}

export interface DeltaInfo {
  status: 'improvement' | 'deterioration' | 'stable' | 'insufficient_data'
  delta: number | null
  previous_date?: string
  current_date?: string
  message?: string
}

export interface SANQuestion {
  number: number
  left_text: string
  right_text: string
}

export interface AppBootstrap {
  profile: Profile
  records: RecordItem[]
  latest_delta: DeltaInfo | null
  questions: SANQuestion[]
}

export interface PhysicalPayload {
  date: string
  sleep_hours: number
  meals: number
  heart_rate_rest: number
  heart_rate_load: number
  recovery_time: string
  fatigue: number
  rpe: number
}

export interface SANAnswerSubmission {
  question_number: number
  value: number
}
