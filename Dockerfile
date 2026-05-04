# Stage 1: Build
FROM rust:latest AS builder
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev protobuf-compiler && rm -rf /var/lib/apt/lists/*

# Copy the entire workspace
COPY . .

# Force update dependencies to match the latest compiler
WORKDIR /app/backend
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
RUN cargo update
RUN cargo build --release -p server

# Stage 2: Runtime
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/backend/target/release/server /usr/local/bin/kiosk-server

# Expose port (Fly.io defaults to 8080)
EXPOSE 8080

# Run the server
CMD ["kiosk-server"]
