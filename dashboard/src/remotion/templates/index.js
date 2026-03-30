/**
 * Remotion Template Registry
 *
 * Maps template_key (from remotion_templates table) to React components.
 * Each template renders a data graphic as a static PNG via `npx remotion still`.
 */

import { StatCallout } from './StatCallout';
import { ComparisonLayout } from './ComparisonLayout';
import { BarChart } from './BarChart';
import { ListBreakdown } from './ListBreakdown';
import { ChapterTitle } from './ChapterTitle';
import { QuoteCard } from './QuoteCard';

import { TimelineGraphic } from './TimelineGraphic';
import { DataTable } from './DataTable';
import { BeforeAfter } from './BeforeAfter';
import { PercentageRing } from './PercentageRing';
import { MapVisual } from './MapVisual';
import { MetricHighlight } from './MetricHighlight';

export const TEMPLATE_REGISTRY = {
  stat_callout: StatCallout,
  comparison_layout: ComparisonLayout,
  bar_chart: BarChart,
  list_breakdown: ListBreakdown,
  chapter_title: ChapterTitle,
  quote_card: QuoteCard,
  timeline_graphic: TimelineGraphic,
  data_table: DataTable,
  before_after: BeforeAfter,
  percentage_ring: PercentageRing,
  map_visual: MapVisual,
  metric_highlight: MetricHighlight,
};

export {
  StatCallout,
  ComparisonLayout,
  BarChart,
  ListBreakdown,
  ChapterTitle,
  QuoteCard,
  TimelineGraphic,
  DataTable,
  BeforeAfter,
  PercentageRing,
  MapVisual,
  MetricHighlight,
};

export default TEMPLATE_REGISTRY;
