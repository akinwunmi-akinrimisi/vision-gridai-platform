import { ImageIcon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * 16:9 thumbnail preview with fallback placeholder.
 */
export default function ThumbnailPreview({ thumbnailUrl, onGenerate, isGenerating }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden" data-testid="thumbnail-preview">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">
          Thumbnail Preview
        </h3>
      </div>
      <div className="aspect-video bg-muted relative">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt="Video thumbnail"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <ImageIcon className="w-10 h-10 mb-2 opacity-40" />
            <span className="text-sm mb-3">No thumbnail generated yet</span>
            {onGenerate && (
              <Button
                size="sm"
                onClick={() => onGenerate()}
                disabled={isGenerating}
                className="gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isGenerating ? 'Generating...' : 'Generate Thumbnail'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
