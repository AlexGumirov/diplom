import { useState } from 'react';
import { Save, Upload, CheckCircle } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ProfileData {
  nickname: string;
  age: string;
  gender: string;
  sport: string;
  avatar: string;
}

export function ProfileEditPage() {
  const [profileData, setProfileData] = useState<ProfileData>({
    nickname: 'Александр Иванов',
    age: '28',
    gender: 'male',
    sport: 'Легкая атлетика',
    avatar: 'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=200&h=200&fit=crop',
  });

  const [isSaved, setIsSaved] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState(profileData.avatar);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreviewAvatar(result);
        setProfileData({ ...profileData, avatar: result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="mb-8">Редактирование профиля</h1>

        <div className="bg-card rounded-xl shadow-sm border border-border p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Аватар */}
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <ImageWithFallback
                  src={previewAvatar}
                  alt="Аватар профиля"
                  className="w-32 h-32 rounded-full object-cover border-4 border-primary/10"
                />
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-lg"
                >
                  <Upload className="w-5 h-5" />
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-sm text-muted-foreground">
                Нажмите на иконку для загрузки фото
              </p>
            </div>

            {/* Поля формы */}
            <div className="space-y-6">
              <div>
                <label className="block mb-2">Никнейм</label>
                <input
                  type="text"
                  value={profileData.nickname}
                  onChange={(e) =>
                    setProfileData({ ...profileData, nickname: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Введите никнейм"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block mb-2">Возраст</label>
                  <input
                    type="number"
                    value={profileData.age}
                    onChange={(e) =>
                      setProfileData({ ...profileData, age: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Введите возраст"
                  />
                </div>

                <div>
                  <label className="block mb-2">Пол</label>
                  <select
                    value={profileData.gender}
                    onChange={(e) =>
                      setProfileData({ ...profileData, gender: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="male">Мужской</option>
                    <option value="female">Женский</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-2">Вид спорта</label>
                <input
                  type="text"
                  value={profileData.sport}
                  onChange={(e) =>
                    setProfileData({ ...profileData, sport: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Введите вид спорта"
                />
              </div>
            </div>

            {/* Кнопка сохранения */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              {isSaved ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Сохранено
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Сохранить изменения
                </>
              )}
            </button>
          </form>
        </div>

        {/* Информационная карточка */}
        <div className="mt-6 bg-accent/30 rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground">
            Изменения профиля сохраняются автоматически и будут отображаться во всех разделах приложения.
          </p>
        </div>
      </div>
    </div>
  );
}
