// ==================== CONFIGURAÇÃO ====================
const WHATSAPP_NUMERO = '5521996892217';
const API_BASE = '';

// ==================== ESTADO GLOBAL ====================
let produtos = [];
let categorias = [];
let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
let paginaAtual = 1;
let totalPaginas = 1;
let categoriaAtiva = '';
let buscaAtual = '';
let ordenacao = 'recentes';

// ==================== ELEMENTOS DOM ====================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const productsGrid = $('#productsGrid');
const categoryNav = $('#categoryNav');
const searchInput = $('#searchInput');
const searchBtn = $('#searchBtn');
const cartToggle = $('#cartToggle');
const cartCount = $('#cartCount');
const cartSidebar = $('#cartSidebar');
const cartOverlay = $('#cartOverlay');
const cartClose = $('#cartClose');
const cartItems = $('#cartItems');
const cartFooter = $('#cartFooter');
const cartTotal = $('#cartTotal');
const checkoutBtn = $('#checkoutBtn');
const productModal = $('#productModal');
const modalBody = $('#modalBody');
const modalClose = $('.modal-close');
const modalOverlay = $('.modal-overlay');
const pagination = $('#pagination');
const noResults = $('#noResults');
const sectionTitle = $('#sectionTitle');
const sortSelect = $('#sortSelect');
const toast = $('#toast');
const hero = $('.hero');

// ==================== INICIALIZAÇÃO ====================
async function init() {
  await carregarCategorias();
  await carregarProdutos();
  atualizarCarrinhoUI();
  setupEventListeners();
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // Busca
  searchBtn.addEventListener('click', () => {
    buscaAtual = searchInput.value.trim();
    paginaAtual = 1;
    atualizarHero();
    carregarProdutos();
  });
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      buscaAtual = searchInput.value.trim();
      paginaAtual = 1;
      atualizarHero();
      carregarProdutos();
    }
  });

  // Ordenação
  sortSelect.addEventListener('change', () => {
    ordenacao = sortSelect.value;
    renderProdutos();
  });

  // Carrinho
  cartToggle.addEventListener('click', abrirCarrinho);
  cartClose.addEventListener('click', fecharCarrinho);
  cartOverlay.addEventListener('click', fecharCarrinho);
  checkoutBtn.addEventListener('click', finalizarCompra);

  // Modal
  modalClose.addEventListener('click', fecharModal);
  modalOverlay.addEventListener('click', fecharModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      fecharModal();
      fecharCarrinho();
    }
  });

  // Categorias - delegado
  categoryNav.addEventListener('click', (e) => {
    e.preventDefault();
    const link = e.target.closest('.nav-link');
    if (!link) return;
    categoriaAtiva = link.dataset.categoria;
    buscaAtual = '';
    searchInput.value = '';
    paginaAtual = 1;
    atualizarCategoriaAtiva();
    atualizarHero();
    carregarProdutos();
  });

  // Paginação - delegado
  pagination.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || btn.disabled) return;
    paginaAtual = parseInt(btn.dataset.page);
    carregarProdutos();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ==================== CATEGORIAS ====================
async function carregarCategorias() {
  try {
    const res = await fetch(`${API_BASE}/api/categorias`);
    categorias = await res.json();
    renderCategorias();
  } catch (err) {
    console.error('Erro ao carregar categorias:', err);
  }
}

function renderCategorias() {
  const todosLi = categoryNav.querySelector('li:first-child');
  categoryNav.innerHTML = '';
  const todosLink = document.createElement('a');
  todosLink.href = '#';
  todosLink.className = `nav-link ${categoriaAtiva === '' ? 'active' : ''}`;
  todosLink.dataset.categoria = '';
  todosLink.textContent = 'Todos';
  const todosLi2 = document.createElement('li');
  todosLi2.appendChild(todosLink);
  categoryNav.appendChild(todosLi2);

  categorias.forEach(cat => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#';
    a.className = `nav-link ${categoriaAtiva === cat.slug ? 'active' : ''}`;
    a.dataset.categoria = cat.slug;
    a.textContent = cat.nome;
    li.appendChild(a);
    categoryNav.appendChild(li);
  });
}

function atualizarCategoriaAtiva() {
  $$('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.categoria === categoriaAtiva);
  });
}

function atualizarHero() {
  if (categoriaAtiva === '' && buscaAtual === '') {
    hero.classList.remove('hidden');
  } else {
    hero.classList.add('hidden');
  }
}

