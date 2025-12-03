require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const crypto = require('crypto');
let compression;
try {
  // optional dependency in some environments
  // eslint-disable-next-line global-require
  compression = require('compression');
} catch (e) {
  // fallback to a no-op middleware factory
  // eslint-disable-next-line no-unused-vars
  compression = () => (req, res, next) => next();
}
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const csurf = require('csurf');
const path = require('path');
const fs = require('fs');
const { URL } = require('url');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const messageRoutes = require('./routes/messages');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');
  const healthRoutes = require('./routes/health');
const convRoutes = require('./routes/conversations');

function createApp() {
  const app = express();

  // Respect proxy headers (for Heroku / nginx / load balancers)
  app.set('trust proxy', true);

  // Sentry optional initialization (set SENTRY_DSN in environment to enable)
  try {
    if (process.env.SENTRY_DSN) {
      // eslint-disable-next-line global-require
      const Sentry = require('@sentry/node');
      // eslint-disable-next-line global-require
      const Tracing = require('@sentry/tracing');
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        integrations: [new Tracing.Integrations.Express({ app })],
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.0'),
      });
      // request handler must be first
      app.use(Sentry.Handlers.requestHandler());
      app.use(Sentry.Handlers.tracingHandler());
    }
  } catch (e) {
    // Sentry failed to initialize — continue without it
    // eslint-disable-next-line no-console
    console.warn('Sentry init failed:', e && e.message ? e.message : e);
  }

  // Initialize Passport (for social login) and configure strategies if env vars present
  try {
    // eslint-disable-next-line global-require
    const { configurePassport, passport } = require('./utils/passport');
    configurePassport();
    app.use(passport.initialize());
  } catch (e) {
    // if passport is not available don't crash the app
    // eslint-disable-next-line no-console
    console.warn('Passport initialization skipped:', e && e.message);
  }

  // Basic rate limiter for all requests
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit each IP to 200 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    // align trustProxy with Express setting to avoid permissive-trust-proxy error
    trustProxy: !!app.get('trust proxy'),
  });
  app.use(limiter);

  app.use(helmet());

  // Add HSTS in production to enforce HTTPS (trusted proxy environments)
  if (process.env.NODE_ENV === 'production') {
    try {
      app.use(
        // eslint-disable-next-line global-require
        require('helmet').hsts({ maxAge: 60 * 60 * 24 * 365, includeSubDomains: true, preload: true })
      );
    } catch (e) {
      // ignore if helmet.hsts not available
    }
  }

  // Enforce HTTPS in production (redirect HTTP -> HTTPS)
  if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      // req.secure is true when TLS termination happened upstream and trust proxy is enabled
      if (req.secure || (req.headers['x-forwarded-proto'] || '').includes('https')) return next();
      const host = req.headers.host;
      return res.redirect(301, `https://${host}${req.originalUrl}`);
    });
  }

  // Generate a per-request CSP nonce and set a strict Content-Security-Policy header.
  app.use((req, res, next) => {
    try {
      const nonce = crypto.randomBytes(16).toString('base64');
      res.locals.cspNonce = nonce;

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      const connectList = ["'self'", 'ws:', 'wss:', clientUrl, 'http://localhost:3001', 'http://localhost:3002']
        .join(' ');

      const scriptSrc = [`'self'`, `'nonce-${nonce}'`, "'unsafe-inline'", 'https://cdnjs.cloudflare.com'].join(' ');
      const csp = [
        "default-src 'self'",
        `script-src ${scriptSrc}`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob: https://res.cloudinary.com",
        `connect-src ${connectList}`,
        "font-src 'self' https://fonts.gstatic.com",
        "object-src 'none'",
        'upgrade-insecure-requests',
      ].join('; ');

      res.setHeader('Content-Security-Policy', csp);
    } catch (e) {
      // ignore nonce generation errors
    }
    return next();
  });
  // Additional recommended security headers
  app.use((req, res, next) => {
    // Referrer policy: no-referrer-when-downgrade is default, prefer strict-origin-when-cross-origin
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Permissions-Policy (formerly Feature-Policy) — disable camera/microphone by default
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    // DNS Prefetch Control: disable by default
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    return next();
  });
  // gzip/deflate compression for responses
  app.use(compression());
  app.use(express.json({ limit: '5mb' }));
  // cookie parser required for CSRF double-submit cookie strategy
  app.use(cookieParser());
  app.use(morgan('combined'));
  app.use(mongoSanitize());
  app.use(xss());

  // more strict CSP for production
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
        // allow websockets + local dev clients
        connectSrc: [
          "'self'",
          'ws:',
          'wss:',
          process.env.CLIENT_URL || 'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:3002',
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    })
  );

  // Allow CORS from local dev origins (any http://localhost:<port>) or configured CLIENT_URL
  const corsOptions = {
    credentials: true,
    origin: (origin, callback) => {
      // allow requests with no origin (mobile apps, curl)
      if (!origin) return callback(null, true);
      try {
        const u = new URL(origin); // Ensure URL is available
        if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return callback(null, true);
      } catch (e) {
        // invalid origin; not allowed by CORS
        // log at debug level for diagnostics
        // eslint-disable-next-line no-console
        console.warn('CORS origin parse failed:', e && e.message);
      }
      // allow configured client URL(s)
      const cfg = (process.env.CLIENT_URL || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (cfg.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'), false);
    },
  };
  app.use(cors(corsOptions));

  // CSRF protection (double-submit cookie). For cookie-based auth flows set
  // a `XSRF-TOKEN` cookie on safe (GET) requests and require the `x-csrf-token`
  // header for mutating requests. This supports SPAs that read the cookie and
  // set the header on requests.
  // For automated tests (NODE_ENV === 'test') we disable CSRF to simplify requests.
  let csrfProtection = null;
  if (process.env.NODE_ENV !== 'test') {
    csrfProtection = csurf({ cookie: true });
    // expose a lightweight endpoint to retrieve a CSRF token or set cookie on GETs
    app.get('/api/csrf-token', csrfProtection, (req, res) => {
      // generate token and set cookie (double-submit cookie)
      const token = req.csrfToken();
      res.cookie('XSRF-TOKEN', token, { httpOnly: false, sameSite: 'lax' });
      return res.json({ ok: true });
    });
  }

  // small convenience endpoint for SPA to fetch current profile
  // This endpoint will return { user: null } instead of 401 when no Authorization header present
  app.get('/api/profile', (req, res, next) => {
    const userController = require('./controllers/userController');
    const jwt = require('jsonwebtoken');
    const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.json({ user: null });

    const parts = authHeader.split(' ');
    if (parts.length !== 2) return res.json({ user: null });

    const [scheme, token] = parts;
    if (!/^Bearer$/i.test(scheme)) return res.json({ user: null });

    try {
      const decoded = jwt.verify(token, ACCESS_SECRET);
      // attach decoded user and delegate to controller
      req.user = decoded;
      return userController.getProfile(req, res, next);
    } catch (err) {
      return res.json({ user: null });
    }
  });

  // apply csrf protection to all state-mutating routes (POST/PUT/PATCH/DELETE)
  if (process.env.NODE_ENV !== 'test') {
    app.use((req, res, next) => {
      const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
      if (!mutating) return next();
      // run csurf middleware for mutating requests
      return csrfProtection(req, res, next);
    });
  }

  // serve uploaded files
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  app.use('/api/auth', authRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/reports', require('./routes/reports'));
  app.use('/api/messages', messageRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/api/conversations', convRoutes);
  // admin routes
  try {
    const adminRoutes = require('./routes/admin');
    app.use('/api/admin', adminRoutes);
  } catch (e) {
    // ignore if admin routes not present
  }

  // Start simple scheduler for scheduled posts (can be disabled with DISABLE_SCHEDULER)
  try {
    if (!process.env.DISABLE_SCHEDULER) {
      const { startScheduler } = require('./utils/scheduler');
      startScheduler(app);
    }
  } catch (e) {
    // ignore scheduler init errors
    // eslint-disable-next-line no-console
    console.warn('Scheduler not started:', e && e.message);
  }

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  // Serve client static build in production if present
  try {
    const clientDist = path.join(__dirname, '..', 'client', 'dist');
    if (process.env.NODE_ENV === 'production' && fs.existsSync(clientDist)) {
      app.use(express.static(clientDist));
      // serve index.html with optional CSP nonce injected for inline scripts
      const indexPath = path.join(clientDist, 'index.html');
      app.get('*', (req, res) => {
        try {
          let html = fs.readFileSync(indexPath, 'utf8');
          const nonce = res.locals && res.locals.cspNonce;
          if (nonce) {
            // inject a meta tag with the nonce so client scripts may read it if needed
            // place before </head>
            const meta = `<meta name="csp-nonce" content="${nonce}">`;
            if (html.includes('</head>')) html = html.replace('</head>', `${meta}</head>`);
          }
          res.setHeader('Content-Type', 'text/html');
          return res.send(html);
        } catch (e) {
          return res.sendFile(path.join(clientDist, 'index.html'));
        }
      });
    }
  } catch (e) {
    // ignore if static files not present
  }

  // error handler
  /* eslint-disable-next-line no-unused-vars */
  app.use((err, req, res, _next) => {
    logger.error(err);
    // report to Sentry if enabled
    try {
      if (process.env.SENTRY_DSN) {
        // eslint-disable-next-line global-require
        const Sentry = require('@sentry/node');
        Sentry.captureException(err);
      }
    } catch (e) {
      // ignore Sentry errors
    }
    res.status(err.status || 500).json({ error: err.message || 'Server error' });
  });

  return app;
}

module.exports = { createApp };
