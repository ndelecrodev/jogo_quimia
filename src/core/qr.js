// QR code gerado localmente (sem internet) com vendor/qrcode.js (MIT, carregado como script clássico).
export function qrMatrix(text) {
  if (!window.qrcode) throw new Error('vendor/qrcode.js não carregou');
  const q = window.qrcode(0, 'M'); // tamanho automático, correção de erro média
  q.addData(String(text));
  q.make();
  const n = q.getModuleCount();
  return { n, dark: (r, c) => q.isDark(r, c) };
}
