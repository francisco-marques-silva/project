# 🔬 Research Portal - Scientific Tools Platform

A **Node.js/Express** platform for scientific research with AI-powered article screening.

## 📋 Overview

The volume of scientific publications has grown exponentially, making it impossible for healthcare professionals and researchers to manually filter all relevant literature. This platform provides tools for systematic literature review.

### Main Features

- ✅ **Multi-database search** (PubMed, Scopus, Web of Science, Embase)
- ✅ **Automatic deduplication** across databases
- ✅ **AI-powered screening** (OpenAI GPT, Anthropic Claude, Google Gemini)
- ✅ **Excel import/export** with full article data
- ✅ **User authentication** with JWT
- ✅ **PostgreSQL database** for data persistence

---

## 📖 Modules

### 📊 Dashboard

The Dashboard is the user's home screen, providing a consolidated overview of their activity on the platform. It displays key metrics such as:

- Total number of **projects** created
- Total number of **API requests** made
- Total number of **searches** performed across databases
- Total number of **articles** stored
- Total number of **AI analyses** completed
- Recent activity feed with the latest actions taken by the user

### 📁 Projects

Projects are the central organizational unit of the platform. Each project represents a systematic review or research effort. Key characteristics:

- **Creation**: The user creates a project by providing a **description** and a **research question**.
- **Search storage**: All automated searches performed by the user are saved within the selected project.
- **Manual upload**: The user can manually add article metadata by typing it directly or uploading a **CSV** or **XLSX** file. The file itself is **not stored** in the system — only the extracted metadata is persisted.
- **AI analysis results**: The decisions made by the AI during title and abstract screening are stored within the project. The user can run **multiple analyses** on the same dataset within a project.
- **Article management**: Inside a project, the user can view all collected metadata, **remove individual articles** (observations), or **add new ones** manually.
- **Deletion**: The user can delete an entire project if it is no longer needed. This removes all associated data (searches, records, screening events).

All metadata are stored in **Supabase** (cloud PostgreSQL).

### 🔍 Search

The Search module allows the user to perform **automated searches** across scientific databases (PubMed, Scopus, Web of Science, Embase). The workflow is:

1. The user enters a **search query**, selects the **year range**, defines the **maximum number of articles**, and selects the **target project**.
2. The search is executed and results are saved **directly into the selected project** (stored in Supabase). No intermediate spreadsheet files are created.
3. After the search is completed, the user can view a **preview of the metadata** (title, authors, year, etc.) directly within the Search module.
4. For full access to all metadata, the user navigates to the **Projects** section, where they can:
   - View, filter, and browse all article metadata
   - **Remove** individual articles from the project
   - **Add** new articles manually

### 🤖 AI Analysis

The AI Analysis module handles **title and abstract screening** using large language models. The workflow is:

1. The user selects a **project** (which contains the articles to be screened).
2. The user selects the **AI model** (OpenAI GPT, Anthropic Claude, or Google Gemini).
3. The user provides the **PICO question** and **inclusion/exclusion criteria**.
4. Before running the full analysis, the user can:
   - Perform an **isolated test** on a single article to validate the configuration
   - **Preview the prompt** that will be sent to the AI
   - **Preview the JSON** structure of the request
5. When the user launches the full analysis, the process updates in **real time** — each time a response is received from the AI, the result is immediately displayed so the user can follow the screening decisions as they happen.
6. Once the analysis is complete, all screening decisions are saved **within the project**, linked to the corresponding articles.

### 📜 History

The History module provides a complete log of all actions performed by the user on the platform, including:

- Searches executed (with query, database, date, and result count)
- Projects created and modified
- AI analyses performed (with model, criteria, and results)
- Uploads and manual edits

This serves as an **audit trail** and allows the user to review and track their research activity over time.

---

## 🛠️ Tech Stack

- **Backend**: Node.js 18+ with Express.js
- **Database**: PostgreSQL 14+ with Sequelize ORM
- **Frontend**: Vanilla JavaScript with modern CSS
- **AI Providers**: OpenAI, Anthropic, Google Gemini

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ (tested with v24)
- PostgreSQL 14 or higher
- npm 11+

### Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment**:

Create/edit the `.env` file with your credentials:

