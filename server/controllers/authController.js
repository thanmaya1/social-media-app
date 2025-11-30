const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '15m';
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '7d';
const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;

function signAccess(user) {
  return jwt.sign({ id: user._id, roles: user.roles }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
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

    // store refresh token
    user.refreshTokens.push(refreshToken);
    await user.save();

    res.json({ user: { id: user._id, username: user.username, email: user.email }, accessToken, refreshToken });
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

    user.refreshTokens.push(refreshToken);
    await user.save();

    res.json({ user: { id: user._id, username: user.username, email: user.email }, accessToken, refreshToken });
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
    const newRefresh = jwt.sign({ id: payload.id, rnd: Date.now() }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
    // Use an aggregation-style update pipeline to atomically remove the old token and append the new one
    const updated = await User.findOneAndUpdate(
      { _id: payload.id, refreshTokens: refreshToken },
      [
        {
          $set: {
            refreshTokens: {
              $concatArrays: [
                { $filter: { input: '$refreshTokens', as: 't', cond: { $ne: ['$$t', refreshToken] } } },
                [newRefresh]
              ]
            }
          }
        }
      ],
      { new: true }
    );
    // rotation complete
    if (!updated) {
      // possible token reuse/theft — clear stored tokens for safety
      await User.findByIdAndUpdate(payload.id, { $set: { refreshTokens: [] } });
      return res.status(401).json({ error: 'Refresh token reuse detected' });
    }

    const newAccess = jwt.sign({ id: updated._id, roles: updated.roles }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
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

    user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
    await user.save();

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
