// ==================== VERIFICAÇÃO DE AUTENTICAÇÃO ====================
const token = localStorage.getItem('adminToken');
if (!token) {
  window.location.href = '/admin';
}

// ==================== CONFIGURAÇÃO ====================
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ==================== ESTADO ====================
let adminPage = 1;
let adminTotalPages = 1;
let editandoId = null;

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', () => {
  const usuario = localStorage.getItem('adminUsuario') || 'Admin';
  $('#adminUser').textContent = `👤 ${usuario}`;

  carregarCategoriasSelect();
  carregarProdutosAdmin();

  // Navegação da sidebar
  $$('.sidebar-link[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      navegarPara(section);
    });
  });

  // Logout
  $('#sidebarLogout').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsuario');
    window.location.href = '/admin';
  });

  // Busca admin
  $('#adminSearchBtn').addEventListener('click', () => {
    adminPage = 1;
    carregarProdutosAdmin($('#adminSearch').value);
  });
  $('#adminSearch').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      adminPage = 1;
      carregarProdutosAdmin($('#adminSearch').value);
    }
  });

  // Form submit
  $('#produtoForm').addEventListener('submit', salvarProduto);

  // Cancelar edição
  $('#cancelBtn').addEventListener('click', () => {
    resetarFormulario();
    navegarPara('produtos');
  });

  // Preview imagem principal
  $('#produtoImagem').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        $('#previewImagem').src = ev.target.result;
        $('#previewImagem').style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });

  // Preview fotos adicionais
  $('#produtoFotos').addEventListener('change', (e) => {
    const files = e.target.files;
    const container = $('#previewFotos');
    container.innerHTML = '';
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = document.createElement('img');
        img.src = ev.target.result;
        img.className = 'preview-thumb';
        container.appendChild(img);
      };
      reader.readAsDataURL(file);
    }
  });

  // Preview video
  $('#produtoVideo').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const videoEl = $('#previewVideo');
    if (file) {
      const url = URL.createObjectURL(file);
      videoEl.src = url;
      videoEl.style.display = 'block';
    } else {
      videoEl.style.display = 'none';
    }
  });

  // Salvar Hero
  $('#salvarHero').addEventListener('click', salvarHero);

  // Paginação admin
  $('#adminPagination').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || btn.disabled) return;
    adminPage = parseInt(btn.dataset.page);
    carregarProdutosAdmin($('#adminSearch').value);
  });
});

// ==================== NAVEGAÇÃO ====================
function navegarPara(section) {
  $$('.admin-section').forEach(s => s.classList.remove('active'));
  $$('.sidebar-link[data-section]').forEach(l => l.classList.remove('active'));

  const sectionEl = $(`#section-${section}`);
  const linkEl = document.querySelector(`[data-section="${section}"]`);

  if (sectionEl) sectionEl.classList.add('active');
  if (linkEl) linkEl.classList.add('active');

  const titles = { produtos: '📦 Produtos', novo: '➕ Produto', hero: '⭐ Destaques Hero' };
  $('#sectionName').textContent = titles[section] || '';

  if (section === 'produtos') {
    if (editandoId) resetarFormulario();
    carregarProdutosAdmin();
  } else if (section === 'hero') {
    if (editandoId) resetarFormulario();
    carregarHeroSection();
  } else if (section === 'novo' && !editandoId) {
    resetarFormulario();
  }
}

// ==================== CATEGORIAS ====================
async function carregarCategoriasSelect() {
  try {
    const res = await fetch('/api/categorias');
    const cats = await res.json();
    const select = $('#produtoCategoria');
    cats.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.nome;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Erro ao carregar categorias:', err);
  }
}

// ==================== HERO SECTION ====================
async function carregarHeroSection() {
  try {
    // Carregar todos os produtos para os selects
    const res = await fetch('/api/produtos?limit=200');
    const data = await res.json();
    const produtos = data.produtos;

    // Popular selects
    ['heroLancamento', 'heroExclusivo', 'heroMaisVendido'].forEach(id => {
      const select = $('#' + id);
      select.innerHTML = '<option value="">Selecione um produto...</option>';
      produtos.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.nome;
        select.appendChild(opt);
      });
    });

    // Carregar hero atual
    const heroRes = await fetch('/api/produtos/hero');
    const heroProds = await heroRes.json();

    heroProds.forEach(p => {
      if (p.hero_tag === 'lancamento') $('#heroLancamento').value = p.id;
      if (p.hero_tag === 'exclusivo') $('#heroExclusivo').value = p.id;
      if (p.hero_tag === 'mais_vendido') $('#heroMaisVendido').value = p.id;
    });
  } catch (err) {
    console.error('Erro ao carregar hero:', err);
  }
}

