# KEYCHAN Studio

Convert your 2D images into 3D printable keychains.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Backend:** Convex (serverless, stateful backend)
- **3D Rendering:** React Three Fiber + Drei
- **3D Processing:** Three.js, Potrace, Three-CSG-TS, Three-STL-Exporter
- **Styling:** Tailwind CSS + shadcn/ui
- **Language:** TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Convex account (free at [convex.dev](https://convex.dev))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd keychan-studio
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Convex**
   ```bash
   npx convex dev
   ```
   This will:
   - Create a new Convex project (or connect to existing)
   - Generate the Convex configuration
   - Set up your deployment URL

4. **Configure environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_CONVEX_URL=your_convex_deployment_url_here
   ```
   
   The Convex CLI will provide this URL when you run `npx convex dev`.

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
keychan-studio/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with Convex provider
│   ├── page.tsx           # Home page
│   ├── collections/       # Collections page
│   └── pricing/           # Pricing page
├── components/            # React components
│   ├── ConvexClientProvider.tsx
│   ├── CollectionsContent.tsx
│   ├── PricingContent.tsx
│   └── ...
├── convex/                # Convex backend
│   ├── generate.ts        # 3D conversion action
│   ├── keychains.ts       # Database mutations/queries
│   ├── schema.ts          # Database schema
│   └── storage.ts         # File upload mutations
├── src/
│   ├── components/       # UI components (shadcn/ui)
│   └── lib/              # Utilities
└── public/               # Static assets
```

## Architecture

### Backend (Convex)

All backend logic is handled by Convex:

- **Actions** (`convex/generate.ts`): Heavy 3D processing (potrace, extrusion, CSG)
- **Mutations** (`convex/keychains.ts`, `convex/storage.ts`): Database writes and file uploads
- **Queries** (`convex/keychains.ts`): Database reads

### Frontend (Next.js)

- **App Router**: File-based routing
- **Client Components**: Marked with `"use client"` directive
- **Convex Hooks**: `useQuery`, `useMutation`, `useAction` for backend integration

## Key Features

1. **Image Upload**: Upload 2D images (PNG, JPG) via Convex storage
2. **3D Conversion**: Convert images to 3D STL files using:
   - Potrace for bitmap tracing
   - Three.js ExtrudeGeometry for 3D extrusion
   - Three-CSG-TS for boolean operations (keychain hole)
3. **Customization**: Adjust thickness, text, hole position
4. **3D Preview**: Real-time preview using React Three Fiber
5. **Collections**: Browse and download community keychains

## Development

### Running Convex in Development

```bash
npm run convex:dev
```

This runs Convex in watch mode, automatically syncing your backend changes.

### Building for Production

```bash
npm run build
npm start
```

### Deploying Convex

```bash
npm run convex:deploy
```

## Notes

- The 3D conversion happens entirely on the Convex backend
- Files are stored in Convex storage (not local filesystem)
- The app uses Convex's real-time database for the collections page
- Real-time texture preview for instant feedback
- Interactive hole positioning with click-and-drag

## License

MIT
