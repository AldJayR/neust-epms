import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'
import robotoLatinWghtUrl from '@fontsource-variable/roboto/files/roboto-latin-wght-normal.woff2?url'

import type { QueryClient } from '@tanstack/react-query'
import type { AuthContext } from '../lib/auth'
import { getCurrentUserFn } from '../lib/auth.functions'

interface MyRouterContext {
  queryClient: QueryClient
  auth: AuthContext
}

const THEME_INIT_SCRIPT = `(function(){try{var root=document.documentElement;root.classList.remove('light','dark');root.classList.add('light');root.setAttribute('data-theme','light');root.style.colorScheme='light';window.localStorage.setItem('theme','light');}catch(e){}})();`

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'NEUST EPMS',
      },
    ],
    links: [
      {
        rel: 'preload',
        href: robotoLatinWghtUrl,
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  beforeLoad: async () => {
    const user = await getCurrentUserFn()

    return {
      auth: {
        user,
        isAuthenticated: !!user,
      },
    }
  },
  notFoundComponent: () => (
    <div className="flex min-h-dvh flex-col items-center justify-center p-8 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-4 text-xl text-muted-foreground">
        Oops! The page you're looking for doesn't exist.
      </p>
      <a
        href="/"
        className="mt-8 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Go home
      </a>
    </div>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
