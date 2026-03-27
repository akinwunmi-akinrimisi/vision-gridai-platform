import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard, Search, ListChecks, FileText, Activity,
  BarChart3, Settings, Clapperboard, Share2, Zap,
} from 'lucide-react';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const go = (path) => {
    navigate(path);
    setOpen(false);
  };

  const projects = queryClient.getQueryData(['projects']) || [];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, projects, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Pages">
          <CommandItem onSelect={() => go('/')}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Projects Home
          </CommandItem>
          <CommandItem onSelect={() => go('/shorts')}>
            <Clapperboard className="mr-2 h-4 w-4" />
            Shorts Creator
          </CommandItem>
          <CommandItem onSelect={() => go('/social')}>
            <Share2 className="mr-2 h-4 w-4" />
            Social Publisher
          </CommandItem>
        </CommandGroup>

        {projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {projects.map((p) => (
                <CommandItem key={p.id} onSelect={() => go(`/project/${p.id}`)}>
                  <Zap className="mr-2 h-4 w-4" />
                  {p.name} — {p.niche}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
