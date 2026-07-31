const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'loja-virtual-secret-key-2026';
const WHATSAPP_NUMERO = '5521996892217';

// ==================== BANCO DE DADOS POSTGRESQL ====================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/loja_virtual',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// ==================== CRIAÇÃO DE TABELAS ====================
async function criarTabelas() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin (
        id SERIAL PRIMARY KEY,
        usuario TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS categorias (
        id SERIAL PRIMARY KEY,
        nome TEXT UNIQUE NOT NULL,
        slug TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS produtos (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        descricao TEXT DEFAULT '',
        preco REAL NOT NULL,
        preco_original REAL,
        imagem TEXT DEFAULT '/uploads/sem-foto.svg',
        categoria_id INTEGER REFERENCES categorias(id),
        estoque INTEGER DEFAULT 1,
        destaque INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Admin padrão
    const adminExiste = await client.query('SELECT id FROM admin LIMIT 1');
    if (adminExiste.rows.length === 0) {
      const senhaHash = bcrypt.hashSync('admin123', 10);
      await client.query('INSERT INTO admin (usuario, senha) VALUES ($1, $2)', ['admin', senhaHash]);
      console.log('✅ Admin criado: admin / admin123');
    }

    // Categorias padrão
    const cats = ['Eletrônicos', 'Moda', 'Casa', 'Esportes', 'Livros', 'Brinquedos', 'Beleza', 'Alimentos'];
    for (const c of cats) {
      const slug = c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      await client.query(
        'INSERT INTO categorias (nome, slug) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING',
        [c, slug]
      );
    }
  } finally {
    client.release();
  }
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
app.post('/api/admin/login', async (req, res) => {
  try {
    const { usuario, senha } = req.body;
    const result = await pool.query('SELECT * FROM admin WHERE usuario = $1', [usuario]);
    const admin = result.rows[0];
    if (!admin || !bcrypt.compareSync(senha, admin.senha)) {
      return res.status(401).json({ erro: 'Usuário ou senha incorretos' });
    }
    const token = jwt.sign({ id: admin.id, usuario: admin.usuario }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, usuario: admin.usuario });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ==================== API DE CATEGORIAS ====================
app.get('/api/categorias', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categorias ORDER BY nome');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ==================== API DE PRODUTOS (PÚBLICA) ====================
app.get('/api/produtos', async (req, res) => {
  try {
    const { busca, categoria, page = 1, limit = 50 } = req.query;
    const params = [];
    const conditions = [];
    let paramIndex = 1;

    if (busca) {
      conditions.push(`(p.nome ILIKE $${paramIndex} OR p.descricao ILIKE $${paramIndex + 1})`);
      params.push(`%${busca}%`, `%${busca}%`);
      paramIndex += 2;
    }
    if (categoria) {
      conditions.push(`c.slug = $${paramIndex}`);
      params.push(categoria);
      paramIndex += 1;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Total
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM produtos p LEFT JOIN categorias c ON p.categoria_id = c.id ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Paginação
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await pool.query(
      `SELECT p.*, c.nome as categoria_nome, c.slug as categoria_slug
       FROM produtos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      produtos: result.rows,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

app.get('/api/produtos/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.nome as categoria_nome, c.slug as categoria_slug
       FROM produtos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ==================== API DE PRODUTOS (ADMIN) ====================
app.post('/api/admin/produtos', autenticarToken, upload.single('imagem'), async (req, res) => {
  try {
    const { nome, descricao, preco, preco_original, categoria_id, estoque, destaque } = req.body;
    const imagem = req.file ? '/uploads/' + req.file.filename : (req.body.imagem || '/uploads/sem-foto.svg');

    const result = await pool.query(
      `INSERT INTO produtos (nome, descricao, preco, preco_original, imagem, categoria_id, estoque, destaque)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [nome, descricao || '', parseFloat(preco), preco_original ? parseFloat(preco_original) : null,
       imagem, parseInt(categoria_id) || null, parseInt(estoque) || 1, destaque === '1' ? 1 : 0]
    );

    res.status(201).json({ id: result.rows[0].id, mensagem: 'Produto criado com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

app.put('/api/admin/produtos/:id', autenticarToken, upload.single('imagem'), async (req, res) => {
  try {
    const { nome, descricao, preco, preco_original, categoria_id, estoque, destaque } = req.body;

    const existente = await pool.query('SELECT * FROM produtos WHERE id = $1', [req.params.id]);
    if (existente.rows.length === 0) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }

    const imagem = req.file ? '/uploads/' + req.file.filename : req.body.imagem || existente.rows[0].imagem;

    await pool.query(
      `UPDATE produtos SET nome=$1, descricao=$2, preco=$3, preco_original=$4, imagem=$5,
       categoria_id=$6, estoque=$7, destaque=$8 WHERE id=$9`,
      [nome, descricao || '', parseFloat(preco), preco_original ? parseFloat(preco_original) : null,
       imagem, parseInt(categoria_id) || null, parseInt(estoque) || 1, destaque === '1' ? 1 : 0, req.params.id]
    );

    res.json({ mensagem: 'Produto atualizado com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

app.delete('/api/admin/produtos/:id', autenticarToken, async (req, res) => {
  try {
    const existente = await pool.query('SELECT * FROM produtos WHERE id = $1', [req.params.id]);
    if (existente.rows.length === 0) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }
    await pool.query('DELETE FROM produtos WHERE id = $1', [req.params.id]);
    res.json({ mensagem: 'Produto removido com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ==================== ARQUIVOS ESTÁTICOS ====================
app.use(express.static(path.join(__dirname, 'public'), { redirect: false }));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// ==================== ROTAS DO FRONTEND ====================
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

// Fallback SPA
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
async function iniciar() {
  await criarTabelas();

  // Seed automático se banco vazio
  const count = await pool.query('SELECT COUNT(*) as total FROM produtos');
  if (parseInt(count.rows[0].total) === 0) {
    console.log('📦 Populando banco com produtos de exemplo...');
    await require('./seed')(pool);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Loja rodando em http://localhost:${PORT}`);
    console.log(`🔧 Painel Admin em http://localhost:${PORT}/admin`);
    console.log(`📱 WhatsApp: ${WHATSAPP_NUMERO}`);
  });
}

iniciar().catch(err => {
  console.error('Erro ao iniciar servidor:', err);
  process.exit(1);
});
