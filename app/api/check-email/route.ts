import dbConnect from '@/lib/mongodb';
import { NextResponse } from 'next/server';
import User from '../models/user';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { email } = await request.json();
    const exists = await User.findOne({ email });
    return NextResponse.json(!!exists);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}