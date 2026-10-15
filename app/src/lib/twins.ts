/** 생일이 같은 아이는 쌍둥이로 보고 한 묶음으로 친다. 순서는 목록 순서를 따른다. */
export function groupTwins<T extends { id: string; birthDate: string }>(list: T[]): T[][] {
  const byDate = new Map<string, T[]>();
  for (const c of list) {
    const g = byDate.get(c.birthDate);
    if (g) g.push(c);
    else byDate.set(c.birthDate, [c]);
  }
  return [...byDate.values()];
}
