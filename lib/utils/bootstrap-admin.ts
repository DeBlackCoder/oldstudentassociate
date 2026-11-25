export const BOOTSTRAP_SUPER_ADMIN_EMAIL = 'hillaryprosperwahua@gmail.com';

export function isBootstrapSuperAdminEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() === BOOTSTRAP_SUPER_ADMIN_EMAIL;
}
