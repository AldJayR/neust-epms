import * as React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminSidebar } from './admin-sidebar'

interface ChildrenProps {
  children?: React.ReactNode
}

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  useRouterState: vi.fn(() => ({
    matches: [
      {
        routeId: '/_authenticated',
        context: {
          user: {
            firstName: 'John',
            lastName: 'Doe',
            roleName: 'Super Admin',
          },
        },
      },
    ],
  })),
  Link: ({ children }: ChildrenProps) => <a>{children}</a>,
}))

// Mock Sidebar components with proper types
vi.mock('./ui/sidebar', () => ({
  Sidebar: ({ children }: ChildrenProps) => <div>{children}</div>,
  SidebarHeader: ({ children }: ChildrenProps) => <div>{children}</div>,
  SidebarContent: ({ children }: ChildrenProps) => <div>{children}</div>,
  SidebarFooter: ({ children }: ChildrenProps) => <div>{children}</div>,
  SidebarMenu: ({ children }: ChildrenProps) => <div>{children}</div>,
  SidebarMenuItem: ({ children }: ChildrenProps) => <div>{children}</div>,
  SidebarMenuButton: ({ children }: ChildrenProps) => <div>{children}</div>,
  SidebarGroup: ({ children }: ChildrenProps) => <div>{children}</div>,
  SidebarGroupLabel: ({ children }: ChildrenProps) => <div>{children}</div>,
  SidebarGroupContent: ({ children }: ChildrenProps) => <div>{children}</div>,
}))

describe('AdminSidebar', () => {
  it('renders the sidebar header', () => {
    render(<AdminSidebar />)

    expect(screen.getByText('NEUST')).toBeDefined()
    expect(screen.getByText('Extension Services')).toBeDefined()
  })

  it('renders navigation items', () => {
    render(<AdminSidebar />)

    expect(screen.getByText('User Management')).toBeDefined()
    expect(screen.getByText('Activity Log')).toBeDefined()
    expect(screen.getByText('Settings')).toBeDefined()
  })

  it('renders the user profile section', () => {
    render(<AdminSidebar />)

    expect(screen.getByText('John Doe')).toBeDefined()
    expect(screen.getByText('Super Admin')).toBeDefined()
  })
})
