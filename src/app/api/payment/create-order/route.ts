import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const { amount, applicationId, projectName } = await req.json();

    if (!amount || !applicationId) {
      return NextResponse.json(
        { error: 'amount and applicationId are required' },
        { status: 400 }
      );
    }

    // Razorpay expects amount in paise (INR × 100)
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `receipt_${applicationId}_${Date.now()}`,
      notes: {
        applicationId,
        projectName: projectName ?? '',
        platform: 'EcoClear Workflow — CECB',
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    });
  } catch (err: unknown) {
    console.error('[payment/create-order]', err);
    const message = err instanceof Error ? err.message : 'Failed to create order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
