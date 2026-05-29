# Running & Testing CampusConnect Locally

To get the entire CampusConnect platform running locally and execute your test suites, you need to orchestrate a few different services. Because this is a production-ready architecture, Redis and PostgreSQL must be running on your machine before you start the servers.

## Step 1: Start Your Background Services

Before touching your code, ensure your local databases are active:

- **PostgreSQL**: Ensure your local Postgres server is running on port 5432 (or whichever port your `.env` specifies).
- **Redis**: Ensure Redis is running on port 6379. If you are on Windows, you can run Redis via WSL (Windows Subsystem for Linux) using `sudo service redis-server start`, or use a Docker container.

## Step 2: Initialize the Database (Terminal 1)

Open a terminal, navigate to your backend folder, and apply the database schemas and official college seed data.

```bash
cd apps/server

# Apply the Prisma schema to your Postgres database
npm run db:migrate 

# Seed the official AISHE college data (if you created the seed script)
npm run db:seed 
```

## Step 3: Start the Backend API (Terminal 1)

With the database ready, start your Express server in development mode. This uses `ts-node-dev` to automatically restart the server when you make code changes.

```bash
# Still inside apps/server
npm run dev
```

You should see logs confirming that the server is running on port 5000, connected to Postgres, and that Socket.io is initialized with Redis.

## Step 4: Run the Backend Automated Tests (Terminal 2)

Open a new terminal tab to run the Jest testing suite. You do not need to stop the development server to do this.

```bash
cd apps/server

# Run the test suite once
npm run test

# OR, keep it running in the background while you write more code
npm run test:watch
```

## Step 5: Start the React Native Frontend (Terminal 3)

Since you encountered the Windows `%5C` URL encoding bug with the Metro web bundler earlier, bypass the web browser and test directly on mobile using Expo Go.

Open a third terminal tab:

```bash
cd apps/mobile

# Clear the cache to prevent any lingering Metro path errors
npx expo start -c
```

### How to test the app on your device:
1. When the QR code appears in your terminal, open the Expo Go app on your physical Android or iOS device.
2. Scan the QR code.
3. Ensure your mobile phone and your computer are connected to the same Wi-Fi network.

> **Crucial Check**: If your mobile app cannot connect to the backend, make sure your frontend API calls are pointing to your computer's local IP address (e.g., `http://192.168.1.X:5000/api`) rather than `http://localhost:5000`. `localhost` on a physical phone refers to the phone itself, not your computer.

## How to Manually Test Complex Flows

While Jest is great for checking if routes return a `200 OK`, some features require manual testing:

- **Rate Limiting**: Open your browser and refresh `http://localhost:5000/api/health` 65 times very quickly. On the 61st try, you should see the `429 Too many requests` error trigger, proving Redis is doing its job.
- **WebSockets (Chat)**: Install Postman. You can create a new "WebSocket Request" in Postman, connect it to `ws://localhost:5000`, and manually emit Socket.io chat events to verify real-time messaging without needing two physical phones.
- **ID Card Uploads**: Use Postman to send a `POST` request to your auth endpoint. Select `form-data` in the body, attach a dummy image file, and ensure your `sharp` middleware compresses it to `.webp` before storing it in your `/uploads` folder.
