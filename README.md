# The Visual Medical History (Spatial EMR & LDA Workstation)

An interactive 3D spatial Electronic Medical Record (EMR) interface designed for clinicians, replacing flat text charts with an intuitive 3D anatomical map.

---

## 🚀 Key Capabilities
- **Spatial 3D Charting**: Interactive mannequin with Lines, Drains, Airways (LDAs), Surgeries, and Chronic Diagnoses.
- **Physical Pharmacology**: 3D pharmacy shelf with realistic amber prescription vials, dosage info, and last-picked-up timestamps.
- **Perspective Turntable**: 180° smooth revolution between Anterior and Posterior views with anatomically relevant pin filtering.
- **Anti-Occlusion Callout Engine**: Flank callout boxes dynamically placed to ensure 100% avatar and hand visibility with zero shelf collisions.
- **Minimalistic Login Interface**: Clean clinician portal with email/password authentication and a one-click **Demo Access** bypass to explore the patient immediately.
- **EMR Integration & Print**: Comprehensive Patient Demographics modal, preferred pharmacy section, and printable clinical summary sheet.

---

## 🛠 Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons
- **3D Graphics**: Three.js, `@react-three/fiber`, `@react-three/drei`
- **Backend & Persistence**: Supabase (PostgreSQL with Row Level Security), LocalStorage fallback

---

## 📦 Deployment to Vercel

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "feat: Visual Medical History with minimalistic auth and demo access"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and click **"Add New" > "Project"**.
2. Import your GitHub repository.
3. In **Environment Variables**, configure:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL (`https://xyzcompany.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Public API Key
4. Click **Deploy**.

---

## 🗄 Linking Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard and run the schema located in `src/lib/supabase.js` (`SUPABASE_SQL_SCHEMA`), or copy it from the SQL Schema tab in the setup modal.
3. Retrieve your **Project URL** and **anon public key** from `Project Settings > API`.
4. Add them to your `.env.local` or Vercel Environment Variables.

---

## 💻 Local Development
```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Build for production
npm run build
```
