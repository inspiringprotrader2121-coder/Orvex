module.exports = {
  apps: [
    {
      name: 'orvex-web',
      cwd: __dirname,
      env_file: '.env',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'orvex-worker',
      cwd: __dirname,
      env_file: '.env',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'src/worker.ts',
      env: {
        NODE_ENV: 'production',
        TS_NODE_PROJECT: 'tsconfig.json'
      }
    },
    {
      name: 'orvex-socket',
      cwd: __dirname,
      env_file: '.env',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'src/socket-server.ts',
      env: {
        NODE_ENV: 'production',
        SOCKET_PORT: 3001
      }
    }
  ]
};
