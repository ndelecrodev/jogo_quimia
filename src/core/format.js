// Número com separador de milhar pt-BR ("16.000"). Determinístico (não depende do idioma do navegador).
export const fmtNum = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
