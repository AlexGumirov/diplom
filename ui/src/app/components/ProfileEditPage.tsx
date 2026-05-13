import { useEffect, useState } from 'react'
import { Save, Upload, CheckCircle, AlertTriangle } from 'lucide-react'

import { ImageWithFallback } from './figma/ImageWithFallback'
import type { Profile, ProfilePayload } from '../types'

interface ProfileData {
  displayName: string
  age: string
  gender: string
  sport: string
  avatar: string
}

interface ProfileEditPageProps {
  profile: Profile
  onSave: (payload: ProfilePayload) => Promise<void>
}

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=200&h=200&fit=crop'

function profileToForm(profile: Profile): ProfileData {
  return {
    displayName: profile.display_name,
    age: profile.age === null ? '' : String(profile.age),
    gender: profile.gender_value || '',
    sport: profile.sport || '',
    avatar: DEFAULT_AVATAR,
  }
}

export function ProfileEditPage({ profile, onSave }: ProfileEditPageProps) {
  const [profileData, setProfileData] = useState<ProfileData>(() => profileToForm(profile))
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [previewAvatar, setPreviewAvatar] = useState(profileData.avatar)

  useEffect(() => {
    const nextProfileData = profileToForm(profile)
    setProfileData(nextProfileData)
    setPreviewAvatar(nextProfileData.avatar)
  }, [profile])

  const validateAge = () => {
    if (!profileData.age.trim()) {
      return null
    }
    const age = Number(profileData.age)
    if (!Number.isInteger(age) || age < 5 || age > 100) {
      return 'Возраст должен быть целым числом от 5 до 100.'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ageError = validateAge()
    if (ageError) {
      setError(ageError)
      return
    }

    setIsSaving(true)
    setError('')
    setIsSaved(false)
    try {
      await onSave({
        display_name: profileData.displayName.trim(),
        age: profileData.age.trim() ? Number(profileData.age) : null,
        gender: profileData.gender,
        sport: profileData.sport.trim(),
      })
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить профиль.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setPreviewAvatar(result)
        setProfileData({ ...profileData, avatar: result })
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="mb-8">Редактирование профиля</h1>

        <div className="bg-card rounded-xl shadow-sm border border-border p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
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

            <div className="space-y-6">
              <div>
                <label className="block mb-2">Имя</label>
                <input
                  type="text"
                  value={profileData.displayName}
                  onChange={(e) =>
                    setProfileData({ ...profileData, displayName: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Введите имя"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block mb-2">Возраст</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    step="1"
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
                    <option value="">Не указан</option>
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

            {error && (
              <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border-2 border-red-500 rounded-lg p-4 text-red-700 dark:text-red-300">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm break-words">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSaved ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Сохранено
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 bg-accent/30 rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground">
            Изменения профиля сохраняются и будут отображаться во всех разделах приложения.
          </p>
        </div>
      </div>
    </div>
  )
}
