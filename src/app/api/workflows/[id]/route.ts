import { NextResponse, NextRequest } from 'next/server';
import { auth } from "@/auth";
import { WorkflowReadService } from "@server/services/workflow-read-service";

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

        void request;
        const record = await WorkflowReadService.getWorkflowForUser(userId, id);

        if (!record) {
            return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
        }

        return NextResponse.json({
            ...record.workflow,
            artifact: record.artifact,
        });

    } catch (error) {
        console.error('Workflow Fetch Error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
