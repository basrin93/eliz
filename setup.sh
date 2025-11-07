#!/bin/bash

echo "=========================================="
echo "Установка приложения 'Портал для врачей'"
echo "=========================================="
echo ""

# Создание виртуального окружения
echo "1. Создание виртуального окружения..."
cd backend
python3 -m venv venv
source venv/bin/activate

# Установка зависимостей
echo "2. Установка зависимостей..."
pip install -r requirements.txt

# Создание .env файла
if [ ! -f ".env" ]; then
    echo "3. Создание файла конфигурации..."
    cp .env.example .env
    echo "   ВАЖНО: Отредактируйте backend/.env и установите свои секретные ключи!"
else
    echo "3. Файл .env уже существует"
fi

cd ..

echo ""
echo "=========================================="
echo "Установка завершена!"
echo "=========================================="
echo ""
echo "Для запуска приложения:"
echo "1. Запустите backend:  ./run_backend.sh"
echo "2. Запустите frontend: ./run_frontend.sh"
echo "   (в отдельном терминале)"
echo ""
echo "Или используйте: chmod +x *.sh && ./run_backend.sh"
echo ""
