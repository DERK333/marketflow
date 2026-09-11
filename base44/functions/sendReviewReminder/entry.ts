import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Shared secret passed only by the Review Reminder workflow — direct external
// calls without it are rejected (the workflow runs without a logged-in user,
// so a shared secret is the caller verification for this endpoint).
const WORKFLOW_SECRET = 'mf-review-reminder-7f3a9c2e41';

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    if (!body || body.workflow_secret !== WORKFLOW_SECRET || !body.transaction_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const transactionId = body.transaction_id;

    const service = base44.asServiceRole;
    const transactions = await service.entities.Transaction.filter({ id: transactionId });
    const tx = transactions[0];
    if (!tx) return Response.json({ sent: false, reason: 'transaction_not_found' });
    if (tx.status !== 'completed') return Response.json({ sent: false, reason: 'transaction_not_completed' });

    // skip if the buyer already left a review for this transaction
    const existingReviews = await service.entities.Review.filter({ transaction_id: transactionId });
    if (existingReviews.length > 0) return Response.json({ sent: false, reason: 'review_already_exists' });

    const buyers = await service.entities.User.filter({ id: tx.buyer_id });
    const buyer = buyers[0];
    if (!buyer || !buyer.email) return Response.json({ sent: false, reason: 'buyer_email_unavailable' });

    const firstName = escapeHtml((buyer.full_name || 'there').split(' ')[0]);
    const title = escapeHtml(tx.listing_title || 'your recent purchase');
    const sellerName = escapeHtml(tx.seller_name || 'the seller');

    await service.integrations.Core.SendEmail({
      to: buyer.email,
      subject: `How was your purchase? Leave a review`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
          <h2 style="margin-bottom: 8px;">Hi ${firstName},</h2>
          <p style="margin: 0 0 12px;">Your purchase of <strong>${title}</strong> is complete. Reviews help other buyers shop with confidence and let ${sellerName} know how they did.</p>
          <p style="margin: 0 0 20px;">It only takes a minute — leave your review from the Orders page.</p>
          <a href="https://smart-trade-flow-app.base44.app/orders"
             style="display: inline-block; background: #f59e0b; color: #111318; font-weight: bold; padding: 10px 20px; border-radius: 8px; text-decoration: none;">
            Leave a Review
          </a>
          <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">You're receiving this because you completed a purchase on the marketplace.</p>
        </div>
      `,
    });

    return Response.json({ sent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}