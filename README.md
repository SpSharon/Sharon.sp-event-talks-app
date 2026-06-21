# BigQuery Release Notes Hub 🚀

A premium, modern web application that fetches, parses, and displays official BigQuery Release Notes, allowing you to easily browse updates and share them directly to Twitter/X.

Built with **Python Flask** (backend) and **Vanilla HTML, CSS, and JavaScript** (frontend).

---

## ✨ Features

- 🔍 **Real-Time Search**: Search through release note summaries, categories, or dates instantly.
- 🏷️ **Category Filter Tabs**: Categorized filtering (Features, Announcements, Bug Fixes, Deprecations) with customized color-coded badges.
- ✂️ **Smart Parsing**: Google's official feed groups daily updates together; the backend automatically splits them by category into clean, individual update cards.
- 🪟 **Premium Glassmorphic UI**: High-fidelity dark mode dashboard styled with HSL colors, smooth translations, glowing borders, and skeleton loading screens.
- 🐦 **Interactive Twitter Composer**:
  - Automatically formats the update text with relevant hashtags and links.
  - Dynamically calculates the character count (max 280), adapting to Twitter's URL-shortening policy.
  - Features an animated SVG character progress ring that changes colors (blue ➡️ orange ➡️ red) and disables submitting if the limit is exceeded.
  - Launches Twitter Web Intent in a new browser tab.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.14+, Flask
- **Frontend**: HTML5, Vanilla CSS3, Vanilla ES6 JavaScript
- **Icons**: FontAwesome 6 (CDN)
- **Fonts**: Google Fonts (`Outfit` & `Plus Jakarta Sans`)

---

## 📦 Project Structure

```
bigquery_releases_app/
├── app.py                 # Flask server, Atom feed proxy, and regex text parser
├── templates/
│   └── index.html         # Main dashboard page layout and tweet composer modal
├── static/
│   ├── css/
│   │   └── style.css      # Custom dark-theme styling, glassmorphism, animations
│   └── js/
│       └── app.js         # State management, search, filtering, and Twitter Composer
└── .gitignore             # Standard gitignore configurations for Python/Flask
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have **Python 3** installed on your system.

### 1. Clone the repository (or navigate to the folder)
```bash
cd C:\Users\sharo\bigquery_releases_app
```

### 2. Install dependencies
Install Flask using `pip`:
```bash
pip install flask
```

### 3. Run the application
Start the Flask development server:
```bash
python app.py
```

### 4. Open in browser
Open your browser and navigate to:
🔗 **[http://127.0.0.1:5000/](http://127.0.0.1:5000/)**

---

## 💡 How It Works under the Hood

1. **Proxy Feed Fetching**: The browser calls the `/api/releases` endpoint. The Flask backend fetches the RSS feed (`bigquery-release-notes.xml`) directly, resolving CORS issues.
2. **Regex Divider**: The backend splits daily consolidated entries into individual item updates using a regex splitter targeting HTML `<h3>` tags.
3. **Plain Text Cleaning**: Strips HTML tags and unescapes XML entities so that the Twitter composer gets a perfectly clean text block.
4. **Local State Filtering**: The client stores all releases in memory and executes keyword searches and chip filters on the fly.
