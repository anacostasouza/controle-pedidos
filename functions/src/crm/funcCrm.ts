import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { createCrmApp, runArchiveSweep } from './api';
export const crmApi = onRequest({ region: 'southamerica-east1', timeoutSeconds: 120 }, createCrmApp());
export const crmArchiveDaily = onSchedule({ region: 'southamerica-east1', schedule: 'every day 06:00', timeZone: 'America/Sao_Paulo', timeoutSeconds: 540, retryCount: 3 }, async () => { await runArchiveSweep(); });
