/**
 * Database schema types for DFtpS
 */

// Type export for User
export type User = {
  id: number;
  username: string;
  password: string;
  root: string;
  uid: number;
  gid: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type NewUser = Omit<User, "id" | "created_at" | "updated_at">;
