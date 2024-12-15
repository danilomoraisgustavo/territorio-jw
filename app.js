// app.js

const express = require('express');
const path = require('path');
const puppeteer = require('puppeteer');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const fs = require('fs');
const cors = require('cors');

const app = express();

app.use(cors({ 
    origin: '*', 
}));

// Configurar conexão com o SQLite3
const db = new sqlite3.Database('./territorio.db', (err) => {
    if (err) {
        console.error('Erro ao conectar com o banco de dados SQLite:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
    }
});

const dbGet = require('util').promisify(db.get).bind(db);
const dbAll = require('util').promisify(db.all).bind(db);

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

// Verifica se a coluna bairro existe
(async () => {
    const resAll = await dbAll("PRAGMA table_info(territorios)");
    const hasBairro = resAll.some(col => col.name === 'bairro');
    if (!hasBairro) {
        await dbRun("ALTER TABLE territorios ADD COLUMN bairro TEXT");
    }
})();

// Criar tabelas
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

db.run(`CREATE TABLE IF NOT EXISTS territorios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identificador TEXT NOT NULL UNIQUE,
    territory TEXT NOT NULL,
    bairro TEXT,
    status BOOLEAN DEFAULT FALSE,
    data_conclusao DATE
)`);

db.run(`CREATE TABLE IF NOT EXISTS lotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    territorio_id INTEGER NOT NULL,
    coordenadas TEXT NOT NULL,
    status BOOLEAN DEFAULT FALSE,
    data_conclusao DATE,
    FOREIGN KEY (territorio_id) REFERENCES territorios(id)
)`);

// Sessão
app.use(session({
    secret: 'seuSegredoAqui',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function isAuthenticated(req, res, next) {
    if (req.session.isLoggedIn) {
        next();
    } else {
        res.status(401).json({ message: 'Usuário não autenticado' });
    }
}

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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/index.html'));
});

app.get('/dashboard', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views/dashboard.html'));
});

// Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);

        if (!user) {
            return res.status(400).json({ message: 'Email não encontrado' });
        }

        if (!user.init) {
            return res.status(403).json({ message: 'Usuário ainda não autorizado pelo administrador' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Senha incorreta' });
        }

        req.session.isLoggedIn = true;
        req.session.userId = user.id;

        res.json({ message: 'Login bem-sucedido', redirect: '/dashboard' });
    } catch (error) {
        console.error('Erro no processo de login:', error);
        return res.status(500).json({ message: 'Erro no servidor' });
    }
});

// Logout
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Erro ao destruir a sessão:', err);
            return res.status(500).json({ message: 'Erro ao fazer logout' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Logout bem-sucedido' });
    });
});

// user-info
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

// register
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

// Rotas de API para Usuários
app.get('/api/users/count', authorizeRoles(['Administrador', 'Superintendente de Serviço', 'Superintendente de Território']), async (req, res) => {
    try {
        const result = await dbGet('SELECT COUNT(*) as count FROM users');
        res.json({ count: result.count });
    } catch (error) {
        console.error('Erro ao obter o total de usuários:', error);
        res.status(500).json({ message: 'Erro ao obter o total de usuários' });
    }
});

app.get('/api/users', authorizeRoles(['Administrador', 'Superintendente de Serviço', 'Superintendente de Território']), async (req, res) => {
    try {
        const users = await dbAll('SELECT id, username, email, endereco, celular, designacao, init FROM users');
        res.json(users);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ message: 'Erro ao buscar usuários' });
    }
});

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
            [username, email, endereco, celular, hashedPassword, designacao, true]
        );

        res.status(201).json({ message: 'Usuário adicionado com sucesso!' });
    } catch (error) {
        console.error('Erro ao adicionar usuário:', error);
        res.status(500).json({ message: 'Erro ao adicionar usuário' });
    }
});

