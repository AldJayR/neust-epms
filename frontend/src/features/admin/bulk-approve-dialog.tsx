import * as React from 'react'
import { useServerFn } from '@tanstack/react-start'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DialogClose,
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
import { XIcon } from 'lucide-react'

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
      <DialogContent
        showCloseButton={false}
        className="h-[540px] w-[721px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-hidden rounded-[10px] border border-[#e5e5e5] bg-white p-0 px-[5px] py-[6px] ring-0 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
      >
        <div className="flex h-full flex-col gap-8 p-4">
          <DialogHeader className="flex flex-row items-center justify-between gap-4">
            <DialogTitle className="text-[20px] font-semibold leading-5 text-[#0a0a0a]">
              Bulk Approve
            </DialogTitle>
            <DialogClose
              render={
                <button
                  type="button"
                  className="inline-flex h-4 w-4 items-center justify-center text-[#737373] transition-opacity hover:opacity-80"
                />
              }
            >
              <XIcon className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="relative w-full max-w-[360px] shrink-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users"
                className="h-8 w-full rounded-md border-[#e5e5e5] bg-white pl-10 text-sm shadow-[0px_1px_1px_rgba(0,0,0,0.1)]"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>

            <div className="relative h-[285px] overflow-hidden rounded-md border border-[#e5e5e5] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
              {usersQuery.isFetching && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              <Table className="table-fixed">
                <TableHeader className="bg-white">
                  <TableRow className="border-b-[#e5e5e5] hover:bg-transparent">
                    <TableHead className="w-[32px] px-2 text-center">
                      <Checkbox
                        checked={allVisibleUsersSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="w-[232px] font-medium text-[#0a0a0a]">
                      Name
                    </TableHead>
                    <TableHead className="w-[184px] text-center font-medium text-[#0a0a0a]">
                      Department
                    </TableHead>
                    <TableHead className="w-[167px] pr-6 text-right font-medium text-[#0a0a0a]">
                      Assign role
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersQuery.data?.users.map((user) => (
                    <TableRow
                      key={user.userId}
                      className="border-b-[#e5e5e5] transition-colors hover:bg-[#fcfcfc]"
                    >
                      <TableCell className="w-[32px] px-2">
                        <Checkbox
                          checked={selectedUsers.has(user.userId)}
                          onCheckedChange={(checked) => handleSelectRow(user.userId, checked as boolean)}
                          aria-label={`Select ${user.firstName}`}
                        />
                      </TableCell>
                      <TableCell className="w-[232px]">
                        <div className="flex items-center gap-[10px]">
                          <Avatar className="h-9 w-9 border border-[#e5e5e5]">
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-primary/5 text-xs font-medium text-primary">
                              {user.firstName[0]}
                              {user.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-[14px] font-medium leading-5 text-[#0a0a0a]">
                              {user.firstName} {user.middleName ? `${user.middleName[0]}. ` : ''}{user.lastName}
                            </span>
                            <span className="truncate text-[12px] leading-4 text-[#666]">
                              {user.campusName}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="w-[184px] text-center text-[14px] text-[#0a0a0a]">
                        {user.departmentName ?? '-'}
                      </TableCell>
                      <TableCell className="w-[167px] pr-6">
                        <div className="flex justify-end">
                          <Select
                            value={userRoles[user.userId]}
                            onValueChange={(val) => handleRoleChange(user.userId, val as string)}
                          >
                            <SelectTrigger className="h-[25px] w-[139px] rounded-md border-[#e5e5e5] bg-white px-3 py-[2px] text-[14px] shadow-[0px_1px_1px_rgba(0,0,0,0.1)]">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent className="rounded-md shadow-lg">
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
                      <TableCell colSpan={4} className="h-32 text-center italic text-muted-foreground">
                        No pending users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-[12px] font-medium leading-4 text-[#666]">
                <span className="font-semibold text-[#0a0a0a]">{selectedUsers.size}</span> of{' '}
                <span className="font-semibold text-[#0a0a0a]">{usersQuery.data?.total ?? 0}</span> row(s) selected.
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-[10px] border-[#e5e5e5] bg-white px-4 text-[14px] font-medium text-[#0a0a0a] shadow-[0px_1px_1.5px_rgba(0,0,0,0.1)] hover:bg-white"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || usersQuery.isFetching}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-[10px] border-[#e5e5e5] bg-white px-4 text-[14px] font-medium text-[#0a0a0a] shadow-[0px_1px_1.5px_rgba(0,0,0,0.1)] hover:bg-white"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!usersQuery.data || (page * 5) >= usersQuery.data.total || usersQuery.isFetching}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleApprove}
              disabled={selectedUsers.size === 0 || approveMutation.isPending}
              className="h-9 rounded-[10px] bg-[#1e3b8a] px-[10px] text-[14px] font-medium shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] transition-all hover:bg-[#1e3b8a]/90 active:scale-[0.98]"
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
      </DialogContent>
    </Dialog>
  )
}
