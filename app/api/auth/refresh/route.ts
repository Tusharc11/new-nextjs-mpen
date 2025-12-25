import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, createToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('auth-token')?.value || 
                     request.headers.get('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'No token provided' }, { status: 401 });
        }

        // Verify the current token
        const userData = await verifyToken(token);
        if (!userData) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Create a new token with the same payload
        const newToken = await createToken({
            id: userData.id,
            email: userData.email,
            role: userData.role,
            name: userData.name,
            clientOrganizationId: userData.clientOrganizationId
        });

        const response = NextResponse.json({ 
            token: newToken,
            message: 'Token refreshed successfully'
        });

        // Set the new token in cookies
        response.cookies.set('auth-token', newToken, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 5 // 5 days
        });

        return response;
    } catch (error) {
        return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 });
    }
}