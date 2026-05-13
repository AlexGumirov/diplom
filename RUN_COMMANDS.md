# Команды для запуска проекта

## 1. Перейти в папку проекта

```bash
cd /Users/apple/Desktop/diplom
```

## 2. Создать виртуальное окружение

```bash
python3 -m venv .venv
```

## 3. Активировать виртуальное окружение

```bash
source .venv/bin/activate
```

## 4. Установить зависимости backend

```bash
pip install -r requirements.txt
```

## 5. Установить зависимости frontend

```bash
cd ui
npm install
cd ..
```

## 6. Применить миграции

```bash
python3 manage.py makemigrations
python3 manage.py migrate
```

## 7. Создать администратора

```bash
python3 manage.py createsuperuser
```

## 8. Собрать frontend

```bash
cd ui
npm run build
cd ..
```

## 9. Запустить Django-сервер

```bash
python3 manage.py runserver 127.0.0.1:8001
```

## 10. Открыть проект в браузере

```text
http://127.0.0.1:8001/
```

## 11. Страница авторизации

```text
http://127.0.0.1:8001/login/
```

