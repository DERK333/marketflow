import { base44 } from '@/api/base44Client';

// Fetches a short-lived signed URL for a private document attached to a
// VerificationRequest ('verification') or Dispute ('dispute'). The backend
// enforces that the caller may access the record the file belongs to.
export async function getSignedFileUrl(recordType, recordId, fileUri) {
  const res = await base44.functions.invoke('createSecureFileUrl', {
    record_type: recordType,
    record_id: recordId,
    file_uri: fileUri,
  });
  return res?.data?.signed_url ?? res?.signed_url ?? null;
}