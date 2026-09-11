import { useState, useEffect } from 'react';
import { getSignedFileUrl } from '@/lib/secureFiles';

function EvidenceThumb({ disputeId, fileUri, index }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSignedFileUrl('dispute', disputeId, fileUri)
      .then(signed => { if (!cancelled) { signed ? setUrl(signed) : setFailed(true); } })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [disputeId, fileUri]);

  return (
    <a href={url || '#'} target="_blank" rel="noopener noreferrer" tabIndex={url ? 0 : -1}
      className="w-20 h-20 rounded-lg overflow-hidden border border-border bg-secondary block hover:opacity-80 transition-opacity flex items-center justify-center">
      {url && !failed ? (
        <img src={url} alt={`Evidence ${index + 1}`} className="w-full h-full object-cover" />
      ) : failed ? (
        <span className="text-xs text-muted-foreground text-center px-1">Unavailable</span>
      ) : (
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      )}
    </a>
  );
}

export default function EvidenceGrid({ disputeId, evidenceUrls }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {evidenceUrls.map((fileUri, i) => (
        <EvidenceThumb key={`${fileUri}-${i}`} disputeId={disputeId} fileUri={fileUri} index={i} />
      ))}
    </div>
  );
}