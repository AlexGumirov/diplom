# Минимальный запуск проекта

```bash
cd /Users/apple/Desktop/diplom
source .venv/bin/activate
cd ui
npm run build
cd ..
python3 manage.py migrate
python3 manage.py runserver 127.0.0.1:8001
```

## Открыть в браузере

```text
http://127.0.0.1:8001/
```

## Авторизация

```text
http://127.0.0.1:8001/login/
```

