import {
  pgTable,
  uuid,
  integer,
  varchar,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { roles } from "./roles.js";
import { campuses } from "./campuses.js";
import { departments } from "./departments.js";

export const users = pgTable(
  "users",
  {
    userId: uuid("user_id").primaryKey().defaultRandom(),
    roleId: integer("role_id")
      .notNull()
      .references(() => roles.roleId),
    campusId: integer("campus_id")
      .notNull()
      .references(() => campuses.campusId),
    departmentId: integer("department_id").references(
      () => departments.departmentId,
    ),
    employeeId: varchar("employee_id", { length: 50 }).notNull().unique(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    middleName: varchar("middle_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    nameSuffix: varchar("name_suffix", { length: 20 }),
    academicRank: varchar("academic_rank", { length: 100 }),
    email: varchar("email", { length: 255 }).notNull().unique(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    roleIdx: index("users_role_id_idx").on(table.roleId),
    campusIdx: index("users_campus_id_idx").on(table.campusId),
    departmentIdx: index("users_department_id_idx").on(table.departmentId),
  }),
);
