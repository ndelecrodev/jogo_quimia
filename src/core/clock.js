/** "HH:MM:SS" até o horário HH:MM de hoje, ou null se já passou / inválido. */
export function championCountdown(hhmm, now = new Date()) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m) return null;
  const target = new Date(now);
  target.setHours(Number(m[1]), Number(m[2]), 0, 0);
  const diff = target - now;
  if (diff <= 0) return null;
  const s = Math.floor(diff / 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}