async function salvarHero() {
  const slots = [
    { id: $('#heroLancamento').value, tag: 'lancamento' },
    { id: $('#heroExclusivo').value, tag: 'exclusivo' },
    { id: $('#heroMaisVendido').value, tag: 'mais_vendido' }
  ];

  try {
    // Primeiro limpa todos
    for (const slot of slots) {
      if (slot.id) {
        await fetch(`/api/admin/produtos/${slot.id}/hero`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ hero_tag: slot.tag })
        });
      }
    }
    // Limpa slots vazios
    for (const slot of slots) {
      if (!slot.id) {
        // Busca o produto atual com essa tag e limpa
        const res = await fetch('/api/produtos/hero');
        const heroProds = await res.json();
        const atual = heroProds.find(p => p.hero_tag === slot.tag);
        if (atual) {
          await fetch(`/api/admin/produtos/${atual.id}/hero`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ hero_tag: null })
          });
        }
      }
    }
    mostrarToast('Destaques salvos com sucesso!');
  } catch (err) {
    console.error('Erro ao salvar hero:', err);
    mostrarToast('Erro ao salvar', true);
  }
}

// ==================== PRODUTOS (ADMIN) ====================
async function carregarProdutosAdmin(busca = '') {
  try {
    let url = `/api/produtos?page=${adminPage}&limit=15`;
    if (busca) url += `&busca=${encodeURIComponent(busca)}`;

    const res = await fetch(url);
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('adminToken');
      window.location.href = '/admin';
      return;
    }

    const data = await res.json();
    adminTotalPages = data.pages;
    renderTabelaProdutos(data.produtos);
  } catch (err) {
    console.error('Erro ao carregar produtos:', err);
    $('#produtosTableBody').innerHTML = '<tr><td colspan="6" class="table-loading">Erro ao carregar.</td></tr>';
  }
}

function renderTabelaProdutos(produtos) {
  if (produtos.length === 0) {
    $('#produtosTableBody').innerHTML = '<tr><td colspan="6" class="table-loading">Nenhum produto encontrado.</td></tr>';
    $('#adminPagination').innerHTML = '';
    return;
  }

  const heroLabels = { lancamento: '🆕 Lanç.', exclusivo: '💎 Excl.', mais_vendido: '🔥 Top' };

  $('#produtosTableBody').innerHTML = produtos.map(p => `
    <tr>
      <td>
        <img src="${p.imagem}" alt="" class="table-img" onerror="this.src='/uploads/sem-foto.svg'">
      </td>
      <td class="table-nome" title="${p.nome}">${p.nome}${p.hero_tag ? ` <span class="badge-hero">${heroLabels[p.hero_tag] || p.hero_tag}</span>` : ''}</td>
      <td>${p.categoria_nome || '-'}</td>
      <td class="table-preco">R$ ${formatarPreco(p.preco)}</td>
      <td>${p.destaque ? '<span class="badge-destaque">⭐ Destaque</span>' : '-'}</td>
      <td>
        <div class="table-actions">
          <button class="btn-sm btn-edit" onclick="editarProduto(${p.id})">✏️ Editar</button>
          <button class="btn-sm btn-delete" onclick="excluirProduto(${p.id})">🗑️ Excluir</button>
        </div>
      </td>
    </tr>
  `).join('');

  renderAdminPaginacao();
}

function renderAdminPaginacao() {
  if (adminTotalPages <= 1) {
    $('#adminPagination').innerHTML = '';
    return;
  }

  let html = '';
  html += `<button data-page="${adminPage - 1}" ${adminPage === 1 ? 'disabled' : ''}>‹</button>`;

  const maxBotoes = 5;
  let inicio = Math.max(1, adminPage - 2);
  let fim = Math.min(adminTotalPages, inicio + maxBotoes - 1);
  inicio = Math.max(1, fim - maxBotoes + 1);

  for (let i = inicio; i <= fim; i++) {
    html += `<button data-page="${i}" class="${i === adminPage ? 'active' : ''}">${i}</button>`;
  }

  html += `<button data-page="${adminPage + 1}" ${adminPage === adminTotalPages ? 'disabled' : ''}>›</button>`;
  $('#adminPagination').innerHTML = html;
}

