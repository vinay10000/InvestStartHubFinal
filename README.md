# StartupConnect Platform

A full-stack web application connecting startups with investors, featuring both traditional and blockchain-based investment options.

## Tech Stack Overview

### Frontend
- **React** (TypeScript) with Vite as build tool
- **Tailwind CSS** for styling
- **Shadcn UI** for component library and theming
- **React Query** for server state management
- **Wouter** for client-side routing
- **React Hook Form** for form handling and validation

### Backend
- **Express.js** (TypeScript) for API server
- **Firebase**
  - Authentication
  - Firestore Database
  - Realtime Database
  - Cloud Storage

### Blockchain Integration
- **Hardhat** for Ethereum development environment
- **Ethers.js** for blockchain interactions
- **MetaMask** integration for wallet connections
- **Smart Contracts** written in Solidity
  - StartupToken
  - StartupInvestment
  - StartupTokenFactory

### Database & Storage
- **Neon Database** (PostgreSQL) with Drizzle ORM
- **ImageKit** for image optimization and storage
- **Multer** for file upload handling

### Authentication & Security
- **Firebase Auth** for user authentication
- **Express Session** with PostgreSQL session store
- **Passport.js** for authentication strategies

### Development Tools
- **TypeScript** for type safety
- **ESBuild** for production builds
- **Drizzle Kit** for database migrations
- **Zod** for schema validation

### Payment Integration
- **MetaMask** for cryptocurrency payments
- **UPI** for traditional payments

## Key Features

- Dual payment system (Crypto & Traditional)
- Document management for startups
- Real-time chat between investors and founders
- Smart contract-based investment tracking
- Secure file storage and sharing
- Role-based access control
- Responsive design

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. For blockchain development:
```bash
npx hardhat compile
npx hardhat test
```

The application runs on port 3000 by default.

## Project Structure

- `/client` - React frontend application
- `/server` - Express backend API
- `/contracts` - Solidity smart contracts
- `/shared` - Shared TypeScript types and schemas
- `/test` - Smart contract tests
