// Troque esse número a CADA deploy novo no GitHub — é o gatilho da atualização.
const CACHE_VERSION = 'draftpro-v5';
const STATIC_CACHE = `${CACHE_VERSION}-static`;

// Arquivos estáticos que raramente mudam (ícones, fontes locais etc).
// Deixe vazio se não tiver nenhum por enquanto.
const ASSETS_ESTATICOS = [];

self.addEventListener('install', (event) => {
  // Não espera as abas antigas fecharem — assume a versão nova assim que instala.
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      if (ASSETS_ESTATICOS.length) return cache.addAll(ASSETS_ESTATICOS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(
        chaves.filter((chave) => chave !== STATIC_CACHE).map((chave) => caches.delete(chave))
      ))
      .then(() => self.clients.claim()) // assume o controle das abas já abertas imediatamente
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // HTML e JS do app: SEMPRE tenta a rede primeiro, para garantir a versão mais nova.
  // Só usa o cache se estiver offline.
  if (request.mode === 'navigate' || request.destination === 'document' || request.destination === 'script') {
    event.respondWith(
      fetch(request)
        .then((resposta) => {
          const clone = resposta.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          return resposta;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Demais arquivos (imagens, ícones): cache primeiro, atualizando em segundo plano.
  event.respondWith(
    caches.match(request).then((emCache) => {
      const buscaRede = fetch(request).then((resposta) => {
        caches.open(STATIC_CACHE).then((cache) => cache.put(request, resposta.clone()));
        return resposta;
      }).catch(() => emCache);
      return emCache || buscaRede;
    })
  );
});
