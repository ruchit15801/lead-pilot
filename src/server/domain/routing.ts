import type { Channel } from "../../lib/types";

export function routeChannel(lead: { email?: string; phone?: string }): {
  primary: Channel | null;
  secondary: Channel | null;
} {
  const hasEmail = Boolean(lead.email?.trim());
  const hasPhone = Boolean(lead.phone?.trim());

  if (hasPhone && hasEmail) {
    return { primary: "email", secondary: "whatsapp" };
  }
  if (hasEmail) return { primary: "email", secondary: null };
  if (hasPhone) return { primary: "whatsapp", secondary: null };
  return { primary: null, secondary: null };
}

export function channelForStep(args: {
  stepChannel: Channel;
  primary: Channel | null;
  secondary: Channel | null;
  emailRepliedByDay5: boolean;
}): Channel | null {
  if (args.stepChannel === "email") {
    return args.primary === "email" || args.secondary === "email" ? "email" : args.primary;
  }

  if (args.primary === "whatsapp") return "whatsapp";
  if (args.secondary === "whatsapp" && !args.emailRepliedByDay5) return "whatsapp";
  return args.primary;
}
