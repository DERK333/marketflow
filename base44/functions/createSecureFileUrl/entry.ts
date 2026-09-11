import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Returns a short-lived signed URL for a private document stored on a
// VerificationRequest or Dispute. Access is enforced by the entity's own
// row-level security: the user-scoped read only returns the record to its
// owner (or the buyer/seller/admin for disputes), and the file must be one
// of the documents attached to that record.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { record_type, record_id, file_uri } = body || {};
    if (!record_type || !record_id || typeof file_uri !== 'string' || !file_uri)
      return Response.json({ error: 'Invalid request' }, { status: 400 });

    let record = null;
    try {
      if (record_type === 'verification') {
        record = await base44.entities.VerificationRequest.get(record_id);
      } else if (record_type === 'dispute') {
        record = await base44.entities.Dispute.get(record_id);
      } else {
        return Response.json({ error: 'Unknown record type' }, { status: 400 });
      }
    } catch (e) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    if (!record) return Response.json({ error: 'Not found' }, { status: 404 });

    const attached = [
      record.id_document_url,
      record.business_document_url,
      ...(Array.isArray(record.evidence_urls) ? record.evidence_urls : []),
    ].filter(Boolean);
    if (!attached.includes(file_uri))
      return Response.json({ error: 'File is not part of this record' }, { status: 403 });

    // Legacy records created before private storage hold ordinary public URLs.
    if (/^https?:\/\//i.test(file_uri)) return Response.json({ signed_url: file_uri });

    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri,
      expires_in: 300,
    });
    return Response.json({ signed_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}