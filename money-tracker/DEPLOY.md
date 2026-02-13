# How to Deploy Money Tracker

This guide explains how to deploy the **Money Tracker Frontend** to Vercel using NPM.

## Prerequisites

1.  **Vercel Account**: Sign up at [vercel.com](https://vercel.com).
2.  **Supabase Project**: Ensure your Supabase project is set up and you have the URL and Anon Key.

## Deployment Options

### Option 1: Deploy from Terminal (Recommended)

1.  Open a terminal in the project root.
2.  Run the deployment command:
    ```bash
    npm run deploy:web
    ```
3.  Follow the prompts:
    - **Set up and deploy?**: `Y`
    - **Which scope?**: Select your account.
    - **Link to existing project?**: `N` (unless you already have one).
    - **Project Name**: `money-tracker-frontend` (or your preference).
    - **Directory**: `frontend` (It should detect this automatically or ask. Ensure it points to `frontend`).
    - **Build Command**: `vite build` (Default is usually correct).
    - **Output Directory**: `dist` (Default is usually correct).
4.  **Environment Variables**:
    - Vercel will ask if you want to modify settings. Choose **No** for now.
    - Go to your Vercel Project Dashboard > Settings > Environment Variables.
    - Add the following variables (copy values from your local `.env` or Supabase dashboard):
        - `VITE_SUPABASE_URL`
        - `VITE_SUPABASE_ANON_KEY`
5.  Trigger a redeploy if the environment variables weren't present during the first build.

### Option 2: Deploy via Git Integration

1.  Push your code to GitHub/GitLab/Bitbucket.
2.  Import the project in Vercel.
3.  Select the `frontend` directory as the **Root Directory** in Vercel settings.
4.  Add the Environment Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
5.  Click **Deploy**.

## Local Development

To run the project locally:

```bash
# Install all dependencies (frontend & backend)
npm run install:all

# Start Frontend only
npm run dev

# Start Backend only (if needed)
npm run dev:backend
```
