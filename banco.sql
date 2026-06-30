CREATE TABLE Usuario (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    perfil VARCHAR(30) NOT NULL CHECK (perfil IN ('CONTRATANTE', 'FREELANCER'))
);


CREATE TABLE Projeto (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(120) NOT NULL,
    descricao TEXT NOT NULL,
    orcamento_max NUMERIC(10,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ABERTO',
    contratante_id INT NOT NULL,
    FOREIGN KEY (contratante_id) REFERENCES Usuario(id)
);