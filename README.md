<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
  <h1 align="center">Traveline Server</h1>
</p>

<p align="center">
  The robust backend service powering the <b>Traveline</b> ecosystem - a smart, AI-driven travel planning and management platform.
</p>

## 📖 Introduction

**Traveline Server** is built with [NestJS](https://nestjs.com/) and serves as the core API for the Traveline mobile app and web administration dashboard. It integrates advanced features like AI-powered route planning, real-time chatbot assistance, and comprehensive travel resource management (destinations, eateries, accommodations).

## ✨ Key Features

- **🔐 Authentication & Security**: Secure JWT-based authentication for Users, Admins, and Coordinators.
- **🗺️ Smart Travel Planning**:
  - AI-driven itinerary generation using **Gemini AI**.
  - Route optimization and scheduling.
  - Interactive map integration.
- **🏨 Resource Management**:
  - **Destinations**: Rich data with descriptions, images, and geolocation.
  - **Eateries & Accommodation**: Detailed catalogs with filtering and reviews.
  - **Vietnam Administrative Units**: Full database of provinces, districts, and wards (including reform mappings).
- **💸 Payments & Transactions**: Integrated payment gateways (VNPAY) and digital wallet management.
- **🤖 Intelligent Chatbot**: Context-aware assistant for user queries and recommendations.
- **📊 Admin Dashboard APIs**: Statistics, reporting, and content moderation tools.
- **☁️ Cloud Integration**:
  - **Cloudinary**: High-performance image storage and optimization.
  - **Firebase**: Push notifications and background services.

## 🛠️ Technology Stack

- **Framework**: [NestJS](https://nestjs.com/) (Node.js)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **AI/ML**: Google Gemini API
- **Storage**: Cloudinary
- **Caching & Queues**: Redis (optional/if enabled)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [PostgreSQL](https://www.postgresql.org/)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/traveline-server.git
   cd traveline-server
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file in the root directory. You can use the example below as a template:

   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASS=your_password
   DB_NAME=traveline

   # Authentication
   JWT_SECRET=your_jwt_secret_key

   # General
   PORT=3000
   FRONTEND_RETURN_URL=http://localhost:3000

   # Cloud Services (Add your keys)
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...

   # AI Services
   GEMINI_API_KEY=...
   ```

4. **Run Database Migrations (if applicable)**
   ```bash
   # If using TypeORM migrations
   npm run migration:run
   ```

### Running the Application

```bash
# development
$ npm run start

# watch mode (recommended for dev)
$ npm run start:dev

# production mode
$ npm run start:prod
```

## 🇻🇳 Vietnam Administrative Mapping Seed

This project includes a specialized seeding tool to populate Vietnam's administrative data, handling both legacy and reformed units.

1. **Prepare Data**: Ensure `scripts/run-seed-admin-mapping.ts` is configured correctly.
2. **Execute Seed**:
   ```bash
   # Run the seed script using ts-node
   npx ts-node scripts/run-seed-admin-mapping.ts
   ```

## 🧪 Testing

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## 📞 Support

For any inquiries or issues, please contact the development team or open an issue on the repository.

---

<p align="center">
  Built with ❤️ by the Traveline Team
</p>
