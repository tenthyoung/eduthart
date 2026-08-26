import { NextResponse } from "next/server";

import {
  deleteAddress,
  listAddresses,
  saveAddress,
  setDefaultAddress,
  type AddressInput,
} from "@/lib/collectors/addresses";
import { apiError, withSession } from "@/lib/api/handler";

type AddressBody = AddressInput & { id?: string; makeDefault?: boolean };

export function GET(request: Request) {
  return withSession(request, async (session) =>
    NextResponse.json({ addresses: await listAddresses(session.uid) }),
  );
}

export function POST(request: Request) {
  return withSession(request, async (session) => {
    const { id, ...input } = (await request.json()) as AddressBody;
    await saveAddress(session.uid, input, id);
    return NextResponse.json({ addresses: await listAddresses(session.uid) });
  });
}

export function PATCH(request: Request) {
  return withSession(request, async (session) => {
    const body = (await request.json()) as AddressBody;

    if (!body.id) {
      return apiError("An address is required.", 400);
    }

    await setDefaultAddress(session.uid, body.id);
    return NextResponse.json({ addresses: await listAddresses(session.uid) });
  });
}

export function DELETE(request: Request) {
  return withSession(request, async (session) => {
    const body = (await request.json()) as { id?: string };

    if (!body.id) {
      return apiError("An address is required.", 400);
    }

    await deleteAddress(session.uid, body.id);
    return NextResponse.json({ addresses: await listAddresses(session.uid) });
  });
}
