# Overview

This is a Blackjack card game application built with a modern full-stack architecture. The project implements a complete blackjack game with a React frontend and Express.js backend, featuring real-time game state management, card visualization, and game statistics tracking.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation integration

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful API with structured error handling and request logging
- **Data Storage**: In-memory storage with interface-based design for future database integration
- **Schema Validation**: Zod schemas for runtime type checking and validation
- **Game Logic**: Server-side game state management with action-based updates

## Development Environment
- **Build System**: Vite with hot module replacement for development
- **Code Organization**: Monorepo structure with shared types and schemas
- **Type Safety**: Strict TypeScript configuration with path mapping
- **Development Tools**: ESBuild for production bundling, tsx for development server

## Game Architecture
- **Game State**: Centralized state management with immutable updates
- **Card System**: Typed card objects with suit and value validation
- **Score Calculation**: Server-side score computation with blackjack rules
- **Game Actions**: Action-based gameplay (deal, hit, stand) with validation
- **Statistics**: Persistent win/loss/tie tracking across game sessions

## Data Models
- **Card Schema**: Suit, value, and numeric value with Zod validation
- **Game State Schema**: Complete game state including hands, scores, and metadata
- **Game Actions**: Typed action system for game interactions

## External Dependencies

- **UI Framework**: Radix UI primitives for accessible component foundation
- **HTTP Client**: Native Fetch API with custom error handling wrapper
- **Database Driver**: Neon Database serverless PostgreSQL driver (configured but not actively used)
- **ORM**: Drizzle ORM with PostgreSQL dialect support
- **Validation**: Zod for schema validation and type inference
- **Styling**: Tailwind CSS with PostCSS processing
- **Development**: Replit-specific plugins for enhanced development experience