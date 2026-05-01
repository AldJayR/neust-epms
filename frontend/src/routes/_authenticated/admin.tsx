import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AdminShell } from '@/features/admin/admin-shell'

export const Route = createFileRoute('/_authenticated/admin')({
  beforeLoad: ({ context }) => {
    if (context.auth.user?.roleName !== 'Super Admin') {
      throw redirect({
        to: '/dashboard',
      })
    }
  },
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  )
}
