import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/admin/settings/')({
  component: () => (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-[#11215a]">Settings</h1>
      <p className="text-muted-foreground">This page is under construction.</p>
    </div>
  ),
})
