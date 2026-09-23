/* ==========================================================================
   BARBEARIA — script.js
   --------------------------------------------------------------------------
   1. CONFIG ............ dados do cliente (edite SOMENTE aqui)
   2. Utilitários
   3. Preenchimento dos dados nas páginas (nome, endereço, horários, links…)
   4. Links do WhatsApp
   5. Cabeçalho (efeito ao rolar) e menu hambúrguer
   6. Animações de entrada (Intersection Observer)
   7. Galeria: filtros e lightbox
   ========================================================================== */

/* 1. CONFIG ============================================================== */
/* Tudo o que aparece nas marcações data-cfg / data-hours / data-social /
   data-google / data-credit / data-map dos arquivos HTML é lido daqui.
   O texto que já está escrito no HTML serve apenas de reserva caso o
   JavaScript não carregue. */
const CONFIG = {
  // true  = mostra selos "Exemplo", avisos e espaços reservados
  // false = esconde tudo isso (use quando o conteúdo real estiver preenchido)
  modoDemonstracao: true,

  // EDITAR: nome da barbearia (cabeçalho, rodapé, copyright)
  nome: "Barbearia Dom Barão",

  // EDITAR: número oficial do WhatsApp — só dígitos, com código do país e DDD.
  // Exemplo: 5511999999999  (55 = Brasil, 11 = DDD, 999999999 = número)
  whatsapp: "5500000000000",
  whatsappExibicao: "(00) 00000-0000",
  mensagemPadrao: "Olá! Vim pelo site e gostaria de mais informações.",

  // EDITAR: telefone fixo e e-mail (deixe "" para ocultar o e-mail)
  telefone: "(00) 0000-0000",
  email: "contato@barbeariadombarao.com.br",

  // EDITAR: endereço completo
  endereco: "Rua Exemplo, 000 – Bairro, Cidade – UF, 00000-000",

  // EDITAR: horário de funcionamento (uma linha por item)
  horarios: [
    { dia: "Terça a sexta", horas: "08:30h às 19:30h" },
    { dia: "Sábado",          horas: "08:30h às 16:00h" },
    { dia: "Domingo",         horas: "Fechado" }
  ],

  // EDITAR: endereços completos (https://…) das redes sociais. Vazio = oculta.
  redes: {
    instagram: "https://www.instagram.com/barbeariadombarao/",
    facebook: "https://www.facebook.com/barbeariadombarao/",
    youtube: "https://www.youtube.com/barbeariadombarao/"
  },

  // EDITAR: links e números do Google.
  //   perfil      → link do perfil da barbearia no Google Maps
  //   avaliar     → link para deixar uma avaliação (Google Meu Negócio > "Pedir avaliações")
  //   comoChegar  → link de rota do Google Maps (ou o próprio link do perfil)
  //   nota / totalAvaliacoes → informe manualmente. NÃO há integração automática com o Google.
  google: {
    perfil: "https://www.google.com/maps?cid=0000000000000000000",  // exemplo — substitua pelo link real
    avaliar: "",
    comoChegar: "",
    nota: "4,9",              // exemplo — substitua pela nota real
    totalAvaliacoes: "1,7mil"    // exemplo — substitua pelo total real
  },

  // EDITAR: URL de incorporação do mapa (Google Maps > Compartilhar > Incorporar um mapa,
  // copie apenas o endereço que está dentro de src="…"). Só preencha com o endereço verdadeiro.
  mapaEmbedUrl: "",

  // Crédito do desenvolvedor no rodapé
  credito: { nome: "DSB Company", url: "https://dsb-company.netlify.app/" }
};


/* 2. UTILITÁRIOS ========================================================= */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const soDigitos = (v) => String(v || "").replace(/\D/g, "");
const porCaminho = (obj, caminho) => caminho.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

/* Aplica um link; se não estiver configurado, marca como espaço reservado (modo demo) ou oculta. */
function aplicarLink(el, url) {
  if (url) {
    el.href = url;
    el.target = "_blank";
    el.rel = "noopener noreferrer";
    el.classList.remove("is-placeholder");
    return;
  }
  if (CONFIG.modoDemonstracao) {
    el.classList.add("is-placeholder");
    el.title = "Link ainda não configurado (veja CONFIG em js/script.js)";
    el.addEventListener("click", (e) => e.preventDefault());
  } else {
    el.hidden = true;
  }
}


