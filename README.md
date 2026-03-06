
# EcoClear Workflow

A secure, AI-powered platform for environmental clearance applications, scrutiny, and committee decision-making.

## Developer
Developed by [Lalitheswar](https://github.com/lalitheswar09-data).

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS & ShadCN UI
- **AI**: Google Genkit with Gemini 2.5 Flash
- **State Management**: Zustand-inspired local storage store

## Project Overview
This application streamlines the complex process of environmental clearance for project proponents and government authorities. It includes:
- Automated document scrutiny using Gemini AI.
- Meeting management and Minutes of Meeting (MoM) generation.
- Real-time application status tracking.
- Role-based access control for Proponents, Scrutiny Teams, and MoM Teams.

## How to use this code locally
1. **Download**: Click the Download/Export button in Firebase Studio.
2. **Extract**: Unzip the folder on your machine.
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Environment Variables**: Create a `.env` file and add your `GOOGLE_GENAI_API_KEY`.
5. **Run Development Server**:
   ```bash
   npm run dev
   ```
6. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit from EcoClear Prototyper"
   git remote add origin https://github.com/lalitheswar09-data/your-repo-name.git
   git push -u origin main
   ```
