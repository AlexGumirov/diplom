import { useState } from 'react'
import { BookOpen } from 'lucide-react'

import { ImageWithFallback } from './figma/ImageWithFallback'
import { EntryDetailModal } from './EntryDetailModal'
import type { Profile, RecordItem } from '../types'
import { type DiaryEntry, formatShortDate, recordToDiaryEntry } from '../lib/records'

interface ProfilePageProps {
  profile: Profile
  records: RecordItem[]
  onViewDiary: () => void
}

export function ProfilePage({ profile, records, onViewDiary }: ProfilePageProps) {
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null)
  const diaryEntries = records.map(recordToDiaryEntry).filter((entry): entry is DiaryEntry => entry !== null)

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
                  <span className="ml-2">{profile.age ? `${profile.age} лет` : '—'}</span>
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
          <div className="flex items-center justify-between mb-4">
            <h2>Дневник</h2>
            <button
              onClick={onViewDiary}
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Посмотреть все записи
            </button>
          </div>

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
                {diaryEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                    <td className="py-4 px-4">{formatShortDate(entry.date)}</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
                        {entry.physical}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
                        {entry.psychology}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground">
                        {entry.overall}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => setSelectedEntry(entry)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                      >
                        Открыть запись
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {diaryEntries.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Пока нет полностью сохраненных записей.</p>
            </div>
          )}
        </div>

        <EntryDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      </div>
    </div>
  )
}
