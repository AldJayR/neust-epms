import 'dotenv/config'
import { db } from './client.js'
import { roles } from './schema/roles.js'
import { campuses } from './schema/campuses.js'
import { departments } from './schema/departments.js'
import { users } from './schema/users.js'
import { ROLE_NAMES } from '../lib/types.js'
import { eq } from 'drizzle-orm'

async function main() {
  console.log('🌱 Seeding database...')

  // 1. Seed Roles
  console.log('Inserting roles...')
  const roleEntries = Object.values(ROLE_NAMES).map((name) => ({
    roleName: name,
  }))
  
  for (const entry of roleEntries) {
    await db.insert(roles).values(entry).onConflictDoNothing()
  }

  // 2. Seed Main Campus
  console.log('Inserting main campus...')
  const [mainCampus] = await db
    .insert(campuses)
    .values({
      campusName: 'Cabanatuan City (Main)',
      isMainCampus: true,
    })
    .onConflictDoUpdate({
      target: campuses.campusName,
      set: { isMainCampus: true },
    })
    .returning()

  // 3. Seed Main Department (e.g., MIS)
  console.log('Inserting MIS department...')
  const [misDept] = await db
    .insert(departments)
    .values({
      campusId: mainCampus.campusId,
      departmentName: 'Management Information System (MIS)',
    })
    .onConflictDoNothing()
    .returning()

  // 4. Seed Super Admin User
  // Note: Replace SUPABASE_USER_ID with an actual ID from your Supabase Auth users table if available
  const supabaseUserId = process.env.SUPABASE_USER_ID || '00000000-0000-0000-0000-000000000000'
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@neust.edu.ph'

  const [superAdminRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.roleName, ROLE_NAMES.SUPER_ADMIN))
    .limit(1)

  if (!superAdminRole) {
    throw new Error('Super Admin role not found')
  }

  console.log(`Inserting Super Admin: ${adminEmail}...`)
  await db
    .insert(users)
    .values({
      userId: supabaseUserId,
      roleId: superAdminRole.roleId,
      campusId: mainCampus.campusId,
      departmentId: misDept?.departmentId ?? null,
      employeeId: 'ADMIN-001',
      firstName: 'System',
      lastName: 'Administrator',
      email: adminEmail,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        userId: supabaseUserId,
        roleId: superAdminRole.roleId,
        isActive: true,
      },
    })

  console.log('✅ Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed!')
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    // Connection closing if needed
  })
