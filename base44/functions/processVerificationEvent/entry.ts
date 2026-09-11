import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const { request_id, event_type } = await req.json();
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const vr = await svc.entities.VerificationRequest.filter({ id: request_id }).then(r => r[0] || null);
    if (!vr) return Response.json({ ok: true, skipped: 'not_found' });

    // New submission pending review -> notify all admins
    if (vr.status === 'pending') {
      const admins = await svc.entities.User.filter({ role: 'admin' });
      for (const admin of admins) {
        await svc.integrations.Core.SendEmail({
          to: admin.email,
          subject: 'New verification request awaiting review',
          body: `${vr.user_name} (${vr.user_email}) submitted a ${vr.account_type} verification request.\n\nReview the submitted documents in the Admin Panel: Verifications tab.`,
        });
      }
      return Response.json({ ok: true, notified: 'admins', count: admins.length });
    }

    // Decision made -> notify the requester
    if (vr.status === 'approved' || vr.status === 'rejected') {
      if (event_type === 'update') {
        await svc.integrations.Core.SendEmail({
          to: vr.user_email,
          subject: vr.status === 'approved' ? 'You are now ID Verified' : 'Verification request update',
          body: vr.status === 'approved'
            ? `Hi ${vr.user_name}, your verification was approved. Your listings and profile now show the ID Verified badge.`
            : `Hi ${vr.user_name}, unfortunately your verification request was not approved. ${vr.admin_notes || 'Please re-submit with clearer documents.'}`,
        });
      }
      return Response.json({ ok: true, notified: 'user' });
    }

    return Response.json({ ok: true, skipped: vr.status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}