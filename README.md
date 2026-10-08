# 📊 BigQuery Release Notes Hub & Social Sharing Platform

A full-stack, real-time analytics dashboard and social publishing web application built with **Python Flask** and **Vanilla HTML5, CSS3, & JavaScript**.

The application automatically fetches, parses, categorizes, and displays official Google Cloud BigQuery release notes from their Atom XML feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`). It includes real-time keyword search, category navigation filters, an offline backup XML fallback engine, and a client-side **Tweet Composer** using the official Twitter Web Intent API.

---

## ✨ Key Features

- ⚡ **Automated Entry Parsing**: Splits daily Atom feed entries containing multiple updates into individual category-specific cards (*Feature*, *Announcement*, *Security*, *Change*, *Breaking*).
- 🛡️ **Multi-Tier Resilience & Caching**: Uses a 5-minute memory cache (`CACHE_DURATION_SECONDS = 300`) and falls back to a local XML dataset (`feed_fallback.xml`) if GCP rate-limits requests (`HTTP 429`).
- 🔍 **Real-Time Keyword Search**: Instantly filters updates as you type keywords, dates, or SQL functions (e.g. `ML.CORRELATION`, `AI.AGG`).
- 🏷️ **Categorized Navigation**: Sidebar category tabs with live item counter badges.
- 🐦 **Smart Tweet Composer**: Pre-formats release note summaries, calculates remaining character budget (280-char limit), and launches Twitter's Web Intent URL for seamless sharing.
- 🌙 **Dark-Mode Glassmorphic UI**: Built with Google Cloud design tokens, skeleton loading animations, responsive cards, and toast notification alerts.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.12+, Flask 3.1.3
- **Parsing Engine**: BeautifulSoup4 4.15, lxml, ElementTree
- **HTTP Client**: Requests 2.34.2
- **Frontend**: Vanilla HTML5, CSS3 (Glassmorphic Dark Mode), JavaScript (ES6+)
- **Icons & Fonts**: Lucide Icons, Google Fonts (`Inter`, `Outfit`, `JetBrains Mono`)
- **APIs**: Google Cloud BigQuery Atom XML Feed, Twitter/X Web Intent API

---

## 📁 Project Structure

```
bigquery-release-notes-app/
├── app.py                     # Flask server, REST API (/api/notes), and XML parser
├── feed_fallback.xml          # Offline backup XML dataset
├── requirements.txt           # Python dependencies
├── .gitignore                 # Files excluded from Git version control
├── README.md                  # Project documentation
├── templates/
│   └── index.html             # Main dashboard template & Tweet Composer modal
└── static/
    ├── css/
    │   └── styles.css         # Dark theme glassmorphic styles
    └── js/
        └── app.js             # Client state, search filter, and Twitter Intent logic
```

---

## 🚀 Local Setup & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR-USERNAME/bigquery-release-notes-app.git
cd bigquery-release-notes-app
```

### 2. Create & Activate Virtual Environment
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Application
```bash
python app.py
```
Open your browser and navigate to **`http://127.0.0.1:5000`**.

---

## 📄 Academic Project Details

* **Institution**: V.V.P. Engineering College, Rajkot (Gujarat Technological University)
* **Subject**: Summer Internship / Mini Project (B.E. Semester-VII, Information Technology)
* **Academic Year**: 2026-27
* **Author**: Nikita Dafda (Enrollment No: 230470116080)
* **Guidance**: Prof. Hemangi Joshi & Dr. Darshana H. Patel (HOD)
