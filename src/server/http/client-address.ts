import 'server-only';
import { headers } from 'next/headers';
import { clientAddressKey } from './client-address-key';

// The hosting proxy sets x-real-ip to the address it saw and overwrites any value the client sent; x-forwarded-for is never read, since a client can prepend to it.
const clientAddressHeader = 'x-real-ip';

export async function readClientAddressKey(): Promise<string | null> {
  return clientAddressKey((await headers()).get(clientAddressHeader));
}
