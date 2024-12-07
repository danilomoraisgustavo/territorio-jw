// app.js

const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');

const app = express();

// Configurar conexão com o SQLite3
const db = new sqlite3.Database('./territorio.db', (err) => {
    if (err) {
        console.error('Erro ao conectar com o banco de dados SQLite:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
    }
});

// Promisify para usar async/await
const dbGet = require('util').promisify(db.get).bind(db);
const dbAll = require('util').promisify(db.all).bind(db);

// Função personalizada para dbRun
function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({
                    lastID: this.lastID,
                    changes: this.changes
                });
            }
        });
    });
}

// Criar a tabela 'users' se não existir
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    endereco TEXT,
    celular TEXT,
    password TEXT NOT NULL,
    designacao TEXT,
    init BOOLEAN NOT NULL
)`);

// Criar a tabela 'territorios'
db.run(`CREATE TABLE IF NOT EXISTS territorios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identificador TEXT NOT NULL UNIQUE,
    territory TEXT NOT NULL,
    status BOOLEAN DEFAULT FALSE,
    data_conclusao DATE
)`);

// Criar a tabela 'lotes'
db.run(`CREATE TABLE IF NOT EXISTS lotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    territorio_id INTEGER NOT NULL,
    coordenadas TEXT NOT NULL,
    status BOOLEAN DEFAULT FALSE,
    data_conclusao DATE,
    FOREIGN KEY (territorio_id) REFERENCES territorios(id)
)`);

// Configuração do middleware de sessão
app.use(session({
    secret: 'seuSegredoAqui', // Substitua por uma chave secreta forte
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Deve ser false se você não estiver usando HTTPS
}));

// Middlewares para analisar o corpo da requisição
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Para receber JSON no body da requisição

// Middleware para verificar se o usuário está logado
function isAuthenticated(req, res, next) {
    if (req.session.isLoggedIn) {
        next();
    } else {
        res.status(401).json({ message: 'Usuário não autenticado' });
    }
}

// Middleware para verificar a designação do usuário
function authorizeRoles(allowedRoles) {
    return async (req, res, next) => {
        if (!req.session.isLoggedIn) {

            return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        try {
            const userId = req.session.userId;
            const user = await dbGet('SELECT designacao FROM users WHERE id = ?', [userId]);

            if (user && allowedRoles.includes(user.designacao)) {
                next();
            } else {
                res.status(403).json({ message: 'Acesso negado' });
            }
        } catch (error) {
            console.error('Erro no middleware de autorização:', error);
            res.status(500).json({ message: 'Erro no servidor' });
        }
    };
}

// Rotas de autenticação e páginas principais

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/index.html'));
});

// Rota para o dashboard
app.get('/dashboard', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views/dashboard.html'));
});

// Rota de login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Verifica se o usuário existe via email
        const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);

        if (!user) {
            return res.status(400).json({ message: 'Email não encontrado' });
        }

        // Verifica se o usuário está autorizado a acessar o sistema (init == true)
        if (!user.init) {
            return res.status(403).json({ message: 'Usuário ainda não autorizado pelo administrador' });
        }

        // Compara a senha
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Senha incorreta' });
        }

        // Armazena a sessão e redireciona para o dashboard
        req.session.isLoggedIn = true;
        req.session.userId = user.id;

        res.json({ message: 'Login bem-sucedido', redirect: '/dashboard' });

    } catch (error) {
        console.error('Erro no processo de login:', error);
        return res.status(500).json({ message: 'Erro no servidor' });
    }
});

// Rota para logout
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Erro ao destruir a sessão:', err);
            return res.status(500).json({ message: 'Erro ao fazer logout' });
        }
        res.clearCookie('connect.sid');  // Limpar o cookie da sessão
        res.json({ message: 'Logout bem-sucedido' });
    });
});

// Rota para obter informações do usuário
app.get('/user-info', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await dbGet('SELECT username, designacao FROM users WHERE id = ?', [userId]);

        if (user) {
            res.json({ username: user.username, designacao: user.designacao });
        } else {
            res.status(404).json({ message: 'Usuário não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao buscar informações do usuário:', error);
        res.status(500).json({ message: 'Erro ao buscar informações do usuário' });
    }
});

// Rota para registrar o usuário
app.post('/register', async (req, res) => {
    const { username, email, endereco, celular, password } = req.body;

    try {
        const existingUser = await dbGet('SELECT * FROM users WHERE email = ?', [email]);

        if (existingUser) {

            return res.status(400).json({ message: 'E-mail já cadastrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await dbRun(
            'INSERT INTO users (username, email, endereco, celular, password, designacao, init) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, email, endereco, celular, hashedPassword, 'Dirigente', false]
        );

        return res.status(200).json({ message: 'Usuário registrado com sucesso!' });
    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        return res.status(500).json({ message: 'Erro no servidor' });
    }
});

/* =========================== Rotas de API para Usuários =========================== */

// Obter a contagem de usuários
app.get('/api/users/count', authorizeRoles(['Administrador', 'Superintendente de Serviço', 'Superintendente de Território']), async (req, res) => {
    try {
        const result = await dbGet('SELECT COUNT(*) as count FROM users');
        res.json({ count: result.count });
    } catch (error) {
        console.error('Erro ao obter o total de usuários:', error);
        res.status(500).json({ message: 'Erro ao obter o total de usuários' });
    }
});

// Obter a lista de usuários
app.get('/api/users', authorizeRoles(['Administrador', 'Superintendente de Serviço', 'Superintendente de Território']), async (req, res) => {
    try {
        const users = await dbAll('SELECT id, username, email, endereco, celular, designacao, init FROM users');
        res.json(users);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ message: 'Erro ao buscar usuários' });
    }
});

// Obter detalhes de um usuário específico
app.get('/api/users/:id', authorizeRoles(['Administrador', 'Superintendente de Serviço', 'Superintendente de Território']), async (req, res) => {
    const userId = req.params.id;
    try {
        const user = await dbGet('SELECT id, username, email, endereco, celular, designacao FROM users WHERE id = ?', [userId]);
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'Usuário não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({ message: 'Erro ao buscar usuário' });
    }
});

// Adicionar um novo usuário
app.post('/api/users', authorizeRoles(['Administrador', 'Superintendente de Serviço', 'Superintendente de Território']), async (req, res) => {
    const { username, email, endereco, celular, password, designacao } = req.body;

    try {
        const existingUser = await dbGet('SELECT * FROM users WHERE email = ?', [email]);

        if (existingUser) {
            return res.status(400).json({ message: 'E-mail já cadastrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await dbRun(
            'INSERT INTO users (username, email, endereco, celular, password, designacao, init) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, email, endereco, celular, hashedPassword, designacao, true] // Usuários adicionados diretamente como ativos
        );

        res.status(201).json({ message: 'Usuário adicionado com sucesso!' });
    } catch (error) {
        console.error('Erro ao adicionar usuário:', error);
        res.status(500).json({ message: 'Erro ao adicionar usuário' });
    }
});

// Atualizar detalhes de um usuário
app.put('/api/users/:id', authorizeRoles(['Administrador', 'Superintendente de Serviço', 'Superintendente de Território']), async (req, res) => {
    const userId = req.params.id;
    const { username, email, endereco, celular, designacao } = req.body;

    try {
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        // Verificar se o email está sendo alterado para um já existente
        if (email !== user.email) {
            const emailExists = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
            if (emailExists) {
                return res.status(400).json({ message: 'Email já está em uso por outro usuário' });
            }
        }

        await dbRun(
            'UPDATE users SET username = ?, email = ?, endereco = ?, celular = ?, designacao = ? WHERE id = ?',
            [username, email, endereco, celular, designacao, userId]
        );

        res.json({ message: 'Usuário atualizado com sucesso!' });
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ message: 'Erro ao atualizar usuário' });
    }
});

// Excluir um usuário
app.delete('/api/users/:id', authorizeRoles(['Administrador', 'Superintendente de Serviço', 'Superintendente de Território']), async (req, res) => {
    const userId = req.params.id;

    try {
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        await dbRun('DELETE FROM users WHERE id = ?', [userId]);


        res.json({ message: 'Usuário excluído com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({ message: 'Erro ao excluir usuário' });
    }
});

// Aceitar acesso do usuário (init = true)
app.post('/api/users/:id/accept', authorizeRoles(['Administrador', 'Superintendente de Serviço', 'Superintendente de Território']), async (req, res) => {
    const userId = req.params.id;

    try {
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        await dbRun('UPDATE users SET init = ? WHERE id = ?', [true, userId]);


        res.json({ message: 'Acesso do usuário aceito com sucesso!' });
    } catch (error) {
        console.error('Erro ao aceitar acesso do usuário:', error);
        res.status(500).json({ message: 'Erro ao aceitar acesso do usuário' });
    }
});

// Restringir acesso do usuário (init = false)
app.post('/api/users/:id/restrict', authorizeRoles(['Administrador', 'Superintendente de Serviço', 'Superintendente de Território']), async (req, res) => {
    const userId = req.params.id;

    try {
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        await dbRun('UPDATE users SET init = ? WHERE id = ?', [false, userId]);

        res.json({ message: 'Acesso do usuário restringido com sucesso!' });
    } catch (error) {
        console.error('Erro ao restringir acesso do usuário:', error);
        res.status(500).json({ message: 'Erro ao restringir acesso do usuário' });
    }
});

/* =========================== Rotas de API para Territórios e Lotes =========================== */

// Middleware para verificar se o usuário tem permissão para gerenciar territórios
function authorizeTerritorioAccess(req, res, next) {
    // Permitir acesso a 'Administrador' e 'Superintendente de Território'
    authorizeRoles(['Administrador', 'Superintendente de Território'])(req, res, next);
}

// Rota para adicionar um novo território
app.post('/api/territorios', authorizeTerritorioAccess, async (req, res) => {
    const { identificador, territory, lots } = req.body;

    if (!identificador || !territory) {
        return res.status(400).json({ message: 'Identificador e território são obrigatórios' });
    }

    try {
        // Verificar se o identificador já existe
        const existingTerritorio = await dbGet('SELECT * FROM territorios WHERE identificador = ?', [identificador]);

        if (existingTerritorio) {
            return res.status(400).json({ message: 'Identificador já cadastrado' });
        }

        // Armazenar os dados do território como JSON string
        const territoryString = JSON.stringify(territory);

        // Inserir o território e obter o lastID
        const result = await dbRun(
            'INSERT INTO territorios (identificador, territory, status) VALUES (?, ?, ?)',
            [identificador, territoryString, false]
        );

        const territorioId = result.lastID; // Obter o ID do território inserido

        // Inserir os lotes usando dbRun
        for (let lot of lots) {
            const lotString = JSON.stringify(lot);
            await dbRun('INSERT INTO lotes (territorio_id, coordenadas, status) VALUES (?, ?, ?)', [territorioId, lotString, false]);
        }

        res.status(201).json({ message: 'Território e lotes cadastrados com sucesso!' });
    } catch (error) {
        console.error('Erro ao cadastrar território e lotes:', error);
        res.status(500).json({ message: 'Erro ao cadastrar território e lotes' });
    }
});

// Rota para obter todos os territórios
app.get('/api/territorios', authorizeTerritorioAccess, async (req, res) => {
    try {
        const territorios = await dbAll('SELECT id, identificador, status FROM territorios');
        res.json(territorios);
    } catch (error) {
        console.error('Erro ao buscar territórios:', error);
        res.status(500).json({ message: 'Erro ao buscar territórios' });
    }
});

// Rota para obter detalhes de um território específico
app.get('/api/territorios/:id', authorizeTerritorioAccess, async (req, res) => {
    const territorioId = req.params.id;
    try {
        const territorio = await dbGet('SELECT * FROM territorios WHERE id = ?', [territorioId]);
        if (territorio) {
            // Converter as formas de volta para objeto JSON
            territorio.territory = JSON.parse(territorio.territory);

            // Obter os lotes associados
            const lotes = await dbAll('SELECT * FROM lotes WHERE territorio_id = ?', [territorioId]);

            // Converter as coordenadas dos lotes de volta para objeto JSON
            lotes.forEach(lote => {
                lote.coordenadas = JSON.parse(lote.coordenadas);
            });

            res.json({ territorio, lotes });
        } else {
            res.status(404).json({ message: 'Território não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao buscar território:', error);
        res.status(500).json({ message: 'Erro ao buscar território' });
    }
});

// Rota para excluir um território e seus lotes
app.delete('/api/territorios/:id', authorizeTerritorioAccess, async (req, res) => {
    const territorioId = req.params.id;

    try {
        const territorio = await dbGet('SELECT * FROM territorios WHERE id = ?', [territorioId]);

        if (!territorio) {
            return res.status(404).json({ message: 'Território não encontrado' });
        }

        // Excluir lotes associados
        await dbRun('DELETE FROM lotes WHERE territorio_id = ?', [territorioId]);

        // Excluir território
        await dbRun('DELETE FROM territorios WHERE id = ?', [territorioId]);

        res.json({ message: 'Território e lotes excluídos com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir território:', error);
        res.status(500).json({ message: 'Erro ao excluir território' });
    }
});

// Rota para atualizar o status de um lote
app.put('/api/lotes/:id/status', isAuthenticated, async (req, res) => {
    const loteId = req.params.id;
    const { status } = req.body;

    try {
        // Atualizar o status e a data de conclusão do lote
        const dataConclusao = status ? new Date().toISOString().split('T')[0] : null;
        await dbRun(
            'UPDATE lotes SET status = ?, data_conclusao = ? WHERE id = ?',
            [status, dataConclusao, loteId]
        );

        // Verificar se todos os lotes do território estão concluídos
        const lote = await dbGet('SELECT territorio_id FROM lotes WHERE id = ?', [loteId]);
        const lotes = await dbAll('SELECT status FROM lotes WHERE territorio_id = ?', [lote.territorio_id]);

        const allDone = lotes.every(l => l.status);
        if (allDone) {
            const territorioConclusao = new Date().toISOString().split('T')[0];
            await dbRun(
                'UPDATE territorios SET status = ?, data_conclusao = ? WHERE id = ?',
                [true, territorioConclusao, lote.territorio_id]
            );
        } else {
            await dbRun(
                'UPDATE territorios SET status = ?, data_conclusao = NULL WHERE id = ?',
                [false, lote.territorio_id]
            );
        }

        res.json({ message: 'Status do lote atualizado com sucesso.' });
    } catch (error) {
        console.error('Erro ao atualizar status do lote:', error);
        res.status(500).json({ message: 'Erro ao atualizar status do lote.' });
    }
});

// Rota para atualizar um território existente
app.put('/api/territorios/:id', authorizeTerritorioAccess, async (req, res) => {
    const territorioId = req.params.id;
    const { territory, lots } = req.body;

    try {
        // Atualizar o território
        const territoryString = JSON.stringify(territory);
        await dbRun('UPDATE territorios SET territory = ? WHERE id = ?', [territoryString, territorioId]);

        // Atualizar cada lote
        for (let lot of lots) {
            const lotString = JSON.stringify(lot.coordenadas);
            await dbRun('UPDATE lotes SET coordenadas = ? WHERE id = ?', [lotString, lot.id]);
        }

        res.json({ message: 'Território e lotes atualizados com sucesso.' });
    } catch (error) {
        console.error('Erro ao atualizar território e lotes:', error);
        res.status(500).json({ message: 'Erro ao atualizar território e lotes.' });
    }
});

// Middleware para servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Fallback para rotas não encontradas
app.use((req, res) => {
    res.status(404).json({ message: 'Rota não encontrada' });
});

// Configuração do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});
