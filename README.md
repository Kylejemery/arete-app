# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/Kylejemery/arete-app.git
cd arete-app
```

### 2. Set up the backend server

```bash
cd server
npm install
cp .env.example .env
```

Open `server/.env` and add your Anthropic API key:

```
CLAUDE_API_KEY=sk-ant-api03-your-key-here
```

Start the backend:

```bash
npm run dev
```

The server will run on `http://localhost:3000`.

### 3. Set up the app

In a new terminal, from the repo root:

```bash
cp .env.example .env
```

The default `EXPO_PUBLIC_API_BASE_URL=http://localhost:3000` points to your local backend — no changes needed for local development.

Install app dependencies and start:

```bash
npm install
npx expo start
```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

### 4. Production deployment

Deploy the `server/` directory to [Railway](https://railway.app):

1. Create a new Railway project and connect your GitHub repo (or deploy just the `server/` folder).
2. In Railway's **Variables** tab, set `CLAUDE_API_KEY` to your Anthropic API key. Railway sets `PORT` automatically.
3. Copy the Railway-provided URL (e.g. `https://your-app.railway.app`).
4. In your app's `.env`, update `EXPO_PUBLIC_API_BASE_URL` to your Railway URL.
5. Rebuild and publish the Expo app.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
