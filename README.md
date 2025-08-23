# Collaborative Canvas

A real-time collaborative design and prototyping tool built with Next.js 15+, Yjs, and Redux Toolkit.

## Features

- Real-time collaborative editing with conflict-free resolution using Yjs CRDTs
- Shape creation and manipulation (rectangles, circles, text, lines)
- Multi-user presence indicators and cursor tracking
- Advanced selection and grouping capabilities
- Collaborative-aware undo/redo functionality
- Infinite canvas with pan and zoom
- Modern UI built with shadcn/ui components

## Tech Stack

- **Frontend**: Next.js 15+, React 19, TypeScript
- **State Management**: Redux Toolkit (local UI state) + Yjs (shared document state)
- **Real-time Collaboration**: Yjs with WebSocket provider
- **UI Components**: shadcn/ui with Tailwind CSS
- **Testing**: Jest with React Testing Library
- **Code Quality**: ESLint, Prettier

## Project Structure

```
src/
├── components/          # React components
│   ├── canvas/         # Canvas-related components
│   ├── toolbar/        # Toolbar and tool components
│   └── ui/             # shadcn/ui components
├── store/              # Redux store and slices
│   └── slices/         # Redux slices for UI state
├── lib/                # Core libraries and utilities
│   ├── yjs/            # Yjs document management
│   └── validation/     # Input validation utilities
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── test/               # Test setup and utilities
```

## State Architecture

The application uses a dual-state architecture:

- **Shared State (Yjs)**: Shape data, positions, styles - synchronized across all users
- **Local State (Redux)**: UI state, tool selection, viewport - client-specific only

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run type-check` - Run TypeScript type checking

## Development

This project follows the spec-driven development methodology. See the `.kiro/specs/collaborative-canvas/` directory for detailed requirements, design, and implementation tasks.

## Testing

The project includes comprehensive testing:
- Unit tests for utilities and validation
- Redux store testing
- Component testing with React Testing Library
- Integration tests for Yjs collaboration features
