// server/config/config.js
// Central config — swap env vars here for production

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'codeazy_super_secret_jwt_key_2024',
  jwtExpiresIn: '7d',
  dataDir: require('path').join(__dirname, '../data'),
};
