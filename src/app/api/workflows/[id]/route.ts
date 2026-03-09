import { NextResponse, NextRequest } from 'next/server';
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { eq, and } from 'drizzle-orm';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id;
        const { id } = await params;

        const workflow = await db.query.workflows.findFirst({
            where: and(
                eq(workflows.id, id),
                eq(workflows.userId, userId)
            )
        });

        if (!workflow) {
            return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
        }

        return NextResponse.json(workflow);

    } catch (error: any) {
        console.error('Workflow Fetch Error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
