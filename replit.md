# Investment Portfolio Manager

## Overview

This is a minimalist web application for shared investment portfolio management between two users: Ali (viewer) and Alle (admin). The application provides a clean interface for tracking investments, viewing portfolio performance, and managing financial data with role-based access control.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: React hooks with local state management
- **Data Fetching**: TanStack Query for server state management

### Authentication & Authorization
- **Login System**: Simple role-based authentication with two users (Ali/Alle)
- **Access Control**: Admin (Alle) has full CRUD permissions, Viewer (Ali) has read-only access
- **Password Protection**: Admin access protected with password verification

### Data Management
- **Primary Storage**: LocalStorage for client-side persistence
- **Backup Architecture**: Express.js server with in-memory storage ready for database integration
- **Schema**: Zod validation schemas for type safety and data validation
- **Data Models**: Investments, Transactions, and Portfolio Summary entities

### UI/UX Design
- **Theme System**: Dual light/dark theme support with CSS variables
- **Responsive Design**: Mobile-first approach using Tailwind breakpoints
- **Component Library**: Comprehensive UI components (forms, tables, charts, dialogs)
- **User Experience**: Intuitive dashboard with portfolio overview and detailed investment tracking

### Development Architecture
- **Monorepo Structure**: Shared schema between client and server
- **Type Safety**: End-to-end TypeScript with strict configuration
- **Build Process**: Separate client (Vite) and server (esbuild) builds
- **Development Tools**: Hot reload, error overlays, and development banners

## External Dependencies

### Core Framework Dependencies
- **React & React DOM**: Frontend framework and rendering
- **TypeScript**: Type safety and development experience
- **Vite**: Build tool and development server

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library
- **Class Variance Authority**: Component variant management

### Data & Forms
- **Zod**: Schema validation and type inference
- **React Hook Form**: Form state management and validation
- **TanStack Query**: Server state management
- **Date-fns**: Date manipulation utilities

### Backend (Ready for Extension)
- **Express.js**: Web server framework
- **Drizzle ORM**: Database ORM ready for PostgreSQL
- **Neon Database**: Serverless PostgreSQL (configured but not actively used)

### Development Tools
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS & Autoprefixer**: CSS processing
- **Replit Plugins**: Development environment integration