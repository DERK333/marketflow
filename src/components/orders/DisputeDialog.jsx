import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const REASONS = [
  { value: 'item_not_received', label: 'Item not received' },
  { value: 'item_not_as_described', label: 'Item not as described' },
  { value: 'damaged_item', label: 'Item arrived damaged' },
  { value: 'wrong_item', label: 'Wrong item received' },
  { value: 'other', label: 'Other' },
];

export default function DisputeDialog({ tx, user, onDisputed }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setEvidenceFiles(prev => [...prev, ...files].slice(0, 5));
  };

  const removeFile = (idx) => setEvidenceFiles(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!reason || !description.trim()) {
      toast.error('Please select a reason and describe the issue');
      return;
    }
    setSubmitting(true);
    try {
      // Upload evidence images
      let evidenceUrls = [];
      if (evidenceFiles.length > 0) {
        setUploading(true);
        evidenceUrls = await Promise.all(
          evidenceFiles.map(file => base44.integrations.Core.UploadFile({ file }).then(r => r.file_url))
        );
        setUploading(false);
      }

      // Create dispute record
      await base44.entities.Dispute.create({
        transaction_id: tx.id,
        listing_title: tx.listing_title,
        buyer_id: user.id,
        buyer_name: user.full_name,
        seller_id: tx.seller_id,
        seller_name: tx.seller_name,
        amount: tx.amount,
        reason,
        description: description.trim(),
        evidence_urls: evidenceUrls,
        status: 'open',
      });

      // Update transaction status to disputed
      await base44.entities.Transaction.update(tx.id, { status: 'disputed' });

      toast.success('Dispute filed. Our team will review within 24–48 hours.');
      onDisputed(tx.id);
      setOpen(false);
      setReason('');
      setDescription('');
      setEvidenceFiles([]);
    } catch (err) {
      toast.error('Failed to submit dispute. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"
          className="border-destructive/40 text-destructive hover:bg-destructive/10 rounded-lg h-7 text-xs gap-1">
          <AlertTriangle className="w-3 h-3" /> Report Issue
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" /> Report an Issue
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="p-3 rounded-lg bg-secondary/50 text-sm text-muted-foreground">
            <strong className="text-foreground">{tx.listing_title}</strong>
            <span className="ml-2 text-primary font-semibold">${tx.amount?.toLocaleString()}</span>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-2">What's the issue?</p>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {REASONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-2">Describe the problem</p>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Please provide as much detail as possible..."
              className="bg-secondary border-border resize-none"
              rows={4}
            />
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-2">Evidence photos <span className="text-muted-foreground font-normal">(optional, max 5)</span></p>
            <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-xl px-4 py-3 hover:border-primary/50 hover:bg-secondary/50 transition-colors text-sm text-muted-foreground">
              <Upload className="w-4 h-4" />
              <span>Upload photos of damaged / wrong items</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
            </label>
            {evidenceFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {evidenceFiles.map((file, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border bg-secondary">
                    <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeFile(i)}
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-destructive flex items-center justify-center">
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400">
            ⚠️ Filing a dispute will freeze funds and notify our admin team. Please only use this for genuine issues.
          </div>

          <Button onClick={handleSubmit} disabled={submitting || uploading}
            className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading evidence...</> :
             submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> :
             'Submit Dispute'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}