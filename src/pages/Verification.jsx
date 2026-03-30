import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, CheckCircle, Clock, Upload, AlertCircle, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function Verification() {
  const [user, setUser] = useState(null);
  const [existing, setExisting] = useState(null);
  const [accountType, setAccountType] = useState('individual');
  const [businessName, setBusinessName] = useState('');
  const [idUploading, setIdUploading] = useState(false);
  const [bizUploading, setBizUploading] = useState(false);
  const [idUrl, setIdUrl] = useState('');
  const [bizUrl, setBizUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(async u => {
      setUser(u);
      const reqs = await base44.entities.VerificationRequest.filter({ user_id: u.id }, '-created_date', 1);
      setExisting(reqs[0] || null);
    }).catch(() => base44.auth.redirectToLogin())
      .finally(() => setLoading(false));
  }, []);

  const handleIdUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIdUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setIdUrl(file_url);
    setIdUploading(false);
    toast.success('ID document uploaded');
  };

  const handleBizUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBizUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setBizUrl(file_url);
    setBizUploading(false);
    toast.success('Business document uploaded');
  };

  const handleSubmit = async () => {
    if (!idUrl) { toast.error('Please upload your ID document'); return; }
    if (accountType === 'business' && !businessName) { toast.error('Enter business name'); return; }
    setSubmitting(true);
    await base44.entities.VerificationRequest.create({
      user_id: user.id,
      user_name: user.full_name,
      user_email: user.email,
      account_type: accountType,
      id_document_url: idUrl,
      business_name: businessName || undefined,
      business_document_url: bizUrl || undefined,
      status: 'pending',
    });
    await base44.auth.updateMe({ verification_status: 'pending', account_type: accountType, business_name: businessName || undefined });
    const reqs = await base44.entities.VerificationRequest.filter({ user_id: user.id }, '-created_date', 1);
    setExisting(reqs[0]);
    toast.success('Verification request submitted!');
    setSubmitting(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const StatusBlock = () => {
    if (user?.verification_status === 'verified') return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>
        <h2 className="font-syne text-2xl font-800 text-foreground">You're Verified!</h2>
        <p className="text-muted-foreground max-w-sm">Your identity has been confirmed. You can now list items and buy with full trust.</p>
        <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-1.5">ID Verified Seller</Badge>
      </div>
    );

    if (user?.verification_status === 'pending' || existing?.status === 'pending') return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
          <Clock className="w-8 h-8 text-yellow-400" />
        </div>
        <h2 className="font-syne text-2xl font-800 text-foreground">Under Review</h2>
        <p className="text-muted-foreground max-w-sm">Your verification request is being reviewed. This usually takes 1–2 business days.</p>
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 px-4 py-1.5">Pending Review</Badge>
      </div>
    );

    if (user?.verification_status === 'rejected' || existing?.status === 'rejected') return (
      <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex gap-3">
        <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-destructive">Verification Rejected</p>
          <p className="text-sm text-muted-foreground mt-1">{existing?.admin_notes || 'Please re-submit with clearer documents.'}</p>
        </div>
      </div>
    );

    return null;
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-syne text-2xl font-800 text-foreground">Get Verified</h1>
          <p className="text-sm text-muted-foreground">Required to sell on TradeVault</p>
        </div>
      </div>

      <StatusBlock />

      {user?.verification_status !== 'verified' && user?.verification_status !== 'pending' && existing?.status !== 'pending' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-secondary/50 border border-border">
            <h3 className="font-semibold text-foreground mb-2">Why verification?</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" />Builds trust with buyers</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" />Required to create listings</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" />Protects against fraud</li>
            </ul>
          </div>

          <div>
            <Label className="text-sm font-semibold text-foreground mb-1.5 block">Account Type</Label>
            <Select value={accountType} onValueChange={setAccountType}>
              <SelectTrigger className="bg-secondary border-border rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="business">Business</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {accountType === 'business' && (
            <div>
              <Label className="text-sm font-semibold text-foreground mb-1.5 block">Business Name</Label>
              <Input value={businessName} onChange={e => setBusinessName(e.target.value)}
                placeholder="Legal business name" className="bg-secondary border-border rounded-xl" />
            </div>
          )}

          <div>
            <Label className="text-sm font-semibold text-foreground mb-1.5 block">Government ID *</Label>
            <p className="text-xs text-muted-foreground mb-3">Passport, driver's license, or national ID</p>
            <label className={`flex items-center gap-3 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${idUrl ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/30'}`}>
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleIdUpload} />
              {idUploading ? (
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : idUrl ? (
                <FileCheck className="w-5 h-5 text-primary" />
              ) : (
                <Upload className="w-5 h-5 text-muted-foreground" />
              )}
              <span className={`text-sm ${idUrl ? 'text-primary' : 'text-muted-foreground'}`}>
                {idUrl ? 'Document uploaded ✓' : 'Upload ID document'}
              </span>
            </label>
          </div>

          {accountType === 'business' && (
            <div>
              <Label className="text-sm font-semibold text-foreground mb-1.5 block">Business Registration (optional)</Label>
              <label className={`flex items-center gap-3 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${bizUrl ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleBizUpload} />
                {bizUploading ? (
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : bizUrl ? (
                  <FileCheck className="w-5 h-5 text-primary" />
                ) : (
                  <Upload className="w-5 h-5 text-muted-foreground" />
                )}
                <span className={`text-sm ${bizUrl ? 'text-primary' : 'text-muted-foreground'}`}>
                  {bizUrl ? 'Document uploaded ✓' : 'Upload business document'}
                </span>
              </label>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={submitting || !idUrl}
            className="w-full h-12 bg-primary text-primary-foreground text-base font-semibold rounded-xl hover:bg-primary/90">
            {submitting ? 'Submitting...' : 'Submit for Verification'}
          </Button>
        </div>
      )}
    </div>
  );
}