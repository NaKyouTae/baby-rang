import TestsClient from "./TestsClient";
import { adminFetch } from "@/lib/api";

type TestType = "TEMPERAMENT" | "DEVELOPMENT" | "UNICORN";

type Test = {
  id: string;
  type: TestType;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  linkUrl: string;
  labels: string[];
  durationMinMinutes: number | null;
  durationMaxMinutes: number | null;
  questionCount: number | null;
  sortOrder: number;
  isActive: boolean;
};

export default async function TestsPage() {
  let items: Test[] = [];
  try {
    const data = await adminFetch<{ items: Test[] }>("/admin/tests");
    items = data.items;
  } catch {}
  return <TestsClient initial={items} />;
}
