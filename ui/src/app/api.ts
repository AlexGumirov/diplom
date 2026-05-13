import type {
  AnomalyReport,
  AppBootstrap,
  CompleteRecordPayload,
  CorrelationPeriod,
  CorrelationReport,
  PhysicalPayload,
  ProfilePayload,
  SANAnswerSubmission,
} from './types'

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp(`(^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[2]) : ''
}

function flattenErrors(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value]
  }
  if (Array.isArray(value)) {
    return value.flatMap(flattenErrors)
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([field, messages]) =>
      flattenErrors(messages).map((message) => `${field}: ${message}`)
    )
  }
  return []
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object' && 'errors' in payload) {
    const messages = flattenErrors((payload as { errors: unknown }).errors)
    if (messages.length > 0) {
      return messages.join('\n')
    }
  }
  if (payload && typeof payload === 'object' && 'message' in payload) {
    return String((payload as { message: unknown }).message)
  }
  return fallback
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(options.method && options.method !== 'GET' ? { 'X-CSRFToken': getCookie('csrftoken') } : {}),
      ...options.headers,
    },
    ...options,
  })

  const rawBody = await response.text()
  const parseJson = () => {
    if (!rawBody) {
      return null
    }
    try {
      return JSON.parse(rawBody)
    } catch {
      return null
    }
  }

  if (!response.ok) {
    let message = 'Не удалось выполнить запрос.'
    const payload = parseJson()
    if (payload) {
      message = getErrorMessage(payload, JSON.stringify(payload))
    } else if (rawBody) {
      message = rawBody
    }
    throw new Error(message)
  }

  return (parseJson() ?? {}) as T
}

export function fetchBootstrap() {
  return request<AppBootstrap>('/app-api/bootstrap/')
}

export function savePhysicalData(payload: PhysicalPayload) {
  return request('/app-api/physical/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function saveCompleteRecord(payload: CompleteRecordPayload) {
  return request('/app-api/records/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function submitSanTest(date: string, answers: SANAnswerSubmission[]) {
  return request('/app-api/san/', {
    method: 'POST',
    body: JSON.stringify({ date, answers }),
  })
}

export function fetchCorrelations(period: CorrelationPeriod, topN = 3) {
  return request<CorrelationReport>(`/app-api/correlations/?period=${period}&top_n=${topN}`)
}

export function fetchAnomalies() {
  return request<AnomalyReport>('/app-api/anomalies/')
}

export function saveProfile(payload: ProfilePayload) {
  return request('/app-api/profile/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