// ==================== PRODUTOS ====================
async function carregarProdutos() {
  try {
    let url = `${API_BASE}/api/produtos?page=${paginaAtual}&limit=24`;
    if (buscaAtual) url += `&busca=${encodeURIComponent(buscaAtual)}`;
    if (categoriaAtiva) url += `&categoria=${encodeURIComponent(categoriaAtiva)}`;

    const res = await fetch(url);
    const data = await res.json();
    produtos = data.produtos;
    totalPaginas = data.pages;

    if (buscaAtual) {
      sectionTitle.textContent = `Resultados para "${buscaAtual}"`;
    } else if (categoriaAtiva) {
      const cat = categorias.find(c => c.slug === categoriaAtiva);
      sectionTitle.textContent = cat ? cat.nome : 'Produtos';
    } else {
      sectionTitle.textContent = 'Todos os Produtos';
    }

    renderProdutos();
  } catch (err) {
    console.error('Erro ao carregar produtos:', err);
    productsGrid.innerHTML = '<p class="no-results">Erro ao carregar produtos.</p>';
  }
}

function ordenarProdutos(lista) {
  const sorted = [...lista];
  switch (ordenacao) {
    case 'menor-preco':
      sorted.sort((a, b) => a.preco - b.preco);
      break;
    case 'maior-preco':
      sorted.sort((a, b) => b.preco - a.preco);
      break;
    case 'recentes':
    default:
      sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
  }
  return sorted;
}

function renderProdutos() {
  const sorted = ordenarProdutos(produtos);

  if (sorted.length === 0) {
    productsGrid.innerHTML = '';
    noResults.style.display = 'block';
    pagination.innerHTML = '';
    return;
  }

  noResults.style.display = 'none';
  productsGrid.innerHTML = sorted.map(p => `
    <article class="product-card" onclick="abrirModal(${p.id})">
      <img src="${p.imagem}" alt="${p.nome}" class="product-image" loading="lazy"
           onerror="this.src='/uploads/sem-foto.svg'">
      <div class="product-info">
        <h3 class="product-name">${p.nome}</h3>
        <div class="product-price">
          ${p.preco_original ? `<div class="price-original">R$ ${formatarPreco(p.preco_original)}</div>` : ''}
          <div class="price-current">R$ ${formatarPreco(p.preco)}</div>
          <div class="price-installments">em até 12x</div>
        </div>
      </div>
      <div class="product-actions">
        <button class="btn-add-cart" onclick="event.stopPropagation(); adicionarAoCarrinho(${p.id})">
          Adicionar ao carrinho
        </button>
      </div>
    </article>
  `).join('');

  renderPaginacao();
}

function renderPaginacao() {
  if (totalPaginas <= 1) {
    pagination.innerHTML = '';
    return;
  }

  let html = '';
  html += `<button data-page="${paginaAtual - 1}" ${paginaAtual === 1 ? 'disabled' : ''}>‹</button>`;

  const maxBotoes = 5;
  let inicio = Math.max(1, paginaAtual - 2);
  let fim = Math.min(totalPaginas, inicio + maxBotoes - 1);
  inicio = Math.max(1, fim - maxBotoes + 1);

  for (let i = inicio; i <= fim; i++) {
    html += `<button data-page="${i}" class="${i === paginaAtual ? 'active' : ''}">${i}</button>`;
  }

  html += `<button data-page="${paginaAtual + 1}" ${paginaAtual === totalPaginas ? 'disabled' : ''}>›</button>`;
  pagination.innerHTML = html;
}

