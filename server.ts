import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/auth/google/url', (req, res) => {
    const redirectUri = req.query.redirectUri as string;
    if (!redirectUri) {
      return res.status(400).json({ error: 'redirectUri is required' });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const scopes = [
      'https://www.googleapis.com/auth/drive.readonly'
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: redirectUri
    });

    res.json({ url });
  });

  app.get(['/api/auth/google/callback', '/api/auth/google/callback/'], async (req, res) => {
    const { code, state } = req.query;
    const redirectUri = state as string;

    if (!code || !redirectUri) {
      return res.status(400).send('Missing code or state (redirectUri)');
    }

    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );

      const { tokens } = await oauth2Client.getToken(code as string);

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  tokens: ${JSON.stringify(tokens)} 
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Autenticação concluída. Esta janela será fechada automaticamente.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      res.status(500).send('Authentication failed');
    }
  });

  app.post('/api/drive/folders', async (req, res) => {
    const { access_token } = req.body;
    if (!access_token) return res.status(401).json({ error: 'No access token provided' });

    try {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token });

      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      const response = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id, name)',
        spaces: 'drive',
        orderBy: 'name',
      });

      res.json({ folders: response.data.files });
    } catch (error) {
      console.error('Error fetching folders:', error);
      res.status(500).json({ error: 'Failed to fetch folders' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
