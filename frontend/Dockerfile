FROM node:20-slim

WORKDIR /app

# Build-time and runtime environment variables
ARG BACKEND_URL=http://backend:8080
ENV BACKEND_URL=$BACKEND_URL

# Copy package files
COPY package*.json ./

# Install dependencies cleanly
RUN npm install --no-audit --no-fund

# Copy the rest of the application
COPY . .

# Build Next.js application
RUN npm run build

# Expose Next.js port
EXPOSE 3000

CMD ["npm", "run", "start"]

