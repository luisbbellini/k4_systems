#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "╔══════════════════════════════════╗"
echo "║         K4 Monitor v1.0          ║"
echo "╚══════════════════════════════════╝"
echo ""

# Backend
echo "→ Instalando dependências do backend..."
cd "$ROOT/backend"
pip install -r requirements.txt -q

echo "→ Iniciando backend (porta 8000)..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Frontend
echo "→ Instalando dependências do frontend..."
cd "$ROOT/frontend"
npm install -q

echo "→ Iniciando frontend (porta 5173)..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✓ Backend:  http://localhost:8000"
echo "✓ Frontend: http://localhost:5173"
echo "✓ API Docs: http://localhost:8000/docs"
echo ""
echo "Pressione Ctrl+C para parar tudo."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
