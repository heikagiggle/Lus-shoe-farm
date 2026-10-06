// Public key is read here so real keys can be dropped into .env.local without code changes.
export const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? '';

interface Handlers { onSuccess: () => void; onCancel: () => void; onError: (msg: string) => void }

/** Opens Paystack's popup for a server-initialised transaction (bank_transfer channel only). */
export async function openBankTransfer(accessCode: string, h: Handlers) {
  const { default: Paystack } = await import('@paystack/inline-js');
  const popup = new Paystack();
  popup.resumeTransaction(accessCode, {
    onSuccess: () => h.onSuccess(),
    onCancel: () => h.onCancel(),
    onError: (e: { message?: string }) => h.onError(e?.message ?? 'Payment failed'),
  });
}
