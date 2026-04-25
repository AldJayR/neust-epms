import { QueryClient } from '@tanstack/react-query'
import type { AuthContext } from '../../lib/auth'

export function getContext() {
  const queryClient = new QueryClient()

  // Default auth context — __root.tsx's beforeLoad will override
  // this with the real session state on every navigation.
  const auth: AuthContext = {
    user: null,
    isAuthenticated: false,
  }

  return {
    queryClient,
    auth,
  }
}
export default function TanstackQueryProvider() {}
