# Deployment Guide for UniShare

This guide provides step-by-step instructions for deploying the **UniShare** project.

## 1. Backend Deployment (Render)

The backend is a Java Spring Boot application. We will deploy it using Render's Infrastructure-as-Code feature (`render.yaml`).

### Steps:
1.  **Connect GitHub**: Log in to [Render](https://render.com) and connect your GitHub account.
2.  **Create Blueprint**: Click **"New +"** and select **"Blueprint"**.
3.  **Select Repository**: Choose the `UniShere-VIIT` repository.
4.  **Configure Service**: Render will automatically detect the `render.yaml` file.
5.  **Set Environment Variables**: In the Render dashboard for your new service, you **must** set the following variables:
    *   `MONGODB_URI`: Your MongoDB Atlas connection string.
    *   `JWT_SECRET`: A long, random string for security.
    *   `CORS_ALLOWED_ORIGINS`: Set this to your Vercel deployment URL (e.g., `https://unishare-frontend.vercel.app`).
    *   `BOOTSTRAP_ADMIN_EMAIL`: Email for the initial admin account.
    *   `BOOTSTRAP_ADMIN_PASSWORD`: Password for the initial admin account.

### Important Note on File Storage:
Render's free tier uses an ephemeral file system. Uploaded files will be deleted whenever the service restarts. For a production app, it is recommended to use **Cloudinary** or **AWS S3** for persistent storage.

---

## 2. Frontend Deployment (Vercel)

The frontend is a Vite + React application.

### Steps:
1.  **Connect GitHub**: Log in to [Vercel](https://vercel.com) and connect your GitHub account.
2.  **Add New Project**: Click **"Add New"** -> **"Project"**.
3.  **Import Repository**: Choose the `UniShere-VIIT` repository.
4.  **Configure Project**:
    *   **Root Directory**: Set this to `frontend`.
    *   **Framework Preset**: Vite.
    *   **Build Command**: `npm run build`.
    *   **Output Directory**: `dist`.
5.  **Environment Variables**: Add the following variable:
    *   `VITE_API_BASE_URL`: Your Render backend API URL (e.g., `https://unishare-backend.onrender.com/api`).
6.  **Deploy**: Click **"Deploy"**.

---

## 3. Post-Deployment Checklist
- [ ] Verify that the backend is running by visiting `https://your-backend.onrender.com/actuator/health`. It should say `{"status":"UP"}`.
- [ ] Update the `CORS_ALLOWED_ORIGINS` in Render with the final Vercel URL if it changed.
- [ ] Log in with the `BOOTSTRAP_ADMIN_EMAIL` you configured to start managing the portal.
