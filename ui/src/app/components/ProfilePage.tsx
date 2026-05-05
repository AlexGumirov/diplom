import { ImageWithFallback } from './figma/ImageWithFallback'

import type { Profile, RecordItem } from '../types'

interface ProfilePageProps {
  profile: Profile
  records: RecordItem[]
  onOpenEntry: (id: number) => void
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatScore(value: number | null) {
  return value === null ? '—' : Number(value.toFixed(1)).toString()
}

export function ProfilePage({ profile, records, onOpenEntry }: ProfilePageProps) {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-card rounded-lg shadow-sm border border-border p-8 mb-6">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <ImageWithFallback
                src=""
                alt="Фото профиля"
                className="w-32 h-32 rounded-full object-cover border-4 border-primary/10"
              />
            </div>

            <div className="flex-grow">
              <h1 className="mb-4">{profile.display_name}</h1>

              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <div>
                  <span className="text-muted-foreground">Возраст:</span>
                  <span className="ml-2">{profile.age ?? '—'}{profile.age ? ' лет' : ''}</span>
                </div>

                <div>
                  <span className="text-muted-foreground">Пол:</span>
                  <span className="ml-2">{profile.gender || '—'}</span>
                </div>

                <div className="col-span-2">
                  <span className="text-muted-foreground">Вид спорта:</span>
                  <span className="ml-2">{profile.sport || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <h2 className="mb-4">Дневник</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4">Дата записи</th>
                  <th className="text-left py-3 px-4">Физика</th>
                  <th className="text-left py-3 px-4">Психология</th>
                  <th className="text-left py-3 px-4">Общая оценка</th>
                  <th className="text-left py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {records.map((entry) => (
                  <tr key={entry.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                    <td className="py-4 px-4">{formatDate(entry.date)}</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
                        {formatScore(entry.physical_score)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
                        {formatScore(entry.psychological_score)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center justify-center min-w-10 h-10 px-2 rounded-full bg-primary text-primary-foreground">
                        {formatScore(entry.total_score)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => onOpenEntry(entry.id)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                      >
                        Открыть запись
                      </button>
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 px-4 text-center text-muted-foreground">
                      Пока нет записей. Начни с заполнения данных спортсмена.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
