const passport = require('passport');
// Strategies are optional and registered only if env vars present
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');
const crypto = require('crypto');

function makeUsername(base) {
  const suffix = Math.floor(Math.random() * 9000) + 1000;
  return `${base.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 12)}${suffix}`;
}

async function findOrCreateSocialUser({ email, displayName, photo }) {
  if (!email) throw new Error('Email required from provider');
  let user = await User.findOne({ email });
  if (user) {
    // update profile picture if missing
    if (!user.profilePicture && photo) user.profilePicture = photo;
    await user.save();
    return user;
  }

  // create a new user with random password; mark verified
  const unameBase = email.split('@')[0] || displayName || 'user';
  const username = makeUsername(unameBase);
  const randomPassword = crypto.randomBytes(20).toString('hex');
  // bcrypt lazily in controller to avoid circular requires; set raw password then hash later
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(randomPassword, salt);

  // Determine whether social signups should be auto-verified. Default: false
  let autoVerify = false;
  try {
    // try to read from Settings collection if present
    // require lazily to avoid startup ordering issues
    // eslint-disable-next-line global-require
    const Setting = require('../models/Setting');
    const s = await Setting.findOne({ key: 'autoVerifySocial' }).lean();
    if (s && typeof s.value === 'boolean') autoVerify = !!s.value;
  } catch (e) {
    // ignore — fallback to env var
    if (process.env.AUTO_VERIFY_SOCIAL === 'true') autoVerify = true;
  }

  user = await User.create({
    username,
    email,
    password: hashed,
    profilePicture: photo || undefined,
    isVerified: autoVerify,
  });
  return user;
}

function configurePassport() {
  // Google
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL:
            process.env.GOOGLE_CALLBACK_URL || `${process.env.SERVER_URL || ''}/api/auth/google/callback`,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = (profile.emails && profile.emails[0] && profile.emails[0].value) || null;
            const photo = (profile.photos && profile.photos[0] && profile.photos[0].value) || null;
            const displayName = profile.displayName || '';
            const user = await findOrCreateSocialUser({ email, displayName, photo });
            return done(null, user);
          } catch (e) {
            return done(e);
          }
        }
      )
    );
  }

  // GitHub
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL:
            process.env.GITHUB_CALLBACK_URL || `${process.env.SERVER_URL || ''}/api/auth/github/callback`,
          scope: ['user:email'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // GitHub may return multiple emails; look for the primary one
            let email = null;
            if (profile.emails && profile.emails.length) {
              email = profile.emails.find((e) => e.primary)?.value || profile.emails[0].value;
            }
            const photo = (profile.photos && profile.photos[0] && profile.photos[0].value) || null;
            const displayName = profile.displayName || profile.username || '';
            const user = await findOrCreateSocialUser({ email, displayName, photo });
            return done(null, user);
          } catch (e) {
            return done(e);
          }
        }
      )
    );
  }
}

module.exports = { configurePassport, passport };
