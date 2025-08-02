#!/bin/bash

echo "🏠 Starting GutterSnap Application..."
echo "📧 Make sure to set up your email credentials in .env file"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  Creating .env file from template..."
    cat > .env << EOF
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Server Configuration
PORT=3000
EOF
    echo "✅ Please edit .env file with your email credentials"
    echo ""
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "🚀 Starting server on http://localhost:3000"
npm start