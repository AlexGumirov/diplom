import type { AppBootstrap, PhysicalPayload, SANAnswerSubmission } from './types'

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp(`(^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[2]) : ''
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
      message = JSON.stringify(payload)
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

export function submitSanTest(date: string, answers: SANAnswerSubmission[]) {
  return request('/app-api/san/', {
    method: 'POST',
    body: JSON.stringify({ date, answers }),
  })
}
