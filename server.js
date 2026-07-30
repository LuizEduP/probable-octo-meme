const express = require('express');
const Database = require('better-sqlite3');
const multer = require('multer');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'loja-virtual-secret-key-2026';
const WHATSAPP_NUMERO = '5521996892217';

// Middleware
app.use(cors());
app.use(express.json());

// ==================== BANCO DE DADOS ====================
const db = new Database('loja.db');

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT DEFAULT '',
    preco REAL NOT NULL,
    preco_original REAL,
    imagem TEXT DEFAULT '/uploads/sem-foto.svg',
    categoria_id INTEGER,
    estoque INTEGER DEFAULT 1,
    destaque INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
  );
`);

// Criar admin padrão se não existir
const adminExiste = db.prepare('SELECT id FROM admin LIMIT 1').get();
if (!adminExiste) {
  const senhaHash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO admin (usuario, senha) VALUES (?, ?)').run('admin', senhaHash);
  console.log('✅ Admin criado: admin / admin123');
}

// Criar categorias padrão
const cats = ['Eletrônicos', 'Moda', 'Casa', 'Esportes', 'Livros', 'Brinquedos', 'Beleza', 'Alimentos'];
const insertCat = db.prepare('INSERT OR IGNORE INTO categorias (nome, slug) VALUES (?, ?)');
for (const c of cats) {
  insertCat.run(c, c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
}

// ==================== UPLOAD DE IMAGENS ====================
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'public', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'produto-' + Date.now() + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ==================== MIDDLEWARE DE AUTENTICAÇÃO ====================
function autenticarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ erro: 'Token não fornecido' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ erro: 'Token inválido' });
  }
}

// ==================== API DE AUTENTICAÇÃO ====================
app.post('/api/admin/login', (req, res) => {
  const { usuario, senha } = req.body;
  const admin = db.prepare('SELECT * FROM admin WHERE usuario = ?').get(usuario);
  if (!admin || !bcrypt.compareSync(senha, admin.senha)) {
    return res.status(401).json({ erro: 'Usuário ou senha incorretos' });
  }
  const token = jwt.sign({ id: admin.id, usuario: admin.usuario }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, usuario: admin.usuario });
});

// ==================== API DE CATEGORIAS ====================
app.get('/api/categorias', (req, res) => {
  const categorias = db.prepare('SELECT * FROM categorias ORDER BY nome').all();
  res.json(categorias);
});

// ==================== API DE PRODUTOS (PÚBLICA) ====================
app.get('/api/produtos', (req, res) => {
  const { busca, categoria, destaque, page = 1, limit = 50 } = req.query;
  let query = `
    SELECT p.*, c.nome as categoria_nome, c.slug as categoria_slug
    FROM produtos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (busca) {
    query += ' AND (p.nome LIKE ? OR p.descricao LIKE ?)';
    params.push(`%${busca}%`, `%${busca}%`);
  }
  if (categoria) {
    query += ' AND c.slug = ?';
    params.push(categoria);
  }
  if (destaque === '1') {
    query += ' AND p.destaque = 1';
  }

  // Total de registros
  const countQuery = query.replace(/SELECT p\.\*, c\.nome.*?FROM/, 'SELECT COUNT(*) as total FROM');
  const { total } = db.prepare(countQuery).get(...params);

  // Paginação
  const offset = (parseInt(page) - 1) * parseInt(limit);
  query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  const produtos = db.prepare(query).all(...params);
  res.json({ produtos, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

app.get('/api/produtos/:id', (req, res) => {
  const produto = db.prepare(`
    SELECT p.*, c.nome as categoria_nome, c.slug as categoria_slug
    FROM produtos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' });
  res.json(produto);
});

// ==================== API DE PRODUTOS (ADMIN) ====================
app.post('/api/admin/produtos', autenticarToken, upload.single('imagem'), (req, res) => {
  const { nome, descricao, preco, preco_original, categoria_id, estoque, destaque } = req.body;
  const imagem = req.file ? '/uploads/' + req.file.filename : (req.body.imagem || '/uploads/sem-foto.svg');

  const result = db.prepare(`
    INSERT INTO produtos (nome, descricao, preco, preco_original, imagem, categoria_id, estoque, destaque)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(nome, descricao || '', parseFloat(preco), preco_original ? parseFloat(preco_original) : null,
    imagem, parseInt(categoria_id) || null, parseInt(estoque) || 1, destaque === '1' ? 1 : 0);

  res.status(201).json({ id: result.lastInsertRowid, mensagem: 'Produto criado com sucesso' });
});

app.put('/api/admin/produtos/:id', autenticarToken, upload.single('imagem'), (req, res) => {
  const { nome, descricao, preco, preco_original, categoria_id, estoque, destaque } = req.body;
  const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' });

  const imagem = req.file ? '/uploads/' + req.file.filename : req.body.imagem || produto.imagem;

  db.prepare(`
    UPDATE produtos SET nome=?, descricao=?, preco=?, preco_original=?, imagem=?, categoria_id=?, estoque=?, destaque=?
    WHERE id=?
  `).run(nome, descricao || '', parseFloat(preco), preco_original ? parseFloat(preco_original) : null,
    imagem, parseInt(categoria_id) || null, parseInt(estoque) || 1, destaque === '1' ? 1 : 0, req.params.id);

  res.json({ mensagem: 'Produto atualizado com sucesso' });
});

app.delete('/api/admin/produtos/:id', autenticarToken, (req, res) => {
  const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' });
  db.prepare('DELETE FROM produtos WHERE id = ?').run(req.params.id);
  res.json({ mensagem: 'Produto removido com sucesso' });
});

// ==================== ROTAS DO FRONTEND ====================
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

// ==================== ARQUIVOS ESTÁTICOS ====================
app.use(express.static(path.join(__dirname, 'public'), { redirect: false }));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Fallback para index.html (SPA)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    return res.status(404).json({ erro: 'Rota não encontrada' });
  }
  if (req.method === 'GET' && !req.path.startsWith('/admin')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// ==================== INICIAR SERVIDOR ====================
app.listen(PORT, () => {
  console.log(`🚀 Loja rodando em http://localhost:${PORT}`);
  console.log(`🔧 Painel Admin em http://localhost:${PORT}/admin`);
  console.log(`📱 WhatsApp: ${WHATSAPP_NUMERO}`);
});
