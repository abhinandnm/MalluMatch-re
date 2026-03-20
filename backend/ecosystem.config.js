module.exports = {
  apps: [
    {
      name: 'mallumatch-backend',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
