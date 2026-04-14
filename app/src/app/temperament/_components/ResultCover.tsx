'use client';

const TYPE_STYLES: Record<string, { gradient: string; badge: string; emoji: string }> = {
  explorer: { gradient: 'from-orange-400 to-amber-300', badge: 'bg-orange-100 text-orange-600', emoji: '🧭' },
  socializer: { gradient: 'from-pink-400 to-rose-300', badge: 'bg-pink-100 text-pink-600', emoji: '💬' },
  observer: { gradient: 'from-indigo-400 to-violet-300', badge: 'bg-indigo-100 text-indigo-600', emoji: '🔍' },
  concentrator: { gradient: 'from-emerald-400 to-teal-300', badge: 'bg-emerald-100 text-emerald-600', emoji: '🎯' },
  balanced: { gradient: 'from-sky-400 to-cyan-300', badge: 'bg-sky-100 text-sky-600', emoji: '⚖️' },
};

interface ResultCoverProps {
  primaryType: string;
  primaryTypeLabel: string;
  title: string;
  description: string;
}

export default function ResultCover({
  primaryType,
  primaryTypeLabel,
  title,
  description,
}: ResultCoverProps) {
  const style = TYPE_STYLES[primaryType] || TYPE_STYLES.balanced;

  return (
    <div className={`bg-gradient-to-br ${style.gradient} rounded-3xl p-6 mt-4 shadow-lg`}>
      <div className="text-center">
        <span className="text-7xl block mx-auto mb-3">{style.emoji}</span>
        <span
          className={`inline-block ${style.badge} text-sm font-bold px-4 py-1.5 rounded-full mb-3`}
        >
          {primaryTypeLabel}
        </span>
        <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
        <p className="text-sm text-white/80 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
