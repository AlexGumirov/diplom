import { useMemo, useState } from 'react'
import { Calendar, Filter } from 'lucide-react'

import { EntryDetailModal } from './EntryDetailModal'
import type { RecordItem } from '../types'
import { type DiaryEntry, recordToDiaryEntry } from '../lib/records'

interface DiaryPageProps {
  records: RecordItem[]
}

export function DiaryPage({ records }: DiaryPageProps) {
  const [filterMonth, setFilterMonth] = useState('all')
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null)

  const diaryEntries = useMemo(
    () => records.map(recordToDiaryEntry).filter((entry): entry is DiaryEntry => entry !== null),
    [records]
  )
  const monthOptions = useMemo(
    () =>
      Array.from(new Set(diaryEntries.map((entry) => entry.date.slice(0, 7)))).map((month) => ({
        value: month,
        label: new Date(`${month}-01`).toLocaleDateString('ru-RU', {
          month: 'long',
          year: 'numeric',
        }),
      })),
    [diaryEntries]
  )

  const filteredEntries =
    filterMonth === 'all' ? diaryEntries : diaryEntries.filter((entry) => entry.date.startsWith(filterMonth))
  const averageScore =
    filteredEntries.length > 0
      ? (filteredEntries.reduce((sum, entry) => sum + entry.overall, 0) / filteredEntries.length).toFixed(1)
      : '—'

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8" />
            <h1>Дневник тренировок</h1>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-4 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Все записи</option>
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <p className="text-sm text-muted-foreground mb-2">Всего записей</p>
            <p className="text-3xl">{filteredEntries.length}</p>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <p className="text-sm text-muted-foreground mb-2">Средняя оценка</p>
            <p className="text-3xl">{averageScore}</p>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <p className="text-sm text-muted-foreground mb-2">Записей с оценкой 7+</p>
            <p className="text-3xl">{filteredEntries.filter((entry) => entry.overall >= 7).length}</p>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <h2 className="mb-6">Все записи</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4">Дата записи</th>
                  <th className="text-left py-3 px-4">Физика</th>
                  <th className="text-left py-3 px-4">Психология</th>
                  <th className="text-left py-3 px-4">Общая оценка</th>
                  <th className="text-left py-3 px-4">Заметки</th>
                  <th className="text-left py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {new Date(entry.date).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </div>
                    </td>
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
                      <span className="text-sm text-muted-foreground">—</span>
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

          {filteredEntries.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Записей за выбранный период не найдено</p>
            </div>
          )}
        </div>

        <EntryDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      </div>
    </div>
  )
}
