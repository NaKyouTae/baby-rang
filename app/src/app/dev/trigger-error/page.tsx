export const dynamic = "force-dynamic";

export default function TriggerErrorPage() {
  throw new Error("dev: trigger error.tsx");
}
