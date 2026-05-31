module.exports = {
  apps: [
    {
      name: 'mallumatch-backend',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        FRONTEND_URL: 'https://mallu-match.vercel.app'
      }
    }
  ]
};
