import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { AdminShell } from '@/features/admin/admin-shell'
import { UsersPage } from '@/features/admin/users-page'

const dashboardSearchSchema = z.object({
  page: z.number().optional().default(1),
  pageSize: z.number().optional().default(10),
  search: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/dashboard')({
  validateSearch: (search) => dashboardSearchSchema.parse(search),
  component: DashboardPage,
})

function DashboardPage() {
  const { user } = Route.useRouteContext()
  const { page, pageSize, search } = Route.useSearch()
  const navigate = Route.useNavigate()

  const handleSearch = (newSearch: string | undefined) => {
    navigate({
      search: (old) => ({ ...old, search: newSearch, page: 1 }),
    })
  }

  const handlePageChange = (newPage: number) => {
    navigate({
      search: (old) => ({ ...old, page: newPage }),
    })
  }

  if (user.roleName === 'Super Admin') {
    return (
      <AdminShell>
        <UsersPage
          page={page}
          pageSize={pageSize}
          search={search}
          onSearch={handleSearch}
          onPageChange={handlePageChange}
        />
      </AdminShell>
    )
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-card-foreground">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Welcome! This page is under construction.
        </p>
      </div>
    </main>
  )
}
