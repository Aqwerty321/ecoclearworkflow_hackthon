import { config } from 'dotenv';
config();

import '@/ai/flows/generate-meeting-gist.ts';
import '@/ai/flows/generate-minutes-of-meeting-draft.ts';
import '@/ai/flows/scrutiny-document-summary-and-flagging.ts';
import '@/ai/flows/regulatory-compliance-check.ts';