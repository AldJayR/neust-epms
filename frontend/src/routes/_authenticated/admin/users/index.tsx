import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { UsersPage } from '@/features/admin/users-page'

const usersSearchSchema = z.object({
  page: z.number().optional().default(1),
  pageSize: z.number().optional().default(10),
  search: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/admin/users/')({
  validateSearch: (search) => usersSearchSchema.parse(search),
  component: UsersPageRoute,
})

function UsersPageRoute() {
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

  return (
    <UsersPage
      page={page}
      pageSize={pageSize}
      search={search}
      onSearch={handleSearch}
      onPageChange={handlePageChange}
    />
  )
}
