"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";

export type AdNetwork = "GOOGLE" | "KAKAO";

const OPTIONS: { value: AdNetwork; label: string; description: string }[] = [
  {
    value: "GOOGLE",
    label: "Google AdMob",
    description: "앱 하단 배너에 AdMob 광고를 띄웁니다.",
  },
  {
    value: "KAKAO",
    label: "Kakao AdFit",
    description: "앱 하단 배너에 카카오 애드핏 광고를 띄웁니다.",
  },
];

export default function AdsClient({ initial }: { initial: AdNetwork }) {
  const router = useRouter();
  // 저장된 값과 고른 값을 따로 들고 있어야 변경 여부로 저장 버튼을 막을 수 있다.
  const [current, setCurrent] = useState<AdNetwork>(initial);
  const [selected, setSelected] = useState<AdNetwork>(initial);
  const [busy, setBusy] = useState(false);

  const changed = selected !== current;

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/app-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adNetwork: selected }),
      });
      if (!res.ok) {
        alert("저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }
      const data = (await res.json()) as { adNetwork: AdNetwork };
      setCurrent(data.adNetwork);
      setSelected(data.adNetwork);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="광고 설정"
        description="iOS/Android 앱 안의 하단 배너에 어떤 광고 네트워크를 띄울지 고릅니다. 웹 브라우저에서는 이 설정과 상관없이 항상 카카오 애드핏이 노출됩니다."
        actions={
          <Button onClick={save} size="sm" disabled={!changed || busy}>
            {busy ? "저장 중" : "저장"}
          </Button>
        }
      />

      <div role="radiogroup" aria-label="앱 광고 네트워크" className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((o) => {
          const isSelected = selected === o.value;
          const isCurrent = current === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={busy}
              onClick={() => setSelected(o.value)}
              className="text-left disabled:cursor-not-allowed"
            >
              <Card
                className={cn(
                  "flex h-full items-start gap-3 p-4 transition-shadow hover:shadow-md",
                  isSelected && "border-primary ring-2 ring-primary/30",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40",
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{o.label}</p>
                    {isCurrent && (
                      <Badge variant="success" className="text-[10px]">
                        현재 적용 중
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{o.description}</p>
                </div>
              </Card>
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-1 text-xs text-muted-foreground">
        <p>
          애드핏을 지원하지 않는 예전 버전의 앱에서는 Kakao AdFit을 고르면 광고가
          보이지 않습니다.
        </p>
        <p>변경 내용은 앱이 다음에 페이지를 불러올 때부터 적용됩니다.</p>
      </div>
    </div>
  );
}
