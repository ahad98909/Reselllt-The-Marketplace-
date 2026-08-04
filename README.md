# ResellIt - The Premium Second-Hand Marketplace

A full-stack marketplace web application built with **FastAPI** (Python), **React + Vite** (JavaScript), **TailwindCSS** (styling), and **MySQL** (database). It supports user authentication, product listings, categories, real-time WebSocket messaging, reviews, notifications, escrow transaction simulations, and admin dashboard controls.

---

## Key Project Features

### 1. Interactive Location Maps (Leaflet.js & OpenStreetMap)
* **Library Used**: Integrated using **Leaflet.js** (via script/CSS headers inside `index.html` and direct window `window.L` instantiation in React views like `MapPickerModal.jsx` and `Chat.jsx`).
* **Geocoding & Location Pinning**: When registering or listing a product, users can search for an address or click directly on the interactive map. The application forwards these queries to a secure backend reverse-geocoding proxy that queries the **OpenStreetMap (Nominatim)** service, returning coordinates and address names localized to Pakistan (`countrycodes=pk`).
* **Dynamic Safe Meetup Spots**: Inside the chat safe meetup planner, the map centers on the exact geographical midpoint coordinate between the buyer and the seller. The frontend triggers live queries to the **OpenStreetMap Overpass API**, locating nearby restaurants, cafes, hotels, malls, and public parks within a `2.5 km` radius, rendering them as selectable pins.

### 2. AI-Powered Semantic Search & Proximity Sorting
* **Semantic Query Matching**: Users can search using natural descriptive queries (e.g., "lightweight gaming computer") rather than exact keywords.
* **Proximity Calculation**: The database calculates the distance (in kilometers) between the user and the listings dynamically on query using the mathematical **Haversine formula**, sorting listings to show the closest matching items first.

### 3. AI-Powered Auto-Autofill Descriptions
* **Context-Aware Templates**: When listing an item, clicking the "AI Autofill" button triggers backend template evaluation that analyzes the title keywords and category tags to output tailored product descriptions (such as grip details for sports gear, configurations for laptops, or battery health metrics for phones).

### 4. Auto-Bargaining Slips & Escrow Security
* **Live Chat Bargains**: Buyers can send numerical offer slips inside the chat screen. The backend automatically accepts the offer or calculates midpoint counter-offers against the seller's secret minimum price.
* **Escrow Locks & Dispute Handling**: Transaction funds can be locked in a secure simulated escrow state. In case of damaged deliveries, buyers can upload evidence to initiate a dispute, which locks the chat and forwards the claims to administrators.

### 5. Installable PWA Mobile Experience
* Configured with a `manifest.json` and a service worker `sw.js` for stand-alone home screen installation on mobile devices.

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
   * **FastAPI Swagger Docs**: Open [http://localhost:8000/docs](http://localhost:8000/docs) to view the API endpoints.
   * **Database**: MySQL is exposed on host port `3306` with username `root` and password `rootpassword`.

---

## Method 2: Running Locally (Manual Host Installation)

### 1. Database Setup
1. Start a local MySQL instance (port `3306`).
2. Log into MySQL and run the initialization script located at `database/init.sql` to create database schemas:
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
4. Create a `.env` file in the `backend/` directory or export variables:
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
