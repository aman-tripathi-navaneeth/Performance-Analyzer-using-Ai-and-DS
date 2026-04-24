# 🚀 Performance Analyzer - AI-Powered Academic Insights

An advanced academic performance analyzer that leverages **Google Gemini AI** to generate intelligent insights, automated test variations, and at-risk student detection.

## ✨ Core Features
- **Intelligent Exam Generator:** Automatically generates high-quality MCQ tests with variations for the same subject using **Gemini 2.5 Flash**.
- **Performance Analytics:** Comprehensive charts for class and individual student progress.
- **AI Insights:** Detects performance trends (improving vs. declining) and predicts future academic outcomes.
- **At-Risk Detection:** Identifies students falling below benchmarks and suggests corrective actions.
- **Bulk Data Management:** Seamlessly import student and faculty data via Excel/CSV.
- **Placement Hub:** TPO dashboard to post jobs and match students based on their AI analyzer profile.

## 🛠️ Technology Stack
- **Frontend:** React + Vite + TailwindCSS + Lucide Icons
- **Backend:** FastAPI (Python) + SQLAlchemy + SQLite
- **AI Engine:** Google Generative AI (Gemini 2.5 Flash)
- **Charts:** Recharts

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Google Gemini API Key

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate
pip install -r requirements.txt
# Update .env with your GEMINI_API_KEY
uvicorn main:app --host 0.0.0.0 --port 5000
```

### 3. Frontend Setup
```bash
cd Performance-Analyzer
npm install
# Update config.ts if necessary
npm run dev
```

## 🔒 Security
- **Secure Hashing:** All passwords are SHA-256 hashed.
- **API Protection:** sensitive keys are managed via `.env` files (not committed to the repository).

## 📄 License
MIT License.

---
*Created for advanced academic monitoring and career placement assistance.*
