import { CheckCircle2, XCircle, Loader2, Link2, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PLATFORM_ICONS = {
  tiktok: 'T',
  instagram: 'I',
  youtube_shorts: 'Y',
};

const PLATFORM_LABELS = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube_shorts: 'YouTube Shorts',
};

/**
 * AccountCard -- shows connection status for a social media platform.
 * Connected: success border/bg. Disconnected: muted border/bg.
 */
export default function AccountCard({ platform, account, isLoading, onConnect, onDisconnect }) {
  const isConnected = account && account.is_active;
  const label = PLATFORM_LABELS[platform] || platform;
  const initial = PLATFORM_ICONS[platform] || platform[0]?.toUpperCase();

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-colors',
        isConnected
          ? 'bg-success-bg border-success-border'
          : 'bg-muted border-border'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Platform icon */}
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold',
            isConnected
              ? 'bg-success/10 text-success'
              : 'bg-muted-foreground/10 text-muted-foreground'
          )}
        >
          {initial}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{label}</p>
          {isConnected ? (
            <p className="text-xs text-success flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {account.account_name || account.account_id || 'Connected'}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              Not connected
            </p>
          )}
        </div>

        {/* Action */}
        {isConnected ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs text-danger border-danger/30 hover:bg-danger-bg"
            disabled={isLoading}
            onClick={() => onDisconnect?.(platform, account.id)}
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
            Disconnect
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={isLoading}
            onClick={() => onConnect?.(platform)}
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}
