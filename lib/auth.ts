import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { UserRole } from './role';

const secretKey = process.env.JWT_SECRET || 'your-secret-key';
const key = new TextEncoder().encode(secretKey);

export interface UserJwtPayload {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  clientOrganizationId: string;
}

export async function createToken(payload: UserJwtPayload) {
  return await new SignJWT({ ...payload } as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(key);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, key);
    return payload as unknown as UserJwtPayload;
  } catch (error) {
    return null;
  }
}

export async function getJwtSecretKey() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }
  return new TextEncoder().encode(process.env.JWT_SECRET);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return null;

  try {
    const payload = await verifyToken(token);
    return payload;
  } catch (error) {
    return null;
  }
}