// ==================== CRUD ====================
async function editarProduto(id) {
  try {
    const res = await fetch(`/api/produtos/${id}`);
    const p = await res.json();

    editandoId = p.id;
    $('#formTitle').textContent = 'Editar Produto';
    $('#produtoId').value = p.id;
    $('#produtoNome').value = p.nome;
    $('#produtoDescricao').value = p.descricao || '';
    $('#produtoPreco').value = p.preco;
    $('#produtoPrecoOriginal').value = p.preco_original || '';
    $('#produtoEstoque').value = p.estoque;
    $('#produtoCategoria').value = p.categoria_id || '';
    $('#produtoDestaque').checked = p.destaque === 1;
    $('#produtoHeroTag').value = p.hero_tag || '';
    $('#imagemAtual').value = p.imagem;
    $('#fotosExistentes').value = p.fotos || '[]';
    $('#videoExistente').value = p.video || '';

    if (p.imagem && p.imagem !== '/uploads/sem-foto.svg') {
      $('#previewImagem').src = p.imagem;
      $('#previewImagem').style.display = 'block';
    } else {
      $('#previewImagem').style.display = 'none';
    }

    // Preview fotos existentes
    const fotosArr = JSON.parse(p.fotos || '[]');
    const previewFotos = $('#previewFotos');
    previewFotos.innerHTML = fotosArr.map(f => `<img src="${f}" class="preview-thumb">`).join('');

    // Preview video existente
    if (p.video) {
      $('#previewVideo').src = p.video;
      $('#previewVideo').style.display = 'block';
    } else {
      $('#previewVideo').style.display = 'none';
    }

    $('#submitBtn').textContent = '💾 Atualizar Produto';
    navegarPara('novo');
  } catch (err) {
    console.error('Erro ao carregar produto:', err);
  }
}

async function salvarProduto(e) {
  e.preventDefault();

  const formData = new FormData();
  formData.append('nome', $('#produtoNome').value);
  formData.append('descricao', $('#produtoDescricao').value);
  formData.append('preco', $('#produtoPreco').value);
  formData.append('preco_original', $('#produtoPrecoOriginal').value || '');
  formData.append('categoria_id', $('#produtoCategoria').value);
  formData.append('estoque', $('#produtoEstoque').value || '1');
  formData.append('destaque', $('#produtoDestaque').checked ? '1' : '0');
  formData.append('hero_tag', $('#produtoHeroTag').value || '');

  // Imagem principal
  const fileInput = $('#produtoImagem');
  if (fileInput.files[0]) {
    formData.append('imagem', fileInput.files[0]);
  }
  if ($('#imagemAtual').value && !fileInput.files[0]) {
    formData.append('imagem', $('#imagemAtual').value);
  }

  // Fotos adicionais
  const fotosInput = $('#produtoFotos');
  if (fotosInput.files.length > 0) {
    for (const f of fotosInput.files) {
      formData.append('fotos', f);
    }
  }
  if (fotosInput.files.length === 0 && $('#fotosExistentes').value) {
    formData.append('fotos', $('#fotosExistentes').value);
  }

  // Video
  const videoInput = $('#produtoVideo');
  if (videoInput.files[0]) {
    formData.append('video', videoInput.files[0]);
  }
  if (!videoInput.files[0] && $('#videoExistente').value) {
    formData.append('video', $('#videoExistente').value);
  }

  try {
    const url = editandoId
      ? `/api/admin/produtos/${editandoId}`
      : '/api/admin/produtos';
    const method = editandoId ? 'PUT' : 'POST';

    const fetchHeaders = { 'Authorization': `Bearer ${token}` };

    const res = await fetch(url, {
      method,
      headers: fetchHeaders,
      body: formData
    });

    if (!res.ok) {
      const data = await res.json();
      mostrarToast(data.erro || 'Erro ao salvar', true);
      return;
    }

    mostrarToast(editandoId ? 'Produto atualizado!' : 'Produto criado!');
    resetarFormulario();
    navegarPara('produtos');
    carregarProdutosAdmin();
  } catch (err) {
    console.error('Erro ao salvar:', err);
    mostrarToast('Erro de conexão', true);
  }
}

async function excluirProduto(id) {
  if (!confirm('Tem certeza que deseja excluir este produto?')) return;

  try {
    const res = await fetch(`/api/admin/produtos/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      mostrarToast('Erro ao excluir', true);
      return;
    }

    mostrarToast('Produto excluído!');
    carregarProdutosAdmin();
  } catch (err) {
    console.error('Erro ao excluir:', err);
    mostrarToast('Erro de conexão', true);
  }
}

function resetarFormulario() {
  editandoId = null;
  $('#formTitle').textContent = 'Novo Produto';
  $('#produtoForm').reset();
  $('#produtoId').value = '';
  $('#imagemAtual').value = '';
  $('#fotosExistentes').value = '[]';
  $('#videoExistente').value = '';
  $('#previewImagem').style.display = 'none';
  $('#previewFotos').innerHTML = '';
  $('#previewVideo').style.display = 'none';
  $('#submitBtn').textContent = '💾 Salvar Produto';
}

// ==================== UTILITÁRIOS ====================
function formatarPreco(valor) {
  return parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function mostrarToast(mensagem, isError = false) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = mensagem;
  toast.style.background = isError ? 'var(--vermelho)' : 'var(--verde)';
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('show'), 2500);
}
