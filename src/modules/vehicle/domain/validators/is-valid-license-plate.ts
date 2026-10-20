// Funções puras da placa: única fonte da regra, usadas pelo VO LicensePlate (invariante
// de domínio) e pelo formato `license-plate` do TypeBox (borda HTTP).

// Forma canônica: maiúscula, sem hífen e sem espaços ("abc-1d23" → "ABC1D23").
export function normalizeLicensePlate(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]/g, '');
}

// Antigo (ABC1234) e Mercosul (ABC1D23) só diferem na 5ª posição: dígito ou letra.
const LICENSE_PLATE = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/;

export function isValidLicensePlate(raw: string): boolean {
  return LICENSE_PLATE.test(normalizeLicensePlate(raw));
}
