import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { request_id, event_type } = await req.json();

    // User-scoped read: the VerificationRequest RLS only returns the record
    // to its owner or to an admin, so this respects row-level security.
    const vr = await base44.entities.VerificationRequest.filter({ id: request_id }).then(r => r[0] || null);
    if (!vr) return Response.json({ error: 'Not found' }, { status: 404 });

    // New submission pending review -> notify all admins.
    // Only the requester who owns this verification request may trigger this.
    if (vr.status === 'pending') {
      if (vr.user_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      for (const admin of admins) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: 'New verification request awaiting review',
          body: `${user.full_name} (${user.email}) submitted a verification request.\n\nReview the submitted documents in the Admin Panel: Verifications tab.`,
        });
      }
      return Response.json({ ok: true, notified: 'admins' });
    }

    // Decision made -> notify the requester. Only an admin may trigger this.
    if (vr.status === 'approved' || vr.status === 'rejected') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (event_type === 'update') {
        // Never trust the client-supplied email/name on the request —
        // resolve the real account owner from the User entity.
        const owner = await base44.asServiceRole.entities.User.filter({ id: vr.user_id }).then(r => r[0] || null);
        if (owner) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: owner.email,
            subject: vr.status === 'approved' ? 'You are now ID Verified' : 'Verification request update',
            body: vr.status === 'approved'
              ? `Hi ${owner.full_name}, your verification was approved. Your listings and profile now show the ID Verified badge.`
              : `Hi ${owner.full_name}, unfortunately your verification request was not approved. ${vr.admin_notes || 'Please re-submit with clearer documents.'}`,
          });
        }
      }
      return Response.json({ ok: true, notified: 'user' });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}