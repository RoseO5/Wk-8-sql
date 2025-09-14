# Week 8 — E-commerce DB + CRUD API

## What is included

- `week8_assignment.sql` — Create database schema and sample data
- `server.js` — Express CRUD API (Products & Orders)
- `package.json` — Node package file
- `.env.example` — Example environment variables

## Requirements

- MySQL / MariaDB server
- Node.js (v16+ recommended)
- npm

### Termux notes

- Install packages in Termux: `pkg install nodejs-lts` (this includes npm) and `pkg install mariadb` (or install and connect to a remote MySQL server). Start MariaDB with `mysqld_safe &` or `mysqld` depending on setup. You may need to run `mysql_secure_installation`.

## Steps

1. Start your MySQL server.
2. Load database schema:
   - In Termux: `mysql -u root -p < week8_assignment.sql` (or open mysql and run `SOURCE /path/to/week8_assignment.sql;`).
3. Copy `.env.example` to `.env` and set `DB_USER`, `DB_PASSWORD`, etc.
4. Install dependencies:
   ```bash
   npm install