/* 3. DADOS NAS PÁGINAS =================================================== */
function preencherDados() {
  document.documentElement.classList.toggle("hide-demo", !CONFIG.modoDemonstracao);

  // Textos: <span data-cfg="nome">, data-cfg="google.nota", etc.
  $$("[data-cfg]").forEach((el) => {
    const valor = porCaminho(CONFIG, el.dataset.cfg);
    if (valor) {
      el.textContent = valor;
    } else if (!CONFIG.modoDemonstracao) {
      (el.closest("[data-optional]") || el).hidden = true;
    }
  });

  // Links de telefone / e-mail
  $$("[data-cfg-href='tel']").forEach((a) => { a.href = "tel:" + soDigitos(CONFIG.telefone); });
  $$("[data-cfg-href='whatsapp-tel']").forEach((a) => { a.href = "tel:+" + soDigitos(CONFIG.whatsapp); });
  $$("[data-cfg-href='mailto']").forEach((a) => { if (CONFIG.email) a.href = "mailto:" + CONFIG.email; });

  // Horários
  $$("[data-hours]").forEach((ul) => {
    ul.replaceChildren(...CONFIG.horarios.map((h) => {
      const li = document.createElement("li");
      const dia = document.createElement("span");
      const horas = document.createElement("span");
      dia.textContent = h.dia;
      horas.textContent = h.horas;
      li.append(dia, horas);
      return li;
    }));
  });

  // Redes sociais (o item pai <li> também é ocultado quando não houver link)
  $$("[data-social]").forEach((a) => {
    aplicarLink(a, CONFIG.redes[a.dataset.social]);
    if (a.hidden && a.parentElement.tagName === "LI") a.parentElement.hidden = true;
  });

  // Links do Google
  const g = CONFIG.google;
  const destinos = { perfil: g.perfil, avaliar: g.avaliar || g.perfil, rota: g.comoChegar || g.perfil };
  $$("[data-google]").forEach((a) => aplicarLink(a, destinos[a.dataset.google]));

  // Estrelas: preenchimento proporcional à nota
  const nota = parseFloat(String(g.nota).replace(",", "."));
  $$("[data-stars]").forEach((el) => {
    if (!Number.isNaN(nota)) {
      el.style.setProperty("--rating", Math.min(5, Math.max(0, nota)));
      el.setAttribute("aria-label", `Nota ${g.nota} de 5`);
    }
  });

  // Crédito e ano
  $$("[data-credit]").forEach((a) => {
    a.textContent = CONFIG.credito.nome;
    a.href = CONFIG.credito.url;
  });
  $$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });

  // Mapa: só é incorporado quando houver um endereço verdadeiro configurado
  const mapa = $("[data-map]");
  if (mapa) {
    if (CONFIG.mapaEmbedUrl) {
      const frame = document.createElement("iframe");
      frame.src = CONFIG.mapaEmbedUrl;
      frame.title = "Mapa com a localização da barbearia";
      frame.loading = "lazy";
      frame.referrerPolicy = "no-referrer-when-downgrade";
      frame.allowFullscreen = true;
      mapa.replaceChildren(frame);
    } else if (!CONFIG.modoDemonstracao) {
      mapa.hidden = true;
    }
  }
}


/* 4. WHATSAPP ============================================================ */
/* Qualquer link com data-wa vira https://wa.me/NÚMERO?text=MENSAGEM.
   - data-wa="Mensagem…"  → mensagem própria do botão (ex.: serviço ou plano escolhido)
   - data-wa=""           → usa a mensagem da página (<body data-wa-msg="…">)
   Sem JavaScript, o link cai na página de contato. */
