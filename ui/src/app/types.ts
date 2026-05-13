export type Page =
  | 'profile'
  | 'psychology'
  | 'physics'
  | 'overall'
  | 'dataEntry'
  | 'profileEdit'
  | 'statistics'
  | 'diary'

export interface Profile {
  id: number
  username: string
  display_name: string
  age: number | null
  gender: string
  gender_value: string
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
  notes: string
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

export type PeriodFilter = '7' | '14' | '31' | 'all' | 'neighbors'
export type CorrelationPeriod = '7' | '14' | '31' | 'all'

export interface NeighborDelta {
  from_date: string
  to_date: string
  previous_score: number
  current_score: number
  delta: number
  status: 'improvement' | 'deterioration' | 'stable'
}

export interface AggregatedDelta {
  period_start?: string
  period_end?: string
  days_count?: number
  first_score?: number
  last_score?: number
  total_delta: number | null
  status: 'improvement' | 'deterioration' | 'stable' | 'insufficient_data'
  message?: string
}

export interface PeriodDeltaAnalysis {
  period: PeriodFilter
  aggregated: AggregatedDelta
  neighbors?: NeighborDelta[]
}

export type DeltaAnalysisByPeriod = Record<PeriodFilter, PeriodDeltaAnalysis>

export interface DeltaAnalysisByMetric {
  overall: DeltaAnalysisByPeriod
  physical: DeltaAnalysisByPeriod
  psychological: DeltaAnalysisByPeriod
}

export interface SANQuestion {
  number: number
  left_text: string
  right_text: string
}

export type CorrelationStatus = 'ok' | 'insufficient_data'
export type CorrelationDirection = 'positive' | 'negative' | 'none'
export type CorrelationStrength = 'weak' | 'moderate' | 'strong'

export interface CorrelationItem {
  left_key: string
  left_label: string
  right_key: string
  right_label: string
  correlation: number
  abs_correlation: number
  strength: CorrelationStrength
  strength_label: string
  direction: CorrelationDirection
  direction_label: string
  message: string
}

export interface CorrelationReport {
  status: CorrelationStatus
  records_count: number
  method: 'pearson'
  min_required_records: number
  items: CorrelationItem[]
  message?: string
}

export type AnomalyStatus = 'ok' | 'warning' | 'insufficient_data'
export type AnomalyDirection = 'above' | 'below'

export interface AnomalyItem {
  key: string
  label: string
  raw_current_value: number
  raw_mean_value: number
  raw_difference: number
  normalized_current_value: number
  normalized_mean_value: number
  unit: string
  abs_difference: number
  direction: AnomalyDirection
  direction_label: string
  severity: 'high'
  message: string
}

export interface AnomalyReport {
  status: AnomalyStatus
  records_count: number
  min_required_records: number
  method?: 'Isolation Forest'
  is_anomaly?: boolean
  anomaly_score?: number
  last_record_date?: string
  model_summary?: string
  items: AnomalyItem[]
  message?: string
}

export interface AppBootstrap {
  profile: Profile
  records: RecordItem[]
  latest_delta: DeltaInfo | null
  delta_analysis: DeltaAnalysisByMetric
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

export interface CompleteRecordPayload {
  date: string
  notes: string
  physical_data: Omit<PhysicalPayload, 'date'>
  answers: SANAnswerSubmission[]
}

export interface SANAnswerSubmission {
  question_number: number
  value: number
}

export interface ProfilePayload {
  display_name: string
  age: number | null
  gender: string
  sport: string
}
