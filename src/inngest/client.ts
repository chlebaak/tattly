import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "tattly" });

export async function scheduleBookingReminder(
  bookingId: string,
  remindAt: Date
): Promise<void> {
  try {
    await inngest.send({
      name: "booking/remind",
      data: { bookingId },
      ts: remindAt.getTime(),
    });
  } catch (error) {
    console.error("Failed to schedule booking reminder", error);
  }
}

export async function scheduleDepositExpiry(
  bookingId: string,
  expiresAt: Date
): Promise<void> {
  try {
    await inngest.send({
      name: "deposit/expire",
      data: { bookingId },
      ts: expiresAt.getTime(),
    });
  } catch (error) {
    console.error("Failed to schedule deposit expiry", error);
  }
}
