
# TaleGrove

TaleGrove is a modern, full-stack web application for managing, discovering, and recommending books. Built with Next.js, TypeScript, Supabase, and Tailwind CSS, it provides a beautiful and intuitive interface for book lovers to organize their collections, search for new reads, and receive AI-powered recommendations.

## Features

- **User Authentication**: Sign up and sign in with email/password or Google OAuth (Supabase Auth).
- **Book Collection Management**: Add, organize, and rate books in custom folders.
- **Book Search**: Search for books using the Google Books API.
- **AI Recommendations**: Get personalized book recommendations powered by Google Gemini.
- **Book Discovery**: Discover new books and add them to your collection.
- **Drag-and-Drop Organization**: Organize books and folders with drag-and-drop (react-dnd).
- **Responsive UI**: Built with Tailwind CSS for a modern, mobile-friendly experience.
- **Dark Mode**: Toggle between light and dark themes.

## Tech Stack

- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind CSS, Framer Motion, Zustand
- **Backend/Database**: Supabase (Postgres, Auth, Storage)
- **APIs**: Google Books API, Google Gemini (Generative AI)
- **Other**: ESLint, PostCSS, React DnD, Lucide Icons

## Project Structure

```
TaleGrove/
├── app/                # Next.js app directory (routing, pages, layouts)
│   ├── books/          # Book collection and folder management
│   ├── book/[id]/      # Book detail pages
│   ├── discover/       # AI-powered book recommendations
│   ├── search/         # Book search page
│   ├── signin/         # Sign-in page
│   ├── signup/         # Sign-up page
│   └── ...             # Other routes (reset-password, forgot-password, etc.)
├── components/         # Reusable UI components (Header, Modals, Cards, etc.)
├── lib/                # API clients, Supabase helpers, AI integration
├── styles/             # Global styles (Tailwind)
├── types/              # TypeScript types and interfaces
├── public/             # Static assets (images, logo)
├── supabase/           # Supabase config and migrations
├── package.json        # Project dependencies and scripts
├── tailwind.config.ts  # Tailwind CSS configuration
├── next.config.mjs     # Next.js configuration
└── tsconfig.json       # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm, yarn, pnpm, or bun
- Supabase account (for production) or Supabase CLI (for local dev)
- Google Books API key
- Google Gemini API key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nathan-probert/TaleGrove.git
   cd TaleGrove
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn
   # or
   pnpm install
   # or
   bun install
   ```

3. **Set up environment variables:**

   Create a `.env.local` file in the root directory and add:

   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY=your_google_books_api_key
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the app.

### Database & Supabase

- The project uses Supabase for authentication, database, and storage.
- Database schema and extensions are managed via SQL migrations in `supabase/migrations/`.
- Local development can use the Supabase CLI and the provided `config.toml`.

### Scripts

- `npm run dev` – Start the development server
- `npm run build` – Build for production
- `npm run start` – Start the production server
- `npm run lint` – Run ESLint

## Key Files & Directories

- `src/app/` – Main application routes and pages
- `src/components/` – UI components (Header, Modals, Book Cards, etc.)
- `src/lib/` – API integrations (Supabase, Google Books, Gemini)
- `src/types/` – TypeScript interfaces for books, folders, recommendations, etc.
- `supabase/` – Supabase configuration and SQL migrations

## Customization

- **Theming**: Edit `tailwind.config.ts` and CSS variables for custom colors and fonts.
- **Book APIs**: Switch between Google Books and OpenLibrary in `lib/books_api.tsx`.
- **AI Model**: Update Gemini model or prompt in `lib/gemini.tsx`.

## Contributing

Contributions are welcome! Please open issues or pull requests for bug fixes, features, or improvements.

## License

[MIT](LICENSE) (add a LICENSE file if not present)
