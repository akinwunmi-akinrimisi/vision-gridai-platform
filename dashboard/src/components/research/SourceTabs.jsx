import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
} from '@/components/ui/table';
import TopicRow from './TopicRow';

const SOURCES = [
  { key: 'all', label: 'All', color: '' },
  { key: 'reddit', label: 'Reddit', color: 'data-[state=active]:bg-[#FF4500]/10 data-[state=active]:text-[#FF4500]' },
  { key: 'youtube', label: 'YouTube', color: 'data-[state=active]:bg-danger-bg data-[state=active]:text-danger' },
  { key: 'tiktok', label: 'TikTok', color: 'data-[state=active]:bg-foreground/10 data-[state=active]:text-foreground' },
  { key: 'trends', label: 'Trends', color: 'data-[state=active]:bg-info-bg data-[state=active]:text-info' },
  { key: 'quora', label: 'Quora', color: 'data-[state=active]:bg-warning-bg data-[state=active]:text-warning' },
];

/**
 * Tabbed results view -- one tab per data source.
 * Each tab renders a scrollable table of TopicRow components.
 */
export default function SourceTabs({ selectedSource, onSourceChange, results, isLoading }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <Tabs value={selectedSource} onValueChange={onSourceChange}>
        <div className="px-4 pt-3 border-b border-border">
          <TabsList className="bg-transparent h-auto p-0 gap-1">
            {SOURCES.map((src) => (
              <TabsTrigger
                key={src.key}
                value={src.key}
                className={`px-3 py-1.5 text-xs font-medium rounded-md data-[state=active]:shadow-none ${src.color}`}
              >
                {src.label}
                {src.key !== 'all' && results && selectedSource === src.key && (
                  <span className="ml-1.5 text-[10px] opacity-60 tabular-nums">
                    {results.length}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {SOURCES.map((src) => (
          <TabsContent key={src.key} value={src.key} className="mt-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Loading results...</p>
              </div>
            ) : !results || results.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-muted-foreground">
                  No results found{src.key !== 'all' ? ` from ${src.label}` : ''}.
                </p>
              </div>
            ) : (
              <div className="max-h-[480px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-left text-[11px] uppercase tracking-wider w-16">#</TableHead>
                      <TableHead className="text-left text-[11px] uppercase tracking-wider">Content</TableHead>
                      <TableHead className="text-left text-[11px] uppercase tracking-wider w-24">Source</TableHead>
                      <TableHead className="text-right text-[11px] uppercase tracking-wider w-24">Score</TableHead>
                      <TableHead className="text-left text-[11px] uppercase tracking-wider w-28">Category</TableHead>
                      <TableHead className="text-right text-[11px] uppercase tracking-wider w-24">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, idx) => (
                      <TopicRow key={result.id || idx} result={result} rank={idx + 1} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
