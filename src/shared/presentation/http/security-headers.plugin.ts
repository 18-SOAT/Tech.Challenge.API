import { Elysia } from 'elysia';

export const DOCS_PATH = '/openapi';

// A API só devolve JSON: nada de script, estilo ou frame. Uma CSP fechada não
// atrapalha um cliente HTTP e corta o estrago se uma resposta for aberta no
// navegador e interpretada como HTML.
const API_CSP = "default-src 'none'; frame-ancestors 'none'";

// O Scalar em /openapi é uma página: carrega o script do jsDelivr, usa estilo
// inline e um <script> de configuração inline, e busca a especificação na própria
// API. A CSP dele abre só isso — afrouxar a da API inteira para a doc funcionar
// seria trocar segurança de todas as rotas por conveniência de uma.
const DOCS_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.scalar.com",
  "font-src 'self' data: https://cdn.jsdelivr.net https://fonts.scalar.com",
  "img-src 'self' data: https:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
].join('; ');

const COMMON_HEADERS = {
  // O navegador não "adivinha" o tipo: JSON é JSON, nunca script.
  'x-content-type-options': 'nosniff',
  // Nada de abrir a API ou a doc dentro de um iframe (clickjacking).
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  // HTTPS por um ano (o navegador ignora em HTTP, então não atrapalha o local).
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'cross-origin-opener-policy': 'same-origin',
};

// onRequest já é global no Elysia (roda antes do roteamento, quando ainda não se
// sabe de que plugin é a rota): vale para toda resposta de todos os módulos,
// inclusive 404 de rota inexistente e 500 do errorHandler.
export const securityHeaders = new Elysia({
  name: 'security-headers',
}).onRequest(({ request, set }) => {
  const isDocs = new URL(request.url).pathname.startsWith(DOCS_PATH);
  Object.assign(set.headers, COMMON_HEADERS, {
    'content-security-policy': isDocs ? DOCS_CSP : API_CSP,
    // Resposta da API pode levar token ou dado pessoal: nenhum cache guarda.
    ...(isDocs ? {} : { 'cache-control': 'no-store' }),
  });
});
