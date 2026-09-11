import { useState } from 'react';
import { Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSignedFileUrl } from '@/lib/secureFiles';
import { toast } from 'sonner';

export default function ViewDocButton({ recordType, recordId, fileUri, label }) {
  const [loading, setLoading] = useState(false);

  const handleView = async () => {
    setLoading(true);
    try {
      const url = await getSignedFileUrl(recordType, recordId, fileUri);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        toast.error('Could not open the document');
      }
    } catch (e) {
      toast.error('Could not open the document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" className="border-border rounded-lg h-8 text-xs"
      onClick={handleView} disabled={loading}>
      {loading
        ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        : <Eye className="w-3 h-3 mr-1" />} {label}
    </Button>
  );
}