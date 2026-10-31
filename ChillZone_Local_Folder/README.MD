# ChillZone AI — local VS Code setup

This package runs ChillZone on your Mac with a small local Node.js backend. The OpenAI API key stays in `.env` and is never placed in the HTML or sent to the browser.

## 1. Install Node.js

Install Node.js 18 or newer from https://nodejs.org/ if it is not already installed. In VS Code, open this entire folder (`ChillZoneAI_Local_VSCode`).

## 2. Add your API key privately

1. Copy `.env.example` and name the copy `.env`.
2. Open `.env` and replace `your_api_key_here` with your key from https://platform.openai.com/api-keys.
3. Save it. Do not paste the key into `index.html`, screenshots, chat, or GitHub. `.gitignore` excludes `.env`.

## 3. Start ChillZone

In VS Code choose **Terminal → New Terminal**, then run:

```bash
npm start
```

Open **http://localhost:3000** in your browser. Do not open `index.html` directly with `file://`, because the AI needs the local backend. Keep the terminal running while you use ChillZone. Press `Ctrl+C` in the terminal to stop the server.

## Notes

- This is a **local development setup**. The AI will work on your computer while the server is running; it will not make the GitHub Pages site use your local API key. For a public deployment, use a hosted backend and a server-side secret.
- The server binds only to `127.0.0.1`, so it listens on your own computer, not your local network.
- API usage can cost money. Set usage limits/budget alerts in your OpenAI account.
- The existing `chillzone-auto-blob-bootstrap` script in `index.html` is preserved byte-for-byte. It activates only on the specified GitHub Pages URL, so local VS Code testing is served from `http://localhost:3000` without changing that bootstrap.

