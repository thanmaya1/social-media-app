const User = require('../models/User');

// returns true if either `a` has blocked `b` or `b` has blocked `a`
async function isBlocked(a, b) {
  if (!a || !b) return false;
  try {
    const [userA, userB] = await Promise.all([
      User.findById(a).select('blockedUsers').lean(),
      User.findById(b).select('blockedUsers').lean(),
    ]);
    if (!userA || !userB) return false;
    const aBlocksB = (userA.blockedUsers || []).some((id) => id.toString() === b.toString());
    const bBlocksA = (userB.blockedUsers || []).some((id) => id.toString() === a.toString());
    return aBlocksB || bBlocksA;
  } catch (e) {
    // on error be permissive (do not block) but log in real app
    return false;
  }
}

module.exports = { isBlocked };
