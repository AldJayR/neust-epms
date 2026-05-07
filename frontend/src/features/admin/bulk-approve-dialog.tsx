import * as React from 'react'
import { useServerFn } from '@tanstack/react-start'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  getAdminUsersFn,
  getRolesFn,
  bulkApproveUsersFn,
} from '@/lib/admin.functions'

interface BulkApproveDialogProps {
  children: React.ReactNode
}

export function BulkApproveDialog({ children }: BulkApproveDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const [selectedUsers, setSelectedUsers] = React.useState<Set<string>>(new Set())
  const [userRoles, setUserRoles] = React.useState<Record<string, string>>({})
  
  const queryClient = useQueryClient()
  const getAdminUsers = useServerFn(getAdminUsersFn)
  const getRoles = useServerFn(getRolesFn)
  const bulkApproveUsers = useServerFn(bulkApproveUsersFn)

  // ── Queries ──────────────────────────────────────────────

  const rolesQuery = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => getRoles(),
    enabled: open,
  })

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', 'pending', { page, search }],
    queryFn: () => getAdminUsers({ 
      data: { page, pageSize: 5, search, isActive: 'false' } 
    }),
    enabled: open,
  })

  // ── Mutations ────────────────────────────────────────────

  const approveMutation = useMutation({
    mutationFn: (data: { users: { userId: string; roleName: string }[] }) =>
      bulkApproveUsers({ data }),
    onSuccess: (data) => {
      toast.success(`Successfully approved ${data.updatedCount} user(s)`)
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      setOpen(false)
      setSelectedUsers(new Set())
      setUserRoles({})
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // ── Handlers ─────────────────────────────────────────────

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset state on close
      setTimeout(() => {
        setPage(1)
        setSearch('')
        setSelectedUsers(new Set())
        setUserRoles({})
      }, 200)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (!usersQuery.data) return
    const newSelected = new Set(selectedUsers)
    if (checked) {
      usersQuery.data.users.forEach((user) => newSelected.add(user.userId))
    } else {
      usersQuery.data.users.forEach((user) => newSelected.delete(user.userId))
    }
    setSelectedUsers(newSelected)
  }

  const handleSelectRow = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers)
    if (checked) {
      newSelected.add(userId)
    } else {
      newSelected.delete(userId)
    }
    setSelectedUsers(newSelected)
  }

  const handleRoleChange = (userId: string, roleName: string) => {
    setUserRoles((prev) => ({ ...prev, [userId]: roleName }))
  }

  const handleApprove = () => {
    if (selectedUsers.size === 0) return

    const usersToApprove: { userId: string; roleName: string }[] = []
    
    // Convert Set to Array and map to required format
    let validationFailed = false
    Array.from(selectedUsers).forEach((userId) => {
      const assignedRole = userRoles[userId]
      if (!assignedRole) {
        validationFailed = true
        return
      }
      usersToApprove.push({ userId, roleName: assignedRole })
    })

    if (validationFailed) {
        toast.error('Please assign a role to all selected users.')
        return
    }

    approveMutation.mutate({ users: usersToApprove })
  }

  const allVisibleUsersSelected = 
    !!usersQuery.data?.users.length && 
    usersQuery.data.users.every((u) => selectedUsers.has(u.userId))

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={React.isValidElement(children) ? children : <span>{children}</span>} />
      <DialogContent className="max-w-[720px] p-0 overflow-hidden gap-0 rounded-[10px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]">
        <div className="flex flex-col gap-6 p-8">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-xl font-bold text-[#0a0a0a] tracking-tight">
              Bulk Approve
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-6">
            <div className="relative w-full max-w-[360px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users"
                className="h-10 w-full rounded-lg border-[#e5e5e5] pl-10 focus-visible:ring-primary/20"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>

            <div className="rounded-xl border border-[#e5e5e5] bg-white overflow-hidden relative min-h-[360px]">
              {usersQuery.isFetching && (
                <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              <Table>
                <TableHeader className="bg-[#fafafa]">
                  <TableRow className="border-b-[#e5e5e5] hover:bg-transparent">
                    <TableHead className="w-[60px] text-center py-4">
                      <Checkbox 
                        checked={allVisibleUsersSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="font-semibold text-[#0a0a0a] py-4">Name</TableHead>
                    <TableHead className="font-semibold text-[#0a0a0a] text-center py-4">Department</TableHead>
                    <TableHead className="font-semibold text-[#0a0a0a] text-right py-4 pr-6">Assign role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersQuery.data?.users.map((user) => (
                    <TableRow key={user.userId} className="border-b-[#e5e5e5] hover:bg-[#fcfcfc] transition-colors">
                      <TableCell className="text-center py-4">
                        <Checkbox 
                          checked={selectedUsers.has(user.userId)}
                          onCheckedChange={(checked) => handleSelectRow(user.userId, checked as boolean)}
                          aria-label={`Select ${user.firstName}`}
                        />
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-[#e5e5e5]">
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-primary/5 text-primary font-medium text-xs">
                              {user.firstName[0]}{user.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-[#0a0a0a]">
                              {user.firstName} {user.middleName ? `${user.middleName[0]}. ` : ''}{user.lastName}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                              {user.campusName}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm text-[#404040] py-4">
                        {user.departmentName ?? '-'}
                      </TableCell>
                      <TableCell className="text-right py-4 pr-6">
                        <div className="flex justify-end">
                          <Select
                            value={userRoles[user.userId]}
                            onValueChange={(val) => handleRoleChange(user.userId, val as string)}
                          >
                            <SelectTrigger className="h-9 w-[160px] text-sm rounded-lg bg-white border-[#e5e5e5]">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg shadow-lg">
                              {rolesQuery.data?.map((role) => (
                                <SelectItem key={role.roleId} value={role.roleName} className="text-sm">
                                  {role.roleName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!usersQuery.isFetching && usersQuery.data?.users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">
                        No pending users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                <span className="text-[#0a0a0a] font-bold">{selectedUsers.size}</span> of <span className="text-[#0a0a0a] font-bold">{usersQuery.data?.total ?? 0}</span> row(s) selected
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs font-semibold h-9 px-4 hover:bg-[#f5f5f5]"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || usersQuery.isFetching}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs font-semibold h-9 px-4 hover:bg-[#f5f5f5]"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!usersQuery.data || (page * 5) >= usersQuery.data.total || usersQuery.isFetching}
                >
                  Next
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[#f0f0f0] -mx-8 px-8">
              <Button 
                onClick={handleApprove}
                disabled={selectedUsers.size === 0 || approveMutation.isPending}
                className="bg-[#1e3b8a] hover:bg-[#1e3b8a]/90 text-white rounded-xl h-11 px-8 font-semibold shadow-md transition-all active:scale-[0.98]"
              >
                {approveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  'Approve'
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
