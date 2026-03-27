import {
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
  Play,
  Pencil,
} from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

// -- Status dot config --------------------------------------------------------

const STATUS_CONFIG = {
  pending:   { color: 'bg-muted-foreground', label: 'Pending' },
  scheduled: { color: 'bg-warning', label: 'Scheduled' },
  posting:   { color: 'bg-info animate-pulse', label: 'Posting' },
  published: { color: 'bg-success', label: 'Posted' },
  failed:    { color: 'bg-danger', label: 'Failed' },
};

function StatusDot({ status, scheduledAt, publishedAt }) {
  const resolved = publishedAt ? 'published' : status || 'pending';
  const cfg = STATUS_CONFIG[resolved] || STATUS_CONFIG.pending;

  function formatRelative(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.abs(Math.floor(diffMs / 60_000));

    if (diffMs > 0) {
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      if (diffMin < 60) return `in ${diffMin}m`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `in ${diffHr}h`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }
  }

  const tooltip = resolved === 'published' && publishedAt
    ? formatRelative(publishedAt)
    : resolved === 'scheduled' && scheduledAt
      ? formatRelative(scheduledAt)
      : cfg.label;

  return (
    <div className="flex items-center justify-center gap-1.5" title={tooltip}>
      <span className={`w-2 h-2 rounded-full ${cfg.color}`} />
      <span className="text-xs text-muted-foreground hidden sm:inline">{tooltip}</span>
    </div>
  );
}

// -- PostTable ----------------------------------------------------------------

export default function PostTable({ clips, onSchedule, onPreview, onEditCaption }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-[10px] uppercase tracking-wider">Clip</TableHead>
            <TableHead className="text-center text-[10px] uppercase tracking-wider text-[hsl(var(--chart-4))]">TikTok</TableHead>
            <TableHead className="text-center text-[10px] uppercase tracking-wider text-[hsl(var(--chart-5))]">Instagram</TableHead>
            <TableHead className="text-center text-[10px] uppercase tracking-wider text-danger">YT Shorts</TableHead>
            <TableHead className="text-right text-[10px] uppercase tracking-wider">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clips.map((clip) => (
            <TableRow key={clip.id}>
              {/* Clip info */}
              <TableCell>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate max-w-[220px]">
                    {clip.clip_title || `Clip #${clip.clip_number || '?'}`}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate max-w-[220px]">
                    {clip.topics?.seo_title || ''}{clip.topics?.projects?.name ? ` \u2014 ${clip.topics.projects.name}` : ''}
                  </p>
                </div>
              </TableCell>

              {/* TikTok status */}
              <TableCell className="text-center">
                <StatusDot
                  status={clip.tiktok_status}
                  scheduledAt={clip.tiktok_scheduled_at}
                  publishedAt={clip.tiktok_published_at}
                />
              </TableCell>

              {/* Instagram status */}
              <TableCell className="text-center">
                <StatusDot
                  status={clip.instagram_status}
                  scheduledAt={clip.instagram_scheduled_at}
                  publishedAt={clip.instagram_published_at}
                />
              </TableCell>

              {/* YT Shorts status */}
              <TableCell className="text-center">
                <StatusDot
                  status={clip.youtube_shorts_status}
                  scheduledAt={clip.youtube_shorts_scheduled_at}
                  publishedAt={clip.youtube_shorts_published_at}
                />
              </TableCell>

              {/* Actions */}
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="default" size="sm" className="h-7 text-xs gap-1.5">
                        <Send className="w-3 h-3" />
                        Post
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuLabel className="text-xs">Post Now</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onSchedule?.({ ...clip, _mode: 'now', _platform: 'tiktok' })}>
                        TikTok
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onSchedule?.({ ...clip, _mode: 'now', _platform: 'instagram' })}>
                        Instagram
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onSchedule?.({ ...clip, _mode: 'now', _platform: 'youtube_shorts' })}>
                        YouTube Shorts
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onSchedule?.(clip)}>
                        <Calendar className="w-3.5 h-3.5 mr-1.5" />
                        Schedule...
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Edit Caption"
                    onClick={() => onEditCaption?.(clip)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Preview"
                    onClick={() => onPreview?.(clip)}
                  >
                    <Play className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
