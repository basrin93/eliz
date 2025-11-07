#!/bin/bash

echo "Запуск Frontend сервера..."
cd frontend

echo "Frontend запущен на http://localhost:8000"
echo "Откройте браузер и перейдите по адресу: http://localhost:8000"
python3 -m http.server 8000
