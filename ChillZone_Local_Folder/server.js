const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// LOCAL-ONLY CONFIGURATION. Paste your own OpenAI API key between the quotes.
// Keep this file private: anyone who gets a copy of server.js can read the key.
// Do NOT put the key in index.html or commit this file/key to a public GitHub repo.
const API_KEY = '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';
const PORT = Number(process.env.PORT || 3000);
const MODEL = 'gpt-4o-mini';
const ROOT = __dirname;
const MAX_BODY = 100_000;

const modePrompts = {
  chat: 'You are ChillZone AI, a helpful, friendly assistant built into the ChillZone website. Answer clearly and adapt to the user. Be age-appropriate. If you are unsure, say so.',
  space: 'You are ChillZone AI in Space Expert mode. Explain astronomy, planets, stars, galaxies, space missions, and physics accurately in accessible language. Encourage curiosity and distinguish established facts from speculation.',
  games: 'You are ChillZone AI in Gaming Assistant mode. Help users discover games, explain game mechanics, offer strategy tips, and suggest suitable games. Do not claim you can see or launch a game unless the user tells you what is happening.',
  site: 'You are ChillZone AI in ChillZone Guide mode. Help people navigate ChillZone, including its Games, Trivia & Badges, Movies / Watch, Break Timer, Observe, Profile, and Settings areas. Do not claim to control the page or know its live state unless that information is provided.'
};
const personalities = {
  chill: 'Personality: relaxed, welcoming, and concise, with a light space-themed vibe.',
  funny: 'Personality: playful and witty, using occasional clean jokes and light slang without overdoing it.',
  smart: 'Personality: precise, organized, thoughtful, and clear. Explain reasoning in understandable steps.',
  cinematic: 'Personality: cinematic and imaginative, like a friendly mission-control narrator, while keeping factual answers accurate.'
};

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(payload));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > MAX_BODY) { reject(new Error('Request too large.')); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); }
      catch { reject(new Error('Invalid JSON request.')); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, configured: Boolean(API_KEY) });
  }
  if (req.method === 'POST' && url.pathname === '/api/chat') {
    if (!API_KEY) return sendJson(res, 503, { error: 'OpenAI API key is not configured. Paste your key into the API_KEY constant in server.js, then restart the server.' });
    let body;
    try { body = await readBody(req); }
    catch (error) { return sendJson(res, 400, { error: error.message || 'Invalid request.' }); }
    const mode = Object.hasOwn(modePrompts, body.mode) ? body.mode : 'chat';
    const personality = Object.hasOwn(personalities, body.personality) ? body.personality : 'chill';
    const incoming = Array.isArray(body.history) ? body.history.slice(-24) : [];
    const messages = [{ role: 'system', content: `${modePrompts[mode]} ${personalities[personality]} Keep responses safe, respectful, and suitable for a school-age audience. Never ask the user to reveal secrets or personal information.` }];
    for (const item of incoming) {
      if (!item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string') continue;
      const content = item.content.trim().slice(0, 6000);
      if (content) messages.push({ role: item.role, content });
    }
    if (messages.length < 2 || messages[messages.length - 1].role !== 'user') {
      return sendJson(res, 400, { error: 'Send a message before asking for a reply.' });
    }
    try {
      const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        body: JSON.stringify({ model: MODEL, messages, temperature: personality === 'funny' ? 0.85 : 0.65, max_tokens: 900 }),
        signal: AbortSignal.timeout(45_000)
      });
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        const message = data && data.error && data.error.message ? data.error.message : `OpenAI request failed (HTTP ${upstream.status}).`;
        const status = upstream.status === 401 ? 502 : upstream.status === 429 ? 429 : 502;
        return sendJson(res, status, { error: message });
      }
      const answer = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (typeof answer !== 'string' || !answer.trim()) return sendJson(res, 502, { error: 'The model returned an empty response. Please try again.' });
      return sendJson(res, 200, { answer: answer.trim() });
    } catch (error) {
      const message = error && error.name === 'TimeoutError' ? 'The AI request timed out. Please try again.' : 'Could not reach OpenAI. Check your internet connection and API account limits.';
      return sendJson(res, 502, { error: message });
    }
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'Method not allowed.' });
  const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const resolved = path.resolve(ROOT, `.${requested}`);
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) return sendJson(res, 403, { error: 'Forbidden.' });
  fs.readFile(resolved, (err, contents) => {
    if (err) return sendJson(res, 404, { error: 'File not found.' });
    const ext = path.extname(resolved).toLowerCase();
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') return res.end();
    res.end(contents);
  });
});
server.listen(PORT, '127.0.0.1', () => {
  console.log(`ChillZone local server running at http://localhost:${PORT}`);
  if (!API_KEY || API_KEY === 'PASTE_YOUR_OPENAI_API_KEY_HERE') console.log('No API key detected yet. Paste it into the API_KEY constant in server.js, then restart the server.');
  console.log('This server listens only on your own computer (127.0.0.1).');
});
