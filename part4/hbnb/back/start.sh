#!/bin/bash
# Script pour lancer le backend HBnB
cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    echo "Création du venv..."
    python3 -m venv venv
fi

# Utiliser explicitement le Python du venv (évite "externally-managed-environment")
PY="${PWD}/venv/bin/python"
if [ ! -f "venv/bin/pip" ]; then
    echo "Ajout de pip dans le venv..."
    "$PY" -m ensurepip --upgrade
fi

if ! "$PY" -c "import flask" 2>/dev/null; then
    echo "Installation des dépendances..."
    "$PY" -m pip install -r requirements.txt
fi

echo "Démarrage du serveur sur http://127.0.0.1:5000/"
"$PY" run.py
