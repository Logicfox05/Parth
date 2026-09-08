export type UserRole = "admin" | "staff";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
