const { spawn } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const serviceAccount = path.join(root, 'scripts', 'serviceAccount.json');
const firebaseCli = path.join(root, 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js');
const env = {
  ...process.env,
  GOOGLE_APPLICATION_CREDENTIALS: serviceAccount,
  CRM_PROJECT_ID: process.env.CRM_PROJECT_ID || 'gestaopedidos-desenhar',
};

const child = spawn(process.execPath, [firebaseCli, 'emulators:start', '--only', 'functions', '--config', '../firebase.crm.json', '--project', env.CRM_PROJECT_ID], {
  cwd: root,
  env,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
