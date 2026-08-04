# Second-Hand Marketplace Application

A full-stack marketplace web application built with **FastAPI** (Python), **React + Vite** (JavaScript), **TailwindCSS** (styling), and **MySQL** (database). It includes user authentication, product listings, categories, real-time WebSocket messaging, reviews, notifications, transaction/escrow simulations, and admin dashboard controls.

---

## Method 1: Running with Docker Compose (Recommended)

This is the simplest way to run the entire stack (Database, Backend, and Frontend) with zero installation required on your host machine except for Docker.

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### Steps to Run
1. Open a terminal/command prompt at the project root directory.
2. Run the following command to start all services:
   ```bash
   docker compose up --build
   ```
3. Once the containers are built and running:
   * **Frontend Web UI**: Open [http://localhost:5173](http://localhost:5173) in your browser.
   * **FastAPI Swagger Docs**: Open [http://localhost:8000/docs](http://localhost:8000/docs) in your browser to test and view the API endpoints.
   * **Database**: MySQL is exposed on host port `3306` with username `root` and password `rootpassword`.

---

## Method 2: Running Locally (Manual Host Installation)

If you prefer to run the services individually on your local system, follow the steps below.

### 1. Database Setup
1. Install and start a local MySQL instance (port `3306`).
2. Log into MySQL and run the initialization script located at `database/init.sql` to create the database schemas and populate seed data:
   ```bash
   mysql -u root -p < database/init.sql
   ```

### 2. Backend Setup (FastAPI)
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend/` directory or export the following environment variables:
   ```env
   MYSQL_HOST=localhost
   MYSQL_USER=root
   MYSQL_PASSWORD=your_mysql_password
   MYSQL_DB=marketplace
   MYSQL_PORT=3306
   SECRET_KEY=supersecretkeychangeinproduction12345
   ```
5. Run the backend server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### 3. Frontend Setup (React + Vite)
1. Navigate to the `frontend` folder:
   ```bash
   cd ../frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the web interface at [http://localhost:5173](http://localhost:5173).

---

## Seed Accounts (Authentication Details)

All seeded users have the password: **`password123`**

| Role / User | Email | Description |
| :--- | :--- | :--- |
| **System Administrator** | `admin@marketplace.com` | Access to admin dashboard, report resolution, banning users |
| **Alice Smith** | `alice@marketplace.com` | Seed user with active listings |
| **Bob Johnson** | `bob@marketplace.com` | Seed user with active listings and chats |
| **Charlie Brown** | `charlie@marketplace.com` | Unverified / new seed user |
