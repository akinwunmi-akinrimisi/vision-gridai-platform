import { useParams } from 'react-router';

import PageHeader from '../components/shared/PageHeader';
import ConfigTab from '../components/settings/ConfigTab';
import PromptsTab from '../components/settings/PromptsTab';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function Settings() {
  const { id: projectId } = useParams();

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Settings"
        subtitle="Per-project configuration, models, and prompts"
      />

      <Tabs defaultValue="general">
        <TabsList className="mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="youtube">YouTube</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <ConfigTab projectId={projectId} section="general" />
        </TabsContent>
        <TabsContent value="models">
          <ConfigTab projectId={projectId} section="models" />
        </TabsContent>
        <TabsContent value="youtube">
          <ConfigTab projectId={projectId} section="youtube" />
        </TabsContent>
        <TabsContent value="social">
          <ConfigTab projectId={projectId} section="social" />
        </TabsContent>
        <TabsContent value="prompts">
          <PromptsTab projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
