# Use Node.js as base
FROM node:20

# Set working directory
WORKDIR /app

# Install git to clone your repo
RUN apt-get update && apt-get install -y git

# Clone your repo
RUN git clone https://github.com/jimmy24599/ReactWeb.git .

# Install dependencies
RUN npm install

# Build the Vite app
RUN npm run build

# Install 'serve' to serve the static files
RUN npm install -g serve

# Expose port 4173 (Vite preview default)
EXPOSE 4173

# Serve the built app
CMD ["serve", "-s", "dist", "-l", "4173"]
