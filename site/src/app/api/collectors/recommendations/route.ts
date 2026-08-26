import { NextResponse } from "next/server";

import { buildRecommendations } from "@/lib/collectors/recommendations";
import { withSession } from "@/lib/api/handler";

export function GET(request: Request) {
  return withSession(request, async (session) =>
    NextResponse.json({
      recommendations: await buildRecommendations(session.uid),
    })
  );
}
