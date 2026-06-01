# Eldercare AI

A prototype web application for elderly care, designed to provide intelligent assistance, monitoring, and an accessible interface. This project features a React (Vite) frontend and a Laravel backend API.

## Features
- **Intelligent Monitoring**: Keep track of daily routines and basic health metrics.
- **Accessible Interface**: A simplified and easy-to-use UI designed specifically for elderly users.
- **Real-time Assistance**: AI-powered features to help with daily tasks and reminders.

## Getting Started

### 1. Backend Setup (Laravel)

Navigate to the `backend` directory and install the PHP dependencies:
```bash
cd backend
composer install
```

Set up your environment variables:
```bash
cp .env.example .env
php artisan key:generate
```

Run the database migrations:
```bash
php artisan migrate
```

Start the Laravel development server:
```bash
php artisan serve
```
The API will be available at `http://localhost:8000`.

### 2. Frontend Setup (React/Vite)

Open a new terminal window, navigate to the root directory, and install the Node dependencies:
```bash
npm install
```

Start the Vite development server:
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) (or the port specified in your terminal) with your browser to see the result.
