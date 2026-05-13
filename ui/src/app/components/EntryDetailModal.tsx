import { X } from 'lucide-react';

interface EntryDetail {
  id: number;
  date: string;
  physical: number;
  psychology: number;
  overall: number;
  notes?: string;
  // Физические показатели
  sleep: number;
  meals: number;
  restingHR: number;
  exerciseHR: number;
  recovery: string;
  fatigue: number;
  rpe: number;
  // САН показатели
  wellbeing: number;
  activity: number;
  mood: number;
}

interface EntryDetailModalProps {
  entry: EntryDetail | null;
  onClose: () => void;
}

export function EntryDetailModal({ entry, onClose }: EntryDetailModalProps) {
  if (!entry) return null;

  const getStatusText = (value: number) => {
    if (value < 4) return 'Плохое состояние';
    if (value > 5.5) return 'Хорошее состояние';
    return 'Нормальное состояние';
  };

  const getStatusColor = (value: number) => {
    if (value < 4) return 'text-red-600';
    if (value > 5.5) return 'text-green-600';
    return 'text-yellow-600';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-card rounded-xl shadow-lg border border-border max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Заголовок */}
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
          <div>
            <h2>Запись от {new Date(entry.date).toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            })}</h2>
            {entry.notes && (
              <p className="text-sm text-muted-foreground mt-1 italic">{entry.notes}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-accent flex items-center justify-center transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Общие оценки */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-accent/30 rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Физика</p>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-2">
                <span className="text-2xl">{entry.physical}</span>
              </div>
            </div>

            <div className="bg-accent/30 rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Психология</p>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-2">
                <span className="text-2xl">{entry.psychology}</span>
              </div>
            </div>

            <div className="bg-accent/30 rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Общая оценка</p>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground mb-2">
                <span className="text-2xl">{entry.overall}</span>
              </div>
            </div>
          </div>

          {/* Физические показатели */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="mb-4">Физические показатели</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex justify-between items-center p-3 bg-accent/30 rounded-lg">
                <span className="text-muted-foreground">Сон (часы)</span>
                <span className="font-medium">{entry.sleep}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-accent/30 rounded-lg">
                <span className="text-muted-foreground">Приемы пищи</span>
                <span className="font-medium">{entry.meals}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-accent/30 rounded-lg">
                <span className="text-muted-foreground">ЧСС в покое</span>
                <span className="font-medium">{entry.restingHR} уд/мин</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-accent/30 rounded-lg">
                <span className="text-muted-foreground">ЧСС при нагрузке</span>
                <span className="font-medium">{entry.exerciseHR} уд/мин</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-accent/30 rounded-lg">
                <span className="text-muted-foreground">Восстановление</span>
                <span className="font-medium">{entry.recovery}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-accent/30 rounded-lg">
                <span className="text-muted-foreground">Усталость</span>
                <span className="font-medium">{entry.fatigue}/10</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-accent/30 rounded-lg col-span-2">
                <span className="text-muted-foreground">RPE</span>
                <span className="font-medium">{entry.rpe}/10</span>
              </div>
            </div>
          </div>

          {/* Результаты САН */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="mb-4">Результаты психологического состояния (САН)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-accent/30 rounded-lg p-6 text-center">
                <h4 className="mb-3">Самочувствие</h4>
                <div className="text-3xl mb-2">{entry.wellbeing}</div>
                <p className={`text-sm ${getStatusColor(entry.wellbeing)}`}>
                  {getStatusText(entry.wellbeing)}
                </p>
              </div>

              <div className="bg-accent/30 rounded-lg p-6 text-center">
                <h4 className="mb-3">Активность</h4>
                <div className="text-3xl mb-2">{entry.activity}</div>
                <p className={`text-sm ${getStatusColor(entry.activity)}`}>
                  {getStatusText(entry.activity)}
                </p>
              </div>

              <div className="bg-accent/30 rounded-lg p-6 text-center">
                <h4 className="mb-3">Настроение</h4>
                <div className="text-3xl mb-2">{entry.mood}</div>
                <p className={`text-sm ${getStatusColor(entry.mood)}`}>
                  {getStatusText(entry.mood)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Футер */}
        <div className="border-t border-border p-6">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
