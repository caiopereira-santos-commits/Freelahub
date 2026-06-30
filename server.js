import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import pg from 'pg';
import bcrypt from 'bcrypt';

const fastify = Fastify({ logger: true });
const { Pool } = pg;

// CONFIGURAÇÃO DO BANCO DE DADOS
const pool = new Pool({
  connectionString: 'postgres://postgres:senai@localhost:5432/Freelahub'
});

// Registro do plugin JWT para autenticação
fastify.register(jwt, {
  secret: 'é segredo >:v',
  sign: { expiresIn: '60m' } 
});

// Hook de Autenticação para proteger rotas privadas
fastify.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (error) {
    return reply.status(401).send({ error: 'Token inválido ou ausente.' });
  }
});

// Rota de Cadastro de Usuário
fastify.post('/api/auth/register', async (request, reply) => {
  const { nome, email, perfil, senha } = request.body;

  // Validação do tipo de perfil
  if (perfil !== 'CONTRATANTE' && perfil !== 'FREELANCER') {
    return reply.status(400).send({ error: "Perfil deve ser 'CONTRATANTE' ou 'FREELANCER'." });
  }

  try {
    // Validação se e-mail já existe
    const userExist = await pool.query('SELECT id FROM Usuario WHERE email = $1', [email]);
    if (userExist.rows.length > 0) {
      return reply.status(400).send({ error: 'Este e-mail já está cadastrado.' });
    }

    // Criptografia da senha
    const senha_hash = await bcrypt.hash(senha, 12);

    // Salva no banco de dados
    await pool.query(
      'INSERT INTO Usuario (nome, email, senha_hash, perfil) VALUES ($1, $2, $3, $4)',
      [nome, email, senha_hash, perfil]
    );

    
    return reply.status(201).send({ message: 'Usuário cadastrado com sucesso!' });
  } catch (error) {
    return reply.status(500).send({ error: error.message });
  }
});

// Rota de Login
fastify.post('/api/auth/login', async (request, reply) => {
  const { email, senha } = request.body;

  try {
    const result = await pool.query('SELECT * FROM Usuario WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return reply.status(401).send({ error: 'Credenciais inválidas.' });
    }

    const usuario = result.rows[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      return reply.status(401).send({ error: 'Credenciais inválidas.' });
    }

    // Gera o token contendo as informações do usuário
    const token = fastify.jwt.sign({ id: usuario.id, perfil: usuario.perfil });
    return { token };
  } catch (error) {
    return reply.status(500).send({ error: error.message });
  }
});

// Publicar um Projeto (Isso é apenas para Contratantes)
fastify.post('/api/projects', { onRequest: [fastify.authenticate] }, async (request, reply) => {
  const { titulo, descricao, orcamento_max } = request.body;
  const { id: contratante_id, perfil } = request.user;

  if (perfil !== 'CONTRATANTE') {
    return reply.status(403).send({ error: 'Apenas contratantes podem publicar projetos.' });
  }

  try {
    const result = await pool.query(
      "INSERT INTO Projeto (titulo, descricao, orcamento_max, status, contratante_id) VALUES ($1, $2, $3, 'ABERTO', $4) RETURNING *",
      [titulo, descricao, orcamento_max, contratante_id]
    );

    return reply.status(201).send(result.rows[0]);
  } catch (error) {
    return reply.status(500).send({ error: error.message });
  }
});

// Buscar e Filtrar Projetos Abertos
fastify.get('/api/projects', { onRequest: [fastify.authenticate] }, async (request, reply) => {
  const { search } = request.query; 

  try {
    let queryText = "SELECT * FROM Projeto WHERE status = 'ABERTO'";
    let queryParams = [];

    if (search) {
      queryText += " AND (titulo ILIKE $1 OR descricao ILIKE $1)";
      queryParams.push(`%${search}%`);
    }

    const result = await pool.query(queryText, queryParams);
    return result.rows;
  } catch (error) {
    return reply.status(500).send({ error: error.message });
  }
});

// Inicialização do Servidor Fastify
const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log('FreelaHub Backend rodando em http://localhost:3000');
  } catch (error) {
   
    fastify.log.error(error);
    process.exit(1);
  }
};
start();