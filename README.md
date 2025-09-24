# Ayvu

A SvelteKit application for reading and managing research papers from arXiv with Google Drive integration.

## Features

- **Google OAuth Authentication**: Secure sign-in with Google accounts
- **Google Drive Integration**: Automatic storage and organization of research papers
- **PDF Processing**: Upload and validate PDF files with page limits
- **Paper Management**: Store metadata and organize research papers
- **Session Management**: Secure session handling with automatic token refresh

## Technology Stack

- **Frontend**: SvelteKit with TypeScript
- **Database**: Turso (SQLite) with Drizzle ORM
- **Authentication**: Google OAuth 2.0
- **Storage**: Google Drive API
- **Styling**: SCSS with custom design system
- **Testing**: Vitest with comprehensive unit and integration tests

## Development

### Prerequisites

- Node.js 18+
- npm or pnpm
- Google OAuth credentials
- Turso database instance

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ayvu

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your Google OAuth and Turso credentials
```

### Environment Variables

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback
TURSO_DATABASE_URL=your_turso_database_url
TURSO_AUTH_TOKEN=your_turso_auth_token
```

### Development Server

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

### Testing

The project includes a comprehensive test suite covering all Sprint 1 requirements:

```bash
# Run all tests
npm test

# Run tests once (CI mode)
npm run test:run

# Run with coverage
npm run test:coverage
```

**Test Coverage**: 41/44 tests passing with comprehensive coverage of:

- Authentication flows
- Google Drive integration
- Database operations
- PDF processing
- Error handling

See [`TEST_SUMMARY.md`](./TEST_SUMMARY.md) for detailed test documentation.

### Database

```bash
# Generate and run migrations
npm run db-push

# Open database studio
npm run db:studio
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

## Project Structure

```
src/
├── lib/
│   ├── components/     # Reusable Svelte components
│   ├── db/            # Database schemas and operations
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Utility functions
├── routes/
│   ├── (app)/         # Protected application routes
│   ├── (auth)/        # Authentication routes
│   └── (home)/        # Public home page
├── styles/            # SCSS styling
└── test/              # Test configuration
```

## Sprint 1 Implementation

This implementation covers all Sprint 1 user stories:

- **US-1**: Sign in with Google
- **US-2**: Grant Drive Permissions
- **US-3**: Create Drive Folder
- **US-4**: Paper Entry Creation
- **US-5**: Google Drive Integration
- **US-6**: Database Operations

All features are fully tested with unit and integration tests following the documented test case specifications.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is part of a capstone project for academic purposes.

pandoc paper.html -f raw_html -t gfm -o ../markdown/paper.md --extract-media=../markdown/media --strip-comments --resource-path=.

latexmlc --format=html5 --destination=./paper.html ../2/main.tex

latexmlc --split --splitat=section --timestamp=0 --navigationtoc=context --nocomments --javascript="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js?config=MML_HTMLorMML" --destination=./paper.html ../1/conference_101719.tex

https://hackmd.io/@UoL-IWG/latexml
