#!/usr/bin/env bash
set -euo pipefail

BACKEND_PORT="${BACKEND_PORT:-3001}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
DB_NAME="pestcontrol"

echo "=========================================="
echo "  Pest Control AI Platform - Startup"
echo "=========================================="
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Set default DATABASE_URL if not provided
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "==> DATABASE_URL not set, using default..."
  # Use current system username for PostgreSQL connection (common on macOS)
  DB_USER="${USER:-$(whoami)}"
  export DATABASE_URL="postgresql://${DB_USER}@localhost:5432/${DB_NAME}?schema=public"
fi
echo "DATABASE_URL: ${DATABASE_URL}"

# Set JWT secret with default
export JWT_SECRET="${JWT_SECRET:-pestcontrol-dev-secret-change-in-production}"

# Set OpenRouter configuration
export OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-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}"
export OPENROUTER_MODEL="${OPENROUTER_MODEL:-anthropic/claude-3-haiku}"

echo ""

# Check if PostgreSQL is running
echo "==> Checking PostgreSQL status..."
if ! command -v psql &> /dev/null; then
  echo "WARNING: psql command not found. Assuming PostgreSQL is configured correctly."
else
  # Try to connect to PostgreSQL server (not specific database)
  if ! psql -h localhost -c "SELECT 1;" postgres >/dev/null 2>&1 && \
     ! psql -c "SELECT 1;" postgres >/dev/null 2>&1; then
    echo ""
    echo "ERROR: Cannot connect to PostgreSQL server."
    echo ""
    echo "Please start PostgreSQL:"
    echo "  macOS:  brew services start postgresql"
    echo "  Linux:  sudo systemctl start postgresql"
    echo ""
    exit 1
  fi
  echo "PostgreSQL server is running."

  # Create database if it doesn't exist
  echo ""
  echo "==> Ensuring database '${DB_NAME}' exists..."
  if ! psql -h localhost -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "${DB_NAME}" && \
     ! psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "${DB_NAME}"; then
    echo "Creating database '${DB_NAME}'..."
    createdb "${DB_NAME}" 2>/dev/null || createdb -h localhost "${DB_NAME}" 2>/dev/null || {
      echo "Could not create database automatically."
      echo "Please create it manually: createdb ${DB_NAME}"
      exit 1
    }
    echo "Database created successfully!"
  else
    echo "Database '${DB_NAME}' already exists."
  fi
fi

# Clean up processes on common development ports
echo ""
echo "==> Cleaning up processes on development ports..."
for port in 3000 3001 4000 5000 5173; do
  if lsof -ti tcp:"${port}" >/dev/null 2>&1; then
    echo "Found processes on port ${port}, killing them..."
    lsof -ti tcp:"${port}" | xargs kill -9 || true
  fi
done
sleep 1
echo "Port cleanup complete."

# Check if backend node_modules exists
echo ""
echo "==> Setting up backend..."
cd "$SCRIPT_DIR/backend"

if [ ! -d "node_modules" ]; then
  echo "Installing backend dependencies..."
  npm install
else
  echo "Backend dependencies already installed."
fi

# Update backend .env file with current DATABASE_URL
echo ""
echo "==> Updating backend .env file..."
if [ -f ".env" ]; then
  # Update DATABASE_URL in .env if it exists, otherwise append
  if grep -q "^DATABASE_URL=" .env; then
    sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env 2>/dev/null || \
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env
  else
    echo "DATABASE_URL=\"${DATABASE_URL}\"" >> .env
  fi
  # Update or add OPENROUTER_API_KEY
  if grep -q "^OPENROUTER_API_KEY=" .env; then
    sed -i '' "s|^OPENROUTER_API_KEY=.*|OPENROUTER_API_KEY=\"${OPENROUTER_API_KEY}\"|" .env 2>/dev/null || \
    sed -i "s|^OPENROUTER_API_KEY=.*|OPENROUTER_API_KEY=\"${OPENROUTER_API_KEY}\"|" .env
  else
    echo "OPENROUTER_API_KEY=\"${OPENROUTER_API_KEY}\"" >> .env
  fi
  # Update or add OPENROUTER_MODEL
  if grep -q "^OPENROUTER_MODEL=" .env; then
    sed -i '' "s|^OPENROUTER_MODEL=.*|OPENROUTER_MODEL=\"${OPENROUTER_MODEL}\"|" .env 2>/dev/null || \
    sed -i "s|^OPENROUTER_MODEL=.*|OPENROUTER_MODEL=\"${OPENROUTER_MODEL}\"|" .env
  else
    echo "OPENROUTER_MODEL=\"${OPENROUTER_MODEL}\"" >> .env
  fi
else
  cat > .env << EOF
DATABASE_URL="${DATABASE_URL}"
JWT_SECRET="${JWT_SECRET}"
PORT=${BACKEND_PORT}
NODE_ENV=development
OPENROUTER_API_KEY="${OPENROUTER_API_KEY}"
OPENROUTER_MODEL="${OPENROUTER_MODEL}"
EOF
fi
echo ".env file updated."

# Generate Prisma client
echo ""
echo "==> Generating Prisma client..."
npx prisma generate

# Run database migrations
echo ""
echo "==> Running Prisma migrations..."
npx prisma db push || {
  echo "Migration failed. Trying to create initial schema..."
  npx prisma db push --force-reset
}

# Check if database has been seeded
echo ""
echo "==> Checking if database needs seeding..."
USER_COUNT=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | tr -d ' ' || echo "0")
if [ "${USER_COUNT}" = "0" ] || [ -z "${USER_COUNT}" ]; then
  echo "Database appears empty. Running seed..."
  npm run seed
else
  echo "Database already contains data (${USER_COUNT} users). Skipping seed."
fi

# Check if frontend node_modules exists
echo ""
echo "==> Setting up frontend..."
cd "$SCRIPT_DIR/frontend"

if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install
else
  echo "Frontend dependencies already installed."
fi

# Start both servers
echo ""
echo "=========================================="
echo "  Starting Pest Control AI Platform"
echo "=========================================="
echo ""
echo "Backend will run on:  http://localhost:${BACKEND_PORT}"
echo "Frontend will run on: http://localhost:${FRONTEND_PORT}"
echo ""
echo "Test credentials:"
echo "  Admin: admin@pestcontrol.com / password123"
echo "  Manager: manager@pestcontrol.com / password123"
echo "  Technician: john.smith@pestcontrol.com / password123"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Function to cleanup on exit
cleanup() {
  echo ""
  echo "Shutting down servers..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend server
cd "$SCRIPT_DIR/backend"
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend server
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
