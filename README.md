# Cerebero 🧠✨

Cerebero is a powerful and intuitive knowledge management tool designed to help you capture, organize, and rediscover your digital content effortlessly. With a sleek interface and AI-powered features, Cerebero is your central hub for all your links, documents, videos, and thoughts.

## Features 🚀

- **Universal Content Aggregator:** Easily add various types of content:
  - 🔗 Links
  - 📄 Documents
  - 📺 YouTube Videos
  - 🐦 Tweets
- **Elegant Recent Display:** A beautiful and intuitive way to view your recently added content.
- **Advanced Tagging:**
  - Manually add custom tags to organize your content.
  - 🤖 Leverage **AI-generated tags** for automatic and intelligent categorization.
- **Quick Preview:** Get a quick glimpse of your content directly within the details page.
- **Favorites & Sharing:**
  - ⭐ Mark content as a favorite for easy access.
  - 🔗 Share content with others seamlessly.
- **Specialized Views:**
  - Dedicated page for all your **favorite** items.
  - Comprehensive **tags page** to explore and manage your tagged content.
- **Tag Management:**
  - ✏️ Edit and delete existing tags.
  - 📊 View your **most used tags** and discover related content.
- **Beautiful Profile Page:**
  - Manage your user profile.
  - ⬇️ **Import content** in Excel format.
  - ⬆️ **Export your content** for backup or use in other applications.
- **Reliable Search:**
  - 🔍 Quickly find any content or tag with a powerful search functionality.
- 💡 AI Search Integration: Powered by Google Gemini, get intelligent search results and insights from your content.
- 🎯 Focus Items Dashboard: Add key items to your dashboard to maintain clarity and focus on what matters most.

## Technologies Used 🛠️

- **Next.js 15:** For a fast, server-rendered React application.
- **TypeScript:** For robust, type-safe JavaScript.
- **Supabase:** As the backend, providing database, and storage solutions.
- **Next-Auth:** For authentication with email and sign in with Google
- **Google Gemini API:** For AI-powered search and tag generation.

## Screenshots 📸

_Dashboard View:_
![Dashboard Screenshot](/public/dashboard.png)

_Tags View:_
![Tags Screenshot](/public/tags-page.png)

## Getting Started 🏁

Follow these instructions to set up Cerebero locally for development or personal use.

### Prerequisites

- Node.js (v18 or later recommended)
- npm, yarn, or pnpm
- A Supabase account (for database and authentication)
- Google Cloud account (for Gemini API access and Google OAuth)
- **Docker** and **Docker Compose** (for containerized setup)

### Installation & Setup (Local)

1. **Clone the repository:**

   ```bash
   git clone [https://github.com/your-username/cerebero.git](https://github.com/your-username/cerebero.git)
   cd cerebero
   ```****

2. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the root of your project and add the following environment variables. Obtain these keys from Convex, Google Cloud Console, and a secure secret generator.

   ```env
   # Base URL for your deployed application (used for share links, etc.)
   NEXT_PUBLIC_SHARED_BASE_URL=http://localhost:3000

   # A secret key for NextAuth.js (generate a strong random string)
   # You can generate one here: [https://generate-secret.vercel.app/32](https://generate-secret.vercel.app/32)
   NEXTAUTH_SECRET=your_nextauth_secret

   # Convex deployment URL (set by `npx convex dev` or from Convex dashboard)
   NEXT_PUBLIC_CONVEX_URL=your_convex_deployment_url

   # Optional server-side Convex URL override
   CONVEX_URL=your_convex_deployment_url

   # Optional deploy key for Convex admin HTTP calls
   CONVEX_DEPLOY_KEY=your_convex_deploy_key

   # Google OAuth Client ID (from Google Cloud Console)
   GOOGLE_CLIENT_ID=your_google_client_id

   # Google OAuth Client Secret (from Google Cloud Console)
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # Google Gemini API Key (from Google AI Studio or Google Cloud Console)
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Set up Convex:**

   - Run `npm run convex:dev` once to initialize Convex and generate local env values.
   - Deploy schema/functions with `npm run convex:deploy` when moving to production.

5. **Run the development server:**

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🐳 Running with Docker & Docker Compose

You can run Cerebero in a containerized environment using Docker and Docker Compose. This is the recommended way for production or to avoid local dependency issues.

### 1. Build and Start the App

Make sure you have your `.env.local` file set up as described above.

```bash
docker-compose up --build
```

This will build the Docker image and start the app on [http://localhost:3000](http://localhost:3000).

### 2. Stopping the App

To stop the running containers:

```bash
docker-compose down
```

### 3. Customizing Docker

- The `Dockerfile` and `docker-compose.yml` are already configured for a typical Next.js app.
- If you need to change the port, update the `ports` section in `docker-compose.yml`.
- For advanced configuration, edit the `Dockerfile` as needed.

---

## Environment Variables Explained 🔑

- `NEXT_PUBLIC_SHARED_BASE_URL`: The public URL of your application. Used for generating shareable links.
- `NEXTAUTH_SECRET`: A secret key used by NextAuth.js to encrypt session cookies and tokens.
- `NEXT_PUBLIC_CONVEX_URL`: The public Convex deployment URL used by the app.
- `CONVEX_URL`: Optional server-side Convex URL override.
- `CONVEX_DEPLOY_KEY`: Optional Convex deploy key used for authenticated HTTP function calls.
- `GOOGLE_CLIENT_ID`: Your Google OAuth 2.0 Client ID, used for Google Sign-In.
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth 2.0 Client Secret, used for Google Sign-In.
- `GEMINI_API_KEY`: Your API key for accessing the Google Gemini API for AI features.

## Contributing 🤝

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

peace✌️

---
