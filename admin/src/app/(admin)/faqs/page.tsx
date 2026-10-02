import FaqsClient from "./FaqsClient";
import { adminFetch } from "@/lib/api";

type Faq = {
  id: string;
  category: string;
  question: string;
  answer: string;
  order: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export default async function FaqsPage() {
  let items: Faq[] = [];
  try {
    const data = await adminFetch<{ items: Faq[] }>("/admin/faqs");
    items = data.items;
  } catch {}
  return <FaqsClient initial={items} />;
}
