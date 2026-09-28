// Explicit demo-only guard: refuses a real project and refuses missing emulator hosts.
const admin = require('firebase-admin');
const projectId = process.env.CRM_PROJECT_ID || 'demo-crm';
if (!projectId.startsWith('demo-') || !process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Use projeto demo-* e configure os dois emuladores.');
admin.initializeApp({ projectId });
(async () => {
  const uid='crm-demo-admin', email='desenhar@gmail.com', password='DemoCRM2026!';
  try { await admin.auth().getUser(uid); } catch { await admin.auth().createUser({uid,email,password,displayName:'Ana Martins',emailVerified:true}); }
  const now=new Date().toISOString();
  await admin.firestore().collection('usuarios').doc(uid).set({displayName:'Ana Martins',email,setor:'SUPORTE',setorNome:'Suporte',statusConta:true,usuarioID:uid,emailVerified:true,createdAt:now,updatedAt:now});
  await admin.firestore().collection('crmAcessos').doc(uid).set({role:'admin',enabled:true,by:'demo-seed',at:now});
  console.log(`Emulador pronto: ${email} / ${password}. Nenhum dado de produção foi acessado.`);
})().catch(error => { console.error(error.message); process.exitCode=1; });