```env
# Database - Choose ONE option:

# Option A: Local PostgreSQL
POSTGRES_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/mvp_db

# Option B: Supabase (cloud PostgreSQL)
# Get from: Supabase Dashboard -> Project Settings -> Database -> Connection string
# POSTGRES_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# LLM API Keys (at least one for AI screening)
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-api03-...
GEMINI_API_KEY=AIza...

# Database API Keys (optional - PubMed works without key)
PUBMED_API_KEY=
SCOPUS_API_KEY=
WOS_API_KEY=
EMBASE_API_KEY=

# JWT Secret (change in production!)
JWT_SECRET_KEY=your-super-secret-key-change-in-production
```

3. **Database setup**:

**Option A - Local PostgreSQL:**
```sql
-- In PostgreSQL (psql or pgAdmin):
CREATE DATABASE mvp_db;
```

**Option B - Supabase:**
1. Create a project at [supabase.com](https://supabase.com)
2. Go to Project Settings → Database
3. Copy the "Connection string" (Transaction mode recommended)
4. Paste as `POSTGRES_URL` in `.env`

4. **Start the server** (auto-syncs database):
```bash
# Using npm script
npm start

# Or directly with node
node src/server.js
```

5. **Open browser**: http://localhost:8000

---

## 📁 Project Structure

```
mvp/
├── src/
│   ├── api/              # Express route handlers
│   │   ├── auth.js       # Authentication routes
│   │   ├── databases.js  # Database search routes
│   │   ├── spreadsheets.js  # Spreadsheet CRUD
│   │   ├── analysis.js   # LLM screening routes
│   │   ├── dashboard.js  # Dashboard stats
│   │   ├── config.js     # Config/status endpoints
│   │   ├── backup.js     # Backup/restore
│   │   └── dataAnalysis.js  # Data Analysis module
│   ├── analysis/         # LLM integration
│   │   ├── llmCaller.js  # Unified LLM interface
│   │   └── providers/    # Provider implementations
│   │       ├── anthropicProvider.js
│   │       ├── openaiProvider.js
│   │       └── geminiProvider.js
│   │       ├── openaiProvider.js
│   │       └── geminiProvider.js
│   ├── auth/             # Authentication services
│   │   ├── models.js     # User model
│   │   └── service.js    # Auth logic & middleware
│   ├── core/             # Configuration & database
│   │   ├── config.js     # App configuration
│   │   └── database.js   # Sequelize connection
│   ├── models/           # Sequelize ORM models
│   │   ├── index.js      # Model exports & associations
│   │   ├── User.js
│   │   ├── Project.js
│   │   ├── Search.js
│   │   ├── Work.js
│   │   ├── Record.js
│   │   ├── ScreeningEvent.js
│   │   ├── Spreadsheet.js
│   │   └── Dataset.js
│   ├── search/           # Database searchers
│   │   ├── index.js      # Searcher factory
│   │   ├── baseSearcher.js
│   │   ├── pubmedSearcher.js
│   │   ├── scopusSearcher.js
│   │   ├── webOfScienceSearcher.js
│   │   └── embaseSearcher.js
│   ├── services/         # Business logic
│   │   ├── dbService.js  # Database operations
│   │   ├── deduplication.js
│   │   └── spreadsheet.js
│   └── server.js         # Entry point
├── frontend/             # Static frontend files
│   ├── css/styles.css
│   ├── js/
│   │   ├── api.js        # API communication layer
│   │   ├── app.js        # Main app initialization
│   │   ├── auth.js       # Authentication handling
│   │   ├── dashboard.js  # Dashboard module
│   │   ├── search.js     # Search module
│   │   ├── spreadsheets.js  # Spreadsheets module
│   │   ├── analysis.js   # AI Analysis module
│   │   ├── history.js    # History module
│   │   ├── portal.js     # Portal page
│   │   ├── data-analysis.js  # Data Analysis page
│   │   ├── ui.js         # UI utilities
│   │   └── notifications.js  # Toast notifications
│   ├── index.html        # Legacy entry (redirects)
│   ├── portal.html       # Main portal page
│   ├── login.html        # Login page
│   ├── search-review.html  # Search & Review module
│   └── data-analysis.html  # Data Analysis module
├── package.json
└── .env                  # Environment variables (create this)
```

> **Note**: All data is stored in PostgreSQL. No file-based storage is used.

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (returns JWT token) |
| GET | `/api/auth/me` | Get current user info |

### Databases
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/databases/available` | List available databases |
| GET | `/api/databases/publication-types` | Get publication types |
| POST | `/api/databases/search` | Search databases (auto-saves to history) |
| GET | `/api/databases/history` | Get user's search history |
| DELETE | `/api/databases/history/:id` | Delete search from history |

### Spreadsheets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/spreadsheets/list` | List user's spreadsheets |
| GET | `/api/spreadsheets/:name` | Get spreadsheet details |
| POST | `/api/spreadsheets/create` | Create from search results |
| POST | `/api/spreadsheets/upload` | Upload XLSX file |
| GET | `/api/spreadsheets/:name/download` | Download as XLSX |
| POST | `/api/spreadsheets/:name/update` | Update articles |
| DELETE | `/api/spreadsheets/:name` | Delete spreadsheet |

### Analysis (LLM Screening)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analysis/providers` | Get available LLM providers |
| GET | `/api/analysis/models` | Get available LLM models |
| POST | `/api/analysis/screen` | Screen single article |
| POST | `/api/analysis/single` | Single article analysis |
| POST | `/api/analysis/batch-screen` | Batch screen articles |
| POST | `/api/analysis/preview-prompt` | Preview LLM prompt |
| POST | `/api/analysis/test-connection` | Test LLM connection |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Get dashboard statistics |
| GET | `/api/dashboard/profile` | Get user profile |
| GET | `/api/dashboard/activity` | Get recent activity |

### Config
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/config/status` | Get API key status |
| GET | `/api/config/llm-providers` | Get LLM provider status |
| GET | `/api/config/databases` | Get database status |

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |
| GET | `/api/health` | API health check |

---

## 🤖 LLM Providers

### OpenAI
- **Default**: `gpt-5.2`
- **Models**: `gpt-5.2`, `gpt-5.2-pro`, `gpt-5-mini`, `gpt-5-nano`, `gpt-4o`
- [Get API key](https://platform.openai.com/api-keys)

### Anthropic Claude
- **Default**: `claude-sonnet-4-5-20250929`
- **Models**: `claude-sonnet-4-5-20250929`, `claude-opus-4-6`, `claude-opus-4-5-20251101`, `claude-haiku-4-5-20251001`
- [Get API key](https://console.anthropic.com/settings/keys)

### Google Gemini
- **Default**: `gemini-3-flash-preview`
- **Models**: `gemini-3-flash-preview`, `gemini-3-pro-preview`
- [Get API key](https://aistudio.google.com/app/apikey)

---

## 🗄️ Database Schema

```
users (1) ──────< projects (N)
    │                  │
    │                  ├──< searches (N)
    │                  │         │
    │                  │         └──< records (N) >── works (1)
    │                  │                   │
    │                  └──< screening_events (N)
    │
    ├──────< spreadsheets (N)
    │
    ├──────< datasets (N)
    │
    └──────< user_search_history (N)
```

- **users**: User accounts with authentication
- **projects**: Research projects
- **searches**: Search queries linked to projects
- **works**: Canonical/deduplicated articles
- **records**: Article occurrences per project
- **screening_events**: AI/human screening decisions (audit trail)
- **spreadsheets**: User spreadsheets with articles (stored as JSONB)
- **datasets**: User datasets for data analysis (stored in PostgreSQL)
- **user_search_history**: All TIAB searches performed (deduplicated, with count)

---

## 🚀 Deployment

### Environment Variables

Set these in your deployment platform:

```env
POSTGRES_URL=postgresql://user:pass@host:5432/dbname
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AI...
JWT_SECRET_KEY=your-secret-key
PORT=8000
```

### Platform Examples

**Railway:**
1. Connect your GitHub repository
2. Add PostgreSQL database plugin
3. Set environment variables in Railway dashboard
4. Deploy automatically on push

**Render:**
1. Create new Web Service
2. Add PostgreSQL database
3. Set environment variables
4. Build command: `npm install`
5. Start command: `npm start`

**Heroku:**
```bash
heroku create
heroku addons:create heroku-postgresql:essential-0
heroku config:set OPENAI_API_KEY=sk-... JWT_SECRET_KEY=...
git push heroku main
```

---

## 📝 npm Scripts

```bash
# Start server (production)
npm start

# Start with nodemon for development (if installed)
npm run dev
```

---

## 🐛 Troubleshooting

### "Loading providers..." infinite loop
- Check `.env` file has valid API keys
- Verify server is running (`http://localhost:8000/health`)
- Check browser console for errors

### Database connection errors
- Ensure PostgreSQL is running
- Verify `POSTGRES_URL` in `.env`
- Check database exists: `psql -l`

### Search not working
- PubMed should work without API key
- For other databases, add respective API keys
- Check `/api/databases/available` for status

---

## 📄 License

ISC

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first.
