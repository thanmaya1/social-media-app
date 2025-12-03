const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const redisClient = require('../utils/redisClient');
const crypto = require('crypto');
const { sendMail } = require('../utils/email');

const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '15m';
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '7d';
const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;

function signAccess(user) {
  return jwt.sign({ id: user._id, roles: user.roles }, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES,
  });
}

function signRefresh(user) {
  return jwt.sign({ id: user._id }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

exports.register = async (req, res, next) => {
  try {
    // debug logging removed
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });

    const existing = await User.findOne({ $or: [{ email }, { username }] }).lean();
    if (existing) return res.status(400).json({ error: 'Email or username already in use' });

    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(password, salt);

    const user = await User.create({ username, email, password: hashed });

    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);

    // store refresh token (Redis preferred)
    if (redisClient.isEnabled()) {
      // store token in Redis with TTL (seconds)
      await redisClient.addRefresh(user._id, refreshToken);
    } else {
      user.refreshTokens.push(refreshToken);
      await user.save();
    }

    res.json({
      user: { id: user._id, username: user.username, email: user.email },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);

    if (redisClient.isEnabled()) {
      await redisClient.addRefresh(user._id, refreshToken);
    } else {
      user.refreshTokens.push(refreshToken);
      await user.save();
    }

    res.json({
      user: { id: user._id, username: user.username, email: user.email },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'No refresh token provided' });

    let payload;
    try {
      payload = jwt.verify(refreshToken, REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    // Try an atomic rotation: remove the used token and push a newly-signed one
    // include a small random/timestamp field so the new refresh token string is never identical
    const newRefresh = jwt.sign({ id: payload.id, rnd: Date.now() }, REFRESH_SECRET, {
      expiresIn: REFRESH_EXPIRES,
    });

    if (redisClient.isEnabled()) {
      // Try Redis atomic rotate
      const rotated = await redisClient.rotateRefresh(refreshToken, newRefresh, payload.id);
      if (!rotated) {
        // token reuse or missing
        await redisClient.clearAllForUser(payload.id);
        return res.status(401).json({ error: 'Refresh token reuse detected' });
      }

      const userDoc = await User.findById(payload.id);
      const newAccess = jwt.sign({ id: userDoc._id, roles: userDoc.roles }, ACCESS_SECRET, {
        expiresIn: ACCESS_EXPIRES,
      });
      return res.json({ accessToken: newAccess, refreshToken: newRefresh });
    }

    // Fallback to Mongo rotation (aggregation pipeline)
    const updated = await User.findOneAndUpdate(
      { _id: payload.id, refreshTokens: refreshToken },
      [
        {
          $set: {
            refreshTokens: {
              $concatArrays: [
                {
                  $filter: {
                    input: '$refreshTokens',
                    as: 't',
                    cond: { $ne: ['$$t', refreshToken] },
                  },
                },
                [newRefresh],
              ],
            },
          },
        },
      ],
      { new: true }
    );

    if (!updated) {
      // possible token reuse/theft — clear stored tokens for safety
      await User.findByIdAndUpdate(payload.id, { $set: { refreshTokens: [] } });
      return res.status(401).json({ error: 'Refresh token reuse detected' });
    }

    const newAccess = jwt.sign({ id: updated._id, roles: updated.roles }, ACCESS_SECRET, {
      expiresIn: ACCESS_EXPIRES,
    });
    res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'No refresh token provided' });

    let payload;
    try {
      payload = jwt.verify(refreshToken, REFRESH_SECRET);
    } catch (err) {
      // token invalid, but just return success
      return res.json({ ok: true });
    }

    const user = await User.findById(payload.id);
    if (!user) return res.json({ ok: true });

    if (redisClient.isEnabled()) {
      await redisClient.removeRefresh(refreshToken);
    } else {
      user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
      await user.save();
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// Request password reset
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const user = await User.findOne({ email });
    if (!user) return res.json({ ok: true }); // don't reveal existence

    const token = crypto.randomBytes(24).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpire = Date.now() + 1000 * 60 * 60; // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL || ''}/reset-password/${token}`;
    const text = `Reset your password by visiting: ${resetUrl}`;
    await sendMail({ to: user.email, subject: 'Password reset', text });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// Reset password using token
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Invalid request' });
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// Verify email
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });
    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.status(400).json({ error: 'Invalid token' });
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// Resend verification
exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });
    if (user.isVerified) return res.json({ ok: true });
    const token = crypto.randomBytes(24).toString('hex');
    user.verificationToken = token;
    await user.save();
    const verifyUrl = `${process.env.CLIENT_URL || ''}/verify-email?token=${token}`;
    await sendMail({ to: user.email, subject: 'Verify your email', text: `Verify: ${verifyUrl}` });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// OAuth redirect handler. After passport authentication this endpoint will
// issue access/refresh tokens and redirect the user back to the client with
// tokens in the query string (or respond with JSON if CLIENT_URL not set).
exports.oauthRedirect = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return res.status(400).json({ error: 'Authentication failed' });

    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);

    if (redisClient.isEnabled()) {
      await redisClient.addRefresh(user._id, refreshToken);
    } else {
      // ensure token stored if user model has refreshTokens
      user.refreshTokens = user.refreshTokens || [];
      user.refreshTokens.push(refreshToken);
      await user.save();
    }

    const clientUrl = process.env.CLIENT_URL;
    if (clientUrl) {
      // Redirect with tokens in query (client should read and store them)
      const redirectUrl = new URL(clientUrl);
      redirectUrl.searchParams.set('accessToken', accessToken);
      redirectUrl.searchParams.set('refreshToken', refreshToken);
      // preserve OAuth `state` if provided by the provider callback
      const state = req.query && req.query.state ? req.query.state : undefined;
      if (state) redirectUrl.searchParams.set('state', state);
      return res.redirect(302, redirectUrl.toString());
    }

    // Fallback to JSON response
    return res.json({ user: { id: user._id, username: user.username, email: user.email }, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
};
