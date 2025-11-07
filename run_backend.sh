#!/bin/bash

echo "Запуск Backend сервера..."
cd backend

# Проверка виртуального окружения
if [ ! -d "venv" ]; then
    echo "Создание виртуального окружения..."
    python3 -m venv venv
fi

# Активация виртуального окружения
source venv/bin/activate

# Установка зависимостей если необходимо
pip install -q -r requirements.txt

# Запуск сервера
echo "Backend запущен на http://localhost:5000"
python app.py
