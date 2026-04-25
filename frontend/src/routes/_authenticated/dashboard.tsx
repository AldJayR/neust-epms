import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
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
