import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const createAdminSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['Super Admin', 'Admin', 'Verifier']),
});

export const updateAdminSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['Super Admin', 'Admin', 'Verifier']).optional(),
  isActive: z.boolean().optional(),
});

export const createSchoolSchema = z.object({
  name: z.string().min(3),
  lga: z.string().min(2),
  address: z.string().optional(),
});

export const updateSchoolSchema = z.object({
  name: z.string().min(3).optional(),
  lga: z.string().min(2).optional(),
  address: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type LoginData = z.infer<typeof loginSchema>;
export type CreateAdminData = z.infer<typeof createAdminSchema>;
export type UpdateAdminData = z.infer<typeof updateAdminSchema>;
export type CreateSchoolData = z.infer<typeof createSchoolSchema>;
export type UpdateSchoolData = z.infer<typeof updateSchoolSchema>;