app.put('/api/users/:id', authorizeRoles(['Administrador', 'Superintendente de Serviço', 'Superintendente de Território']), async (req, res) => {
    const userId = req.params.id;
    const { username, email, endereco, celular, designacao } = req.body;

    try {
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

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

function authorizeTerritorioAccess(req, res, next) {
    authorizeRoles(['Administrador', 'Superintendente de Território'])(req, res, next);
}

app.post('/api/territorios', authorizeTerritorioAccess, async (req, res) => {
    const { identificador, bairro, territory, lots } = req.body;

    if (!identificador || !territory || !bairro) {
        return res.status(400).json({ message: 'Identificador, bairro e território são obrigatórios' });
    }

    try {
        const existingTerritorio = await dbGet('SELECT * FROM territorios WHERE identificador = ?', [identificador]);

        if (existingTerritorio) {
            return res.status(400).json({ message: 'Identificador já cadastrado' });
        }

        const territoryString = JSON.stringify(territory);
        const result = await dbRun(
            'INSERT INTO territorios (identificador, territory, bairro, status) VALUES (?, ?, ?, ?)',
            [identificador, territoryString, bairro, false]
        );

        const territorioId = result.lastID;
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

app.get('/api/territorios', authorizeTerritorioAccess, async (req, res) => {
    try {
        const territorios = await dbAll('SELECT id, identificador, status FROM territorios');
        res.json(territorios);
    } catch (error) {
        console.error('Erro ao buscar territórios:', error);
        res.status(500).json({ message: 'Erro ao buscar territórios' });
    }
});

// Novo endpoint para fornecer dados completos dos territórios para o map2
app.get('/api/territorios-map2', authorizeTerritorioAccess, async (req, res) => {
    try {
        // Busca todos os territórios do banco, incluindo o campo territory
        const territorios = await dbAll('SELECT id, identificador, territory, status FROM territorios');

        const results = [];
        for (let territorio of territorios) {
            let parsedTerritory = [];
            if (territorio.territory) {
                try {
                    parsedTerritory = JSON.parse(territorio.territory);
                } catch (e) {
                    console.error('Erro ao parsear territory do território ID:', territorio.id, e);
                }
            }

            const lotes = await dbAll('SELECT id, coordenadas, status FROM lotes WHERE territorio_id = ?', [territorio.id]);
            for (let lote of lotes) {
                try {
                    lote.coordenadas = JSON.parse(lote.coordenadas);
                } catch (e) {
                    console.error('Erro ao parsear coordenadas do lote ID:', lote.id, e);
                    lote.coordenadas = [];
                }
            }

            results.push({
                id: territorio.id,
                identificador: territorio.identificador,
                status: territorio.status,
                territory: parsedTerritory,
                lotes: lotes
            });
        }

        res.json(results);
    } catch (error) {
        console.error('Erro ao buscar territórios (map2):', error);
        res.status(500).json({ message: 'Erro ao buscar territórios (map2)' });
    }
});


app.get('/api/territorios/:id', authorizeTerritorioAccess, async (req, res) => {
    const territorioId = req.params.id;
    try {
        const territorio = await dbGet('SELECT * FROM territorios WHERE id = ?', [territorioId]);
        if (territorio) {
            territorio.territory = JSON.parse(territorio.territory);
            const lotes = await dbAll('SELECT * FROM lotes WHERE territorio_id = ?', [territorioId]);
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

app.delete('/api/territorios/:id', authorizeTerritorioAccess, async (req, res) => {
    const territorioId = req.params.id;

    try {
        const territorio = await dbGet('SELECT * FROM territorios WHERE id = ?', [territorioId]);

        if (!territorio) {
            return res.status(404).json({ message: 'Território não encontrado' });
        }

        await dbRun('DELETE FROM lotes WHERE territorio_id = ?', [territorioId]);
        await dbRun('DELETE FROM territorios WHERE id = ?', [territorioId]);

        res.json({ message: 'Território e lotes excluídos com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir território:', error);
        res.status(500).json({ message: 'Erro ao excluir território' });
    }
});

app.put('/api/lotes/:id/status', isAuthenticated, async (req, res) => {
    const loteId = req.params.id;
    const { status } = req.body;

    try {
        const dataConclusao = status ? new Date().toISOString().split('T')[0] : null;
        await dbRun('UPDATE lotes SET status = ?, data_conclusao = ? WHERE id = ?', [status, dataConclusao, loteId]);

        const lote = await dbGet('SELECT territorio_id FROM lotes WHERE id = ?', [loteId]);
        const lotes = await dbAll('SELECT status FROM lotes WHERE territorio_id = ?', [lote.territorio_id]);

        const allDone = lotes.every(l => l.status);
        if (allDone) {
            const territorioConclusao = new Date().toISOString().split('T')[0];
            await dbRun('UPDATE territorios SET status = ?, data_conclusao = ? WHERE id = ?', [true, territorioConclusao, lote.territorio_id]);
        } else {
            await dbRun('UPDATE territorios SET status = ?, data_conclusao = NULL WHERE id = ?', [false, lote.territorio_id]);
        }

        res.json({ message: 'Status do lote atualizado com sucesso.' });
    } catch (error) {
        console.error('Erro ao atualizar status do lote:', error);
        res.status(500).json({ message: 'Erro ao atualizar status do lote.' });
    }
});

app.put('/api/territorios/:id', authorizeTerritorioAccess, async (req, res) => {
    const territorioId = req.params.id;
    const { territory, lots } = req.body;

    try {
        const territoryString = JSON.stringify(territory);
        await dbRun('UPDATE territorios SET territory = ? WHERE id = ?', [territoryString, territorioId]);

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

// Função para gerar HTML dinâmico com ajustes finais de margens e alinhamento
function generateTerritorioHTML(territorio, lotes) {
    const territorioColor = territorio.status ? '#32CD32' : '#FF0000';
    let lotesJs = '';
    for (const lote of lotes) {
        const loteColor = lote.status ? '#32CD32' : '#FF0000';
        const coordsArray = JSON.stringify(lote.coordenadas);
        lotesJs += `
            (function() {
                var loteCoords = ${coordsArray};
                L.polygon(loteCoords, {
                    color: '${loteColor}',
                    fillColor: '${loteColor}',
                    fillOpacity: 0.5
                }).addTo(map);
            })();
        `;
    }

    const territorioCoords = JSON.stringify(territorio.territory);
    const modeloPath = path.join(__dirname, 'public', 'modelo.png');
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Cartão de Mapa de Território</title>
<style>
  @page {
    margin: 25mm; /* Margens iguais em todas as direções */
  }
  body {
    margin: 0; /* Remove as margens padrão do body */
    padding: 0;
    width: 100%;
    height: 100%;
    font-family: 'Courier New, monospace;
    background: url('file:${modeloPath}') no-repeat center top;
    background-size: cover;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  .content {
    width: 100%;
    padding: 25mm; /* Margens internas iguais */
    box-sizing: border-box;
    text-align: justify;
  }

  h1 {
    text-align: center;
    font-size: 26pt;
    margin-bottom: 20mm;
    font-family: Courier New, bold, monospace;
  }

  .header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10mm;
    font-size: 20pt;
    font-family: Courier New, monospace;
  }

  .header .bairro,
  .header .identificador {
    font-size: 18pt;
    font-weight: 850;
    font-family: Courier New, monospace;
  }

  #map {
    width: 100%;
    height: 100mm;
    background: #eee;
    border: 1px solid #ccc;
    margin-bottom: 20mm;
  }

  .instructions {
    margin-bottom: 15mm;
    text-align: justify;
    font-size: 18pt;
    font-weight: 850;
    font-family: Courier New, monospace;
  }

  .footer {
    width: 100%;
    display: flex;
    justify-content: space-between;
    font-size: 16pt;
  }

  .footer h5 {
    margin: 0;
    font-family: Courier New, monospace;
    font-weight: normal;
  }
</style>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css"/>
</head>
<body>
  <div class="content">
    <h1>Cartão de Mapa de Território</h1>
    <div class="header">
      <div class="bairro">Localidade (Bairro): ${territorio.bairro}</div>
      <div class="identificador">Terr. Nº: ${territorio.identificador}</div>
    </div>
    <div id="map"></div>
    <div class="instructions">
      Guarde este cartão no envelope. Tome cuidado para não o manchar, marcar ou dobrar.
      Cada vez que o território for coberto, queira informar disso o irmão que cuida do arquivo de territórios.
    </div>
    <div class="footer">
      <h5>S-12T 6/72</h5>
      <h5>Impresso no Brasil</h5>
    </div>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"></script>
  <script>
    var territoryCoords = ${territorioCoords};
    var latSum = 0, lngSum = 0, count = 0;
    territoryCoords.forEach(pt => { latSum += pt.lat; lngSum += pt.lng; count++; });
    var center = [latSum / count, lngSum / count];

    var map = L.map('map', { zoomControl: false }).setView(center, 15);

    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    maxZoom: 25,
    id: 'mapbox/satellite-v9',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: 'pk.eyJ1IjoiZGFuaWxvbW9yYWlzIiwiYSI6ImNsdzZocmJ5eDFqenoyanFzenBoMTc4c28ifQ._RiYYX1oIBe7_MBpTyYWxQ'
    }).addTo(map);


    L.polygon(territoryCoords, {
      color: '${territorioColor}',
      fillColor: '${territorioColor}',
      fillOpacity: 0.3
    }).addTo(map);

    ${lotesJs}

    var territorioPolygon = L.polygon(territoryCoords);
    map.fitBounds(territorioPolygon.getBounds());

    window.mapReady = true;
  </script>
</body>
</html>`;
}

// Rota de exportação corrigida
app.get('/api/territorios/:id/export', authorizeTerritorioAccess, async (req, res) => {
    const territorioId = req.params.id;
    const format = req.query.format || 'pdf';

    try {
        const territorio = await dbGet('SELECT * FROM territorios WHERE id = ?', [territorioId]);
        if (!territorio) {
            return res.status(404).json({ message: 'Território não encontrado' });
        }

        territorio.territory = JSON.parse(territorio.territory);
        const lotes = await dbAll('SELECT * FROM lotes WHERE territorio_id = ?', [territorioId]);
        lotes.forEach(lote => {
            lote.coordenadas = JSON.parse(lote.coordenadas);
        });

        const html = generateTerritorioHTML(territorio, lotes);

        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();

        // Definir o tamanho da página para A4 em mm convertidos para pixels
        const A4_WIDTH_MM = 297; // Alterado para paisagem
        const A4_HEIGHT_MM = 210; // Alterado para paisagem
        const mmToPx = (mm) => mm * 3.779528; // Aproximação de conversão de mm para pixels (96 DPI)

        await page.setViewport({
            width: Math.round(mmToPx(A4_WIDTH_MM)),
            height: Math.round(mmToPx(A4_HEIGHT_MM)),
            deviceScaleFactor: 2, // Melhor qualidade para imagens
        });

        await page.setContent(html, { waitUntil: 'networkidle0' });
        await page.waitForFunction('window.mapReady === true', { timeout: 20000 });

        if (format === 'pdf') {
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                landscape: true, // Alterado para paisagem
                margin: {
                    top: '25mm',
                    bottom: '25mm',
                    left: '25mm',
                    right: '25mm',
                },
            });
            await browser.close();

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="territorio_${territorioId}.pdf"`);
            res.end(pdfBuffer, 'binary');
        } else if (format === 'png') {
            const screenshotBuffer = await page.screenshot({
                fullPage: true,
                omitBackground: false,
            });
            await browser.close();

            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Content-Disposition', `attachment; filename="territorio_${territorioId}.png"`);
            res.end(screenshotBuffer, 'binary');
        } else {
            await browser.close();
            res.status(400).json({ message: 'Formato não suportado. Use ?format=pdf ou ?format=png' });
        }
    } catch (error) {
        console.error('Erro ao exportar território:', error);
        res.status(500).json({ message: 'Erro ao exportar território' });
    }
});

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res) => {
    res.status(404).json({ message: 'Rota não encontrada' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});
