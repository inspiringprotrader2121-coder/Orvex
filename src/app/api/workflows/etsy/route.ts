import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { CreditService } from "@/lib/credits";
import { enqueueWorkflow } from "@/lib/queue";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const { productName, description, audience, category, projectId } = body;

    if (!productName || !description) {
      return NextResponse.json({ error: 'Missing core product info' }, { status: 400 });
    }

    const CREDIT_COST = 10;
    const success = await CreditService.deductCredits(userId, CREDIT_COST, `Etsy Listing: ${productName}`);

    if (!success) {
      return NextResponse.json({
        error: 'Insufficient credits',
        needs: CREDIT_COST,
      }, { status: 402 });
    }

    const [workflow] = await db.insert(workflows).values({
      userId,
      projectId: projectId || null,
      type: 'etsy_listing_launch_pack',
      status: 'pending',
      inputData: body,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning({ id: workflows.id });

    // Use shared singleton queue
    await enqueueWorkflow(workflow.id, 'etsy_listing_launch_pack', {
      userId,
      productInfo: {
        name: productName,
        description,
        audience,
        category
      }
    });

    return NextResponse.json({
      success: true,
      workflowId: workflow.id,
      message: 'Workflow started successfully in background'
    });

  } catch (error: any) {
    console.error('Workflow API Critical Error:', error);
    return NextResponse.json({ error: 'Internal system fault', details: error.message }, { status: 500 });
  }
}
