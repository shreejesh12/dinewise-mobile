DineWise Android Run Steps
==========================

1) Unzip the project.

2) Open two terminals inside the folder: dinewise-mobile

3) In Terminal 1, install packages:
   npm install

4) In Terminal 1, start the backend server:
   npm run dev

   Wait until you see:
   Server running on http://localhost:3000

5) In Terminal 2, build the web app:
   npm run build:web

6) In Terminal 2, sync Capacitor Android files:
   npx cap sync android

7) In Terminal 2, open Android Studio:
   npx cap open android

8) In Android Studio, press Run.

Important:
- Keep Terminal 1 running while using the app.
- Android emulator uses http://10.0.2.2:3000 to reach your laptop backend.
- If you use a real Android phone, edit .env and change:
    VITE_API_BASE_URL=http://YOUR_LAPTOP_IP:3000
  Then run again:
    npm run build:web
    npx cap sync android

If signup/login still fails:
- Make sure backend is running.
- Make sure build:web was run after editing .env.
- Uninstall the old app from emulator/device and run again.


Google Maps and Gemini keys are already prefilled in .env for this packaged copy.
