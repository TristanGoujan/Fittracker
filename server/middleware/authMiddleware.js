const jwt = require('jsonwebtoken')

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = payload
    next()
  } catch {
    res.status(403).json({ error: 'Token invalide ou expiré' })
  }
}

module.exports = authMiddleware