function formatarPreco(valor) {
  return parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ==================== MODAL ====================
async function abrirModal(id) {
  try {
    const res = await fetch(`${API_BASE}/api/produtos/${id}`);
    const p = await res.json();

    modalBody.innerHTML = `
      <div class="modal-product">
        <img src="${p.imagem}" alt="${p.nome}" class="modal-product-img"
             onerror="this.src='/uploads/sem-foto.svg'">
        <div class="modal-product-details">
          <h3>${p.nome}</h3>
          ${p.preco_original ? `<div class="modal-price-original">R$ ${formatarPreco(p.preco_original)}</div>` : ''}
          <div class="modal-price-current">R$ ${formatarPreco(p.preco)}</div>
          <p class="modal-description">${p.descricao || 'Produto sem descrição detalhada.'}</p>
          <p style="font-size:13px;color:var(--cinza-400);margin-bottom:16px;">
            ${p.categoria_nome ? 'Categoria: ' + p.categoria_nome : ''}
          </p>
          <button class="modal-add-cart" onclick="adicionarAoCarrinho(${p.id}); fecharModal();">
            Adicionar ao carrinho 🛒
          </button>
        </div>
      </div>
    `;
    productModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  } catch (err) {
    console.error('Erro ao carregar produto:', err);
  }
}

function fecharModal() {
  productModal.classList.remove('active');
  document.body.style.overflow = '';
}

// ==================== CARRINHO ====================
function adicionarAoCarrinho(produtoId) {
  const produto = produtos.find(p => p.id === produtoId);
  if (!produto) return;

  const itemExistente = carrinho.find(item => item.id === produtoId);
  if (itemExistente) {
    itemExistente.quantidade++;
  } else {
    carrinho.push({
      id: produto.id,
      nome: produto.nome,
      preco: produto.preco,
      imagem: produto.imagem,
      quantidade: 1
    });
  }

  salvarCarrinho();
  atualizarCarrinhoUI();
  mostrarToast(`${produto.nome} adicionado ao carrinho!`);
}

function removerDoCarrinho(produtoId) {
  carrinho = carrinho.filter(item => item.id !== produtoId);
  salvarCarrinho();
  atualizarCarrinhoUI();
}

function alterarQuantidade(produtoId, delta) {
  const item = carrinho.find(item => item.id === produtoId);
  if (!item) return;
  item.quantidade += delta;
  if (item.quantidade <= 0) {
    removerDoCarrinho(produtoId);
    return;
  }
  salvarCarrinho();
  atualizarCarrinhoUI();
}

function salvarCarrinho() {
  localStorage.setItem('carrinho', JSON.stringify(carrinho));
}

function atualizarCarrinhoUI() {
  const totalItens = carrinho.reduce((sum, item) => sum + item.quantidade, 0);
  cartCount.textContent = totalItens;

  if (carrinho.length === 0) {
    cartItems.innerHTML = '<p class="cart-empty">Seu carrinho está vazio.</p>';
    cartFooter.style.display = 'none';
  } else {
    cartItems.innerHTML = carrinho.map(item => `
      <div class="cart-item">
        <img src="${item.imagem}" alt="${item.nome}" class="cart-item-img"
             onerror="this.src='/uploads/sem-foto.svg'">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.nome}</div>
          <div class="cart-item-price">R$ ${formatarPreco(item.preco * item.quantidade)}</div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="alterarQuantidade(${item.id}, -1)">−</button>
            <span>${item.quantidade}</span>
            <button class="qty-btn" onclick="alterarQuantidade(${item.id}, 1)">+</button>
          </div>
        </div>
        <button class="cart-item-remove" onclick="removerDoCarrinho(${item.id})">🗑️</button>
      </div>
    `).join('');
    cartFooter.style.display = 'block';

    const total = carrinho.reduce((sum, item) => sum + item.preco * item.quantidade, 0);
    cartTotal.textContent = `R$ ${formatarPreco(total)}`;
  }
}

function abrirCarrinho() {
  cartSidebar.classList.add('active');
  cartOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function fecharCarrinho() {
  cartSidebar.classList.remove('active');
  cartOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

// ==================== WHATSAPP ====================
function finalizarCompra() {
  if (carrinho.length === 0) return;

  const total = carrinho.reduce((sum, item) => sum + item.preco * item.quantidade, 0);
  let mensagem = '🛒 *NOVO PEDIDO* 🛒\n\n';
  mensagem += '📋 *Produtos:*\n\n';

  carrinho.forEach((item, index) => {
    mensagem += `${index + 1}. ${item.nome}\n`;
    mensagem += `   Qtd: ${item.quantidade}x | R$ ${formatarPreco(item.preco)} cada\n`;
    mensagem += `   Subtotal: R$ ${formatarPreco(item.preco * item.quantidade)}\n\n`;
  });

  mensagem += '──────────────────\n';
  mensagem += `💰 *TOTAL: R$ ${formatarPreco(total)}*\n\n`;
  mensagem += '📦 Aguardando confirmação do pedido.';

  const url = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, '_blank');

  // Não limpar carrinho - cliente pode querer ajustar
  fecharCarrinho();
}

// ==================== TOAST ====================
function mostrarToast(mensagem) {
  toast.textContent = mensagem;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// ==================== INICIAR ====================
document.addEventListener('DOMContentLoaded', init);
