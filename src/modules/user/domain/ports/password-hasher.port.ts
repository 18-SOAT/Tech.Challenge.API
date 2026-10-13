export interface PasswordHasher {
  hash(plainTextPassword: string): Promise<string>;
  compare(plainTextPassword: string, hashedPassword: string): Promise<boolean>;
}
