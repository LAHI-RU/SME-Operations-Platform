# SME Order Fulfillment & Inventory Operations Platform

A full-stack application for managing SME operations, from sales orders and stock management to fulfillment and delivery.

**Live application:** [lahiru-sme-demo.duckdns.org](https://lahiru-sme-demo.duckdns.org) (requires an authorized account).

## Features

- Dashboard with order summaries and recent activity.
- Product catalog, categories, customers, and suppliers.
- Stock movements, inventory history, and reorder indicators.
- Sales orders, stock checks, fulfillment, and delivery tracking.
- Role-based access for administrators, sales, warehouse, and delivery staff.
- Responsive interface with validated forms, loading states, and error feedback.

## Technology Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS, TanStack Query |
| Backend | Laravel 13, PHP 8.3, Sanctum, REST API |
| Database | PostgreSQL 18 |
| Testing | Pest/PHPUnit, Node.js test runner, Playwright, axe-core |
| Infrastructure | Docker Compose, Nginx, Caddy, AWS EC2, ECR, Systems Manager |
| CI | GitHub Actions |

## Engineering Practices

- Feature-organized frontend with reusable UI components and typed API access.
- Backend business logic in services, request validation, authorization policies, and a documented versioned API.
- Database transactions and row locking for stock and order operations, with inventory and order-status history.
- Automated backend tests against SQLite and PostgreSQL; frontend unit, browser workflow, accessibility, and responsive-layout checks.
- CI checks for TypeScript, linting, tests, production builds, and Docker runtime configuration.
- Multi-stage Docker builds, dependency lockfiles, environment-based configuration, and secrets excluded from Git.

## Deployment and Delivery

- Application deployed on AWS EC2 using Docker Compose and persistent PostgreSQL storage.
- Caddy provides HTTPS and automatic certificate management; internal application and database ports stay bound to localhost or the container network.
- The manually triggered publish workflow runs backend and frontend checks before publishing uniquely tagged images to private ECR repositories.
- GitHub authenticates to AWS through OIDC; EC2 uses an IAM role to pull images without stored AWS access keys.
- Manual ECR deployment, health checks, database backup verification, an off-server backup copy, and application rollback have been exercised.
- GitHub-to-EC2 command execution through Systems Manager has been verified.

**Current status:** the application runs from ECR images. Automated deployment is in progress; the deployment script still needs validation and integration into the publish workflow.

## Repository Guide

- `frontend/` — React application and frontend tests.
- `backend/` — Laravel API, migrations, and backend tests.
- `.github/workflows/` — CI checks, image publishing, and AWS connectivity checks.
- `compose*.yaml`, `Caddyfile` — local and AWS container configuration.

See the [frontend guide](frontend/README.md) and [backend API contract](BACKEND_API_CONTRACT.md) for implementation details.
