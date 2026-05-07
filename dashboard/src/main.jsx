import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { queryClient, queryPersister, QUERY_CACHE_KEY } from './lib/queryClient';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: 24 * 60 * 60 * 1000,
        buster: QUERY_CACHE_KEY,
      }}
    >
      <BrowserRouter>
        <App />
        <Toaster
          position="bottom-right"
          richColors
          toastOptions={{
            style: {
              background: '#110E2A',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#FAFAFA',
            },
          }}
        />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </PersistQueryClientProvider>
  </React.StrictMode>
);
