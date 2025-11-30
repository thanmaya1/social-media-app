const User = require('../models/User');

// Simple user search (paginated)
exports.searchUsers = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const skip = (page - 1) * limit;

    const filter = q
      ? { $or: [ { username: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } } ] }
      : {};

    const users = await User.find(filter).select('username profilePicture bio').skip(skip).limit(limit).lean();
    res.json({ users, page, limit });
  } catch (err) {
    next(err);
  }
};
