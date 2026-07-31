// Seed de produtos - compatível com PostgreSQL
module.exports = async function seed(pool) {
  const produtos = [
    { nome: 'Smartphone Galaxy S25 Ultra 5G', descricao: 'Tela Dynamic AMOLED 6.9", 256GB, 12GB RAM, Câmera 200MP, Bateria 5000mAh. O smartphone mais avançado do mercado.', preco: 7499.90, preco_original: 8999.90, categoria_id: 1, destaque: 1 },
    { nome: 'Notebook Dell Inspiron 15', descricao: 'Intel Core i7 13ª Geração, 16GB RAM, SSD 512GB, Tela 15.6" Full HD, Windows 11 Pro. Ideal para trabalho e estudo.', preco: 3899.00, preco_original: 4999.00, categoria_id: 1, destaque: 1 },
    { nome: 'Apple iPhone 16 Pro Max', descricao: 'Tela Super Retina XDR 6.7", Chip A18 Pro, 256GB, Câmera tripla 48MP, Dynamic Island, Titanium.', preco: 8999.00, preco_original: 10999.00, categoria_id: 1, destaque: 1 },
    { nome: 'Smart TV LG OLED 65" 4K', descricao: 'OLED evo C4, Painel 4K, 120Hz, webOS 24, Dolby Vision/Atmos, ideal para cinema em casa e games.', preco: 5499.00, preco_original: 7499.00, categoria_id: 1, destaque: 1 },
    { nome: 'Camiseta Básica Algodão Premium', descricao: 'Camiseta 100% algodão egípcio, toque macio, disponível nas cores preto, branco, azul marinho e cinza.', preco: 79.90, preco_original: 129.90, categoria_id: 2, destaque: 0 },
    { nome: 'Tênis Nike Air Max 270', descricao: 'Tênis casual esportivo, amortecimento Air Max, cabedal em mesh, solado de borracha. Conforto o dia todo.', preco: 599.90, preco_original: 899.90, categoria_id: 2, destaque: 1 },
    { nome: 'Jaqueta Corta-Vento Impermeável', descricao: 'Jaqueta leve e resistente à água, capuz ajustável, bolsos com zíper. Ideal para dias de chuva e vento.', preco: 199.90, preco_original: 349.90, categoria_id: 2, destaque: 0 },
    { nome: 'Relógio Smartwatch Watch Ultra', descricao: 'Monitor cardíaco, GPS, resistência à água 100m, bateria 36h, tela AMOLED 1.9". Perfeito para esportes.', preco: 1299.00, preco_original: 1799.00, categoria_id: 2, destaque: 0 },
    { nome: 'Kit Panelas Antiaderentes 5 Peças', descricao: 'Panelas em alumínio com revestimento antiaderente cerâmico, cabos ergonômicos, compatível com fogão indução.', preco: 249.90, preco_original: 449.90, categoria_id: 3, destaque: 0 },
    { nome: 'Aspirador Robô Smart Wi-Fi', descricao: 'Mapeamento a laser, app controle, limpeza inteligente, autonomia 150min, ideal para casa moderna.', preco: 1499.00, preco_original: 2499.00, categoria_id: 3, destaque: 1 },
    { nome: 'Jogo de Cama Queen 300 Fios', descricao: 'Lençol, fronhas e sobrelençol em algodão percal 300 fios. Toque macio, dormir com qualidade.', preco: 189.90, preco_original: 299.90, categoria_id: 3, destaque: 0 },
    { nome: 'Luminária LED Inteligente Wi-Fi', descricao: 'Compatível com Alexa e Google Home, 16 milhões de cores, dimerizável, controle por aplicativo ou voz.', preco: 89.90, preco_original: 159.90, categoria_id: 3, destaque: 0 },
    { nome: 'Bicicleta Mountain Bike Aro 29', descricao: 'Quadro alumínio, suspensão dianteira 100mm, 21 marchas Shimano, freio a disco hidráulico.', preco: 2199.00, preco_original: 3299.00, categoria_id: 4, destaque: 1 },
    { nome: 'Par de Halteres Ajustáveis 20kg', descricao: 'Halteres com ajuste rápido de peso, emborrachados, antiderrapantes. Treino em casa.', preco: 299.90, preco_original: 499.90, categoria_id: 4, destaque: 0 },
    { nome: 'Tapete Yoga Antiderrapante Premium', descricao: 'Tapete 6mm de espessura, material TPE ecológico, antiderrapante dupla face, inclui alça.', preco: 119.90, preco_original: 189.90, categoria_id: 4, destaque: 0 },
    { nome: 'Barraca Camping 4 Pessoas', descricao: 'Barraca automática, impermeável, proteção UV50+, 2 entradas, peso 3.8kg. Fácil montagem.', preco: 349.90, preco_original: 599.90, categoria_id: 4, destaque: 0 },
    { nome: 'Box Harry Potter Edição Premium', descricao: 'Box com os 7 livros da série Harry Potter, capa dura, edição ilustrada, brinde: marcador de página.', preco: 299.90, preco_original: 449.90, categoria_id: 5, destaque: 1 },
    { nome: 'Kindle Paperwhite 11ª Geração', descricao: 'Tela 6.8" antirreflexo, 16GB, luz noturna ajustável, bateria para semanas, resistente à água.', preco: 549.90, preco_original: 749.90, categoria_id: 5, destaque: 0 },
    { nome: 'Livro: O Poder do Hábito', descricao: 'Charles Duhigg explica a ciência por trás dos hábitos e como podemos transformá-los.', preco: 39.90, preco_original: 69.90, categoria_id: 5, destaque: 0 },
    { nome: 'LEGO Star Wars Millennium Falcon', descricao: 'Kit LEGO 1351 peças, réplica da nave Millennium Falcon. Para fãs de Star Wars e colecionadores.', preco: 699.90, preco_original: 999.90, categoria_id: 6, destaque: 1 },
    { nome: 'Boneca Barbie Profissões - Médica', descricao: 'Barbie médica com acessórios: estetoscópio, prancheta, jaleco. Estimula imaginação.', preco: 129.90, preco_original: 199.90, categoria_id: 6, destaque: 0 },
    { nome: 'Jogo Uno Original Mattel', descricao: 'Clássico jogo de cartas Uno, edição especial 50 anos, para 2-10 jogadores, a partir de 7 anos.', preco: 39.90, preco_original: 69.90, categoria_id: 6, destaque: 0 },
    { nome: 'Kit Skincare Completo 5 Passos', descricao: 'Sabonete, tônico, sérum vitamina C, hidratante e protetor solar FPS 50. Pele radiante.', preco: 149.90, preco_original: 249.90, categoria_id: 7, destaque: 0 },
    { nome: 'Perfume Importado Masculino 100ml', descricao: 'Fragrância amadeirada e cítrica, fixação longa duração, Eau de Parfum 100ml importado.', preco: 349.90, preco_original: 529.90, categoria_id: 7, destaque: 1 },
    { nome: 'Secador de Cabelo Profissional 2200W', descricao: 'Motor potente AC, 3 temperaturas, 2 velocidades, ar frio, bico concentrador e difusor incluídos.', preco: 199.90, preco_original: 349.90, categoria_id: 7, destaque: 0 },
    { nome: 'Cafeteira Expresso Automática', descricao: 'Moagem integrada, pressão 15 bar, vaporizador de leite, reservatório 1.5L. Café perfeito em casa.', preco: 1599.00, preco_original: 2499.00, categoria_id: 3, destaque: 1 },
    { nome: 'Kit Churrasco Completo 8 Peças', descricao: 'Faca, garfo, tábua, avental, luva térmica, espetos, afiador e estojo. Tudo para o churrasqueiro.', preco: 179.90, preco_original: 299.90, categoria_id: 8, destaque: 0 },
    { nome: 'Cesta de Café da Manhã Premium', descricao: 'Pão de mel, geleia, biscoitos, bolo caseiro, suco integral, café gourmet e chocolate belga.', preco: 129.90, preco_original: 189.90, categoria_id: 8, destaque: 0 },
    { nome: 'Fone de Ouvido Bluetooth ANC', descricao: 'Cancelamento de ruído ativo, 40h bateria, drivers 13mm, graves potentes, pareamento rápido.', preco: 249.90, preco_original: 449.90, categoria_id: 1, destaque: 1 },
    { nome: 'Mochila Notebook Executiva 15.6"', descricao: 'Compartimento acolchoado para notebook, impermeável, USB carregamento, antifurto, design profissional.', preco: 159.90, preco_original: 279.90, categoria_id: 2, destaque: 0 }
  ];

  const client = await pool.connect();
  try {
    await client.query('DELETE FROM produtos');

    for (const p of produtos) {
      await client.query(
        `INSERT INTO produtos (nome, descricao, preco, preco_original, imagem, categoria_id, estoque, destaque)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [p.nome, p.descricao, p.preco, p.preco_original,
         '/uploads/sem-foto.svg', p.categoria_id, Math.floor(Math.random() * 50) + 5, p.destaque]
      );
    }

    console.log(`✅ ${produtos.length} produtos inseridos com sucesso!`);
  } finally {
    client.release();
  }
};
