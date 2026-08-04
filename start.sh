#!/bin/bash

# Auto-instalar si no hay node_modules
if [ ! -d "node_modules" ]; then
    echo "⚔️  Primera ejecución — instalando dependencias..."
    npm install
fi

node index.js "$@"