function montarWhatsApp() {
  const numero = soDigitos(CONFIG.whatsapp);
  const msgPagina = document.body.dataset.waMsg || CONFIG.mensagemPadrao;
  $$("[data-wa]").forEach((a) => {
    const msg = a.dataset.wa || msgPagina;
    a.href = `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  });
}


/* 5. CABEÇALHO E MENU ==================================================== */
function iniciarCabecalho() {
  const header = $(".site-header");
  if (!header) return;

  // Fundo do cabeçalho muda ao rolar
  let agendado = false;
  const atualizar = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 24);
    agendado = false;
  };
  window.addEventListener("scroll", () => {
    if (!agendado) { agendado = true; requestAnimationFrame(atualizar); }
  }, { passive: true });
  atualizar();

  // Menu hambúrguer
  const botao = $(".nav-toggle");
  const menu = $("#menu-principal");
  if (!botao || !menu) return;

  const abrir = (aberto) => {
    menu.classList.toggle("is-open", aberto);
    botao.setAttribute("aria-expanded", String(aberto));
    botao.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
    document.documentElement.classList.toggle("menu-open", aberto);
  };

  botao.addEventListener("click", () => abrir(botao.getAttribute("aria-expanded") !== "true"));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) abrir(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && botao.getAttribute("aria-expanded") === "true") {
      abrir(false);
      botao.focus();
    }
  });
  // Ao voltar para a largura de desktop, garante que o menu não fique "preso" aberto
  window.matchMedia("(min-width: 1081px)").addEventListener("change", (e) => { if (e.matches) abrir(false); });
}


/* 6. ANIMAÇÕES DE ENTRADA ================================================ */
/* Classes no HTML: .reveal + .reveal--up | .reveal--left | .reveal--right
   Grupos com data-stagger escalonam o atraso dos filhos diretos. */
function iniciarAnimacoes() {
  const itens = $$(".reveal");
  if (!itens.length) return;

  const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduzir || !("IntersectionObserver" in window)) {
    itens.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  $$("[data-stagger]").forEach((grupo) => {
    $$(":scope > .reveal", grupo).forEach((el, i) => el.style.setProperty("--d", `${Math.min(i, 5) * 90}ms`));
  });

  const obs = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("is-visible");
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

  itens.forEach((el) => obs.observe(el));
}


/* 7. GALERIA ============================================================= */
function iniciarGaleria() {
  const grade = $("[data-gallery]");
  if (!grade) return;

  const itens = $$(".gallery__item", grade);
  const chips = $$("[data-filter]");
  const status = $("[data-gallery-status]");

  // Filtros por categoria
  chips.forEach((chip) => chip.addEventListener("click", () => {
    const filtro = chip.dataset.filter;
    chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    itens.forEach((it) => { it.hidden = !(filtro === "todas" || it.dataset.cat === filtro); });
    if (status) {
      const n = itens.filter((it) => !it.hidden).length;
      status.textContent = `Mostrando ${n} ${n === 1 ? "foto" : "fotos"}`;
    }
  }));

  // Lightbox
  const dialogo = $("#lightbox");
  if (!dialogo) return;
  const img = $(".lightbox__img", dialogo);
  const legenda = $(".lightbox__caption", dialogo);
  const contador = $(".lightbox__count", dialogo);
  const anterior = $(".lightbox__prev", dialogo);
  const proximo = $(".lightbox__next", dialogo);
  let visiveis = [];
  let atual = 0;

  const mostrar = (i) => {
    atual = (i + visiveis.length) % visiveis.length;
    const it = visiveis[atual];
    const miniatura = $("img", it);
    img.src = it.dataset.full || miniatura.src;
    img.alt = miniatura.alt;
    legenda.textContent = it.dataset.caption || "";
    contador.textContent = `${atual + 1} / ${visiveis.length}`;
  };

  const abrir = (item) => {
    visiveis = itens.filter((it) => !it.hidden);
    const unico = visiveis.length < 2;
    anterior.hidden = unico;
    proximo.hidden = unico;
    mostrar(visiveis.indexOf(item));
    if (typeof dialogo.showModal === "function") dialogo.showModal();
    else dialogo.setAttribute("open", "");
    document.documentElement.classList.add("lb-open");
  };

  const fechar = () => {
    if (typeof dialogo.close === "function") dialogo.close();
    else dialogo.removeAttribute("open");
  };

  itens.forEach((it) => it.addEventListener("click", () => abrir(it)));
  $("[data-lb-close]", dialogo).addEventListener("click", fechar);
  anterior.addEventListener("click", () => mostrar(atual - 1));
  proximo.addEventListener("click", () => mostrar(atual + 1));

  // Fecha ao clicar fora da foto e dos botões
  dialogo.addEventListener("click", (e) => {
    if (!e.target.closest(".lightbox__img, .lightbox__btn, figcaption")) fechar();
  });
  // Esc (nativo) e qualquer outro fechamento
  dialogo.addEventListener("close", () => {
    document.documentElement.classList.remove("lb-open");
    img.removeAttribute("src");
  });
  // Setas do teclado
  dialogo.addEventListener("keydown", (e) => {
    if (visiveis.length < 2) return;
    if (e.key === "ArrowLeft") mostrar(atual - 1);
    if (e.key === "ArrowRight") mostrar(atual + 1);
  });
  // Deslizar no celular
  let inicioX = null;
  dialogo.addEventListener("touchstart", (e) => { inicioX = e.changedTouches[0].clientX; }, { passive: true });
  dialogo.addEventListener("touchend", (e) => {
    if (inicioX === null || visiveis.length < 2) return;
    const dx = e.changedTouches[0].clientX - inicioX;
    if (Math.abs(dx) > 50) mostrar(atual + (dx < 0 ? 1 : -1));
    inicioX = null;
  }, { passive: true });
}


/* INICIALIZAÇÃO ========================================================== */
document.addEventListener("DOMContentLoaded", () => {
  preencherDados();
  montarWhatsApp();
  iniciarCabecalho();
  iniciarAnimacoes();
  iniciarGaleria();
});
