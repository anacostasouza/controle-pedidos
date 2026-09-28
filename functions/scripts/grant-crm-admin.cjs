// Operator-only bootstrap. Uses Application Default Credentials, never browser credentials.
const admin = require('firebase-admin');
const projectId = process.env.CRM_PROJECT_ID;
const uid = process.env.CRM_ADMIN_UID;
if (!projectId || !uid) throw new Error('Defina CRM_PROJECT_ID e CRM_ADMIN_UID explicitamente.');
admin.initializeApp({ projectId });
(async () => {
  const user = await admin.firestore().collection('usuarios').doc(uid).get();
  if (!user.exists || user.data().statusConta === false) throw new Error('O usuário precisa existir e estar ativo na base usuarios.');
  await admin.firestore().collection('crmAcessos').doc(uid).set({ role: 'admin', enabled: true, at: new Date().toISOString(), by: 'operator-bootstrap' });
  console.log('Administrador do CRM habilitado. Os demais perfis podem ser definidos na tela Configurações.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
