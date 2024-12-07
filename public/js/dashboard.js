// dashboard.js

// Defina as variáveis no escopo global
let map;
let drawingManager;
let territoryShape = null; // Armazena o polígono do território principal
let lotShapes = []; // Armazena os polígonos dos lotes
let isDrawingTerritory = false;
let isDrawingLots = false;
let isEditing = false; // Estado para controle de edição
let isDeleting = false; // Estado para controle de apagar

// Função initMap no escopo global
function initMap() {
    console.log('Inicializando o mapa');
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -6.530239, lng: -49.851626 },
        zoom: 12
    });

    // Configurar o Drawing Manager
    drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: false,
        polygonOptions: {
            fillColor: '#1E90FF',
            fillOpacity: 0.5,
            strokeWeight: 2,
            clickable: true,
            editable: false, // Inicialmente não editável
            zIndex: 1
        }
    });
    drawingManager.setMap(map);

    // Eventos para capturar as formas desenhadas
    google.maps.event.addListener(drawingManager, 'overlaycomplete', function (event) {
        let newShape = event.overlay;
        newShape.type = event.type;

        // Definir a edição com base no modo atual
        newShape.setEditable(isEditing);

        // Adicionar listener para permitir a exclusão de vértices
        setupPolygonDeleteListener(newShape);

        // Se estivermos desenhando o território principal
        if (isDrawingTerritory) {
            if (territoryShape) {
                // Remover o território anterior, se existir
                territoryShape.setMap(null);
            }
            territoryShape = newShape;
            territoryShape.type = 'territory';

            // Desativar o modo de desenho após desenhar o território
            drawingManager.setDrawingMode(null);

            // Atualizar o estado dos botões
            document.getElementById('draw-territory-btn').disabled = true;
            document.getElementById('draw-lots-btn').disabled = false;

            isDrawingTerritory = false;
        } else if (isDrawingLots) {
            newShape.type = 'lot';

            // Verificar se o lote está dentro do território
            let isValidLot = true;
            newShape.getPath().forEach(function (point) {
                if (!google.maps.geometry.poly.containsLocation(point, territoryShape)) {
                    isValidLot = false;
                }
            });

            if (!isValidLot) {
                alert('O lote desenhado está fora do território. Por favor, desenhe o lote dentro do território.');
                // Remover o lote inválido do mapa
                newShape.setMap(null);
            } else {
                lotShapes.push(newShape);
            }
            // Continuar no modo de desenho de lotes
        }

        // Evento para selecionar a forma ao clicar nela
        google.maps.event.addListener(newShape, 'click', function () {
            if (isDeleting) {
                // No modo de apagar, deletar a forma ao clicar
                deleteShape(newShape);
            } else if (isEditing) {
                // No modo de editar, selecionar a forma para edição
                selectShape(newShape);
            }
        });
    });
}

// Função para adicionar listener para exclusão de vértices
function setupPolygonDeleteListener(polygon) {
    google.maps.event.addListener(polygon.getPath(), 'rightclick', function (event) {
        // Verificar se foi clicado em um vértice
        if (event.vertex != null) {
            // Remover o vértice clicado
            polygon.getPath().removeAt(event.vertex);
        }
    });
}

// Função para selecionar uma forma para edição
function selectShape(shape) {
    if (selectedShape) {
        selectedShape.setEditable(false);
    }
    selectedShape = shape;
    selectedShape.setEditable(true);
}

// Função para deletar uma forma
function deleteShape(shape) {
    if (!shape) return;

    let confirmDelete = confirm('Tem certeza de que deseja apagar este polígono?');
    if (confirmDelete) {
        // Chamar a API para deletar do servidor
        if (shape.type === 'territory') {
            // Deletar território
            fetch(`/api/territorios/${shape.territorioId}`, { method: 'DELETE' })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Erro ao excluir território: ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    alert(data.message);
                    // Remover do mapa
                    shape.setMap(null);
                    territoryShape = null;

                    // Remover todos os lotes associados
                    lotShapes.forEach(lote => {
                        lote.setMap(null);
                    });
                    lotShapes = [];

                    // Atualizar estado dos botões
                    document.getElementById('draw-territory-btn').disabled = false;
                    document.getElementById('draw-lots-btn').disabled = true;
                })
                .catch(error => {
                    console.error('Erro ao excluir território:', error);
                    alert('Erro ao excluir território. Tente novamente.');
                });
        } else if (shape.type === 'lot') {
            // Deletar lote
            fetch(`/api/lotes/${shape.loteId}`, { method: 'DELETE' })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Erro ao excluir lote: ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    alert(data.message);
                    // Remover do mapa
                    shape.setMap(null);
                    // Remover do array de lotes
                    lotShapes = lotShapes.filter(lote => lote !== shape);
                })
                .catch(error => {
                    console.error('Erro ao excluir lote:', error);
                    alert('Erro ao excluir lote. Tente novamente.');
                });
        }
    }
}

// Variável para armazenar a forma selecionada
let selectedShape = null;

document.addEventListener('DOMContentLoaded', () => {
    let currentUserDesignacao = '';

    // Obter nome do usuário e designação
    fetch('/user-info')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro ao obter informações do usuário: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.username) {
                document.getElementById('username').textContent = data.username;
            }
            if (data.designacao) {
                currentUserDesignacao = data.designacao;
                console.log(`Designação do usuário: ${data.designacao}`);
                // Controlar a visibilidade da seção de Usuários
                if (!['Administrador', 'Superintendente de Serviço', 'Superintendente de Território'].includes(data.designacao)) {
                    document.querySelector('a[data-target="usuarios"]').parentElement.style.display = 'none';
                }
            }
            // Atualizar o total de usuários no cartão de Início
            updateTotalUsuarios();
            // Se a seção 'usuarios' está ativa, carregar os usuários
            const activeSection = document.querySelector('.section.active');
            if (activeSection.id === 'usuarios') {
                loadUsers();
            }
        })
        .catch(error => console.error('Erro ao obter informações do usuário:', error));

    // Implementar logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        fetch('/logout', { method: 'POST' })
            .then(() => {
                window.location.href = '/';
            })
            .catch(error => console.error('Erro ao fazer logout:', error));
    });

    // Alternar a sidebar em dispositivos móveis
    const toggleBtn = document.querySelector('.toggle-btn');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // Destacar o link ativo na barra lateral e exibir a seção correspondente
    const navLinks = document.querySelectorAll('.sidebar nav ul li a');
    const sections = document.querySelectorAll('.section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Remover classe 'active' de todos os links
            navLinks.forEach(item => item.classList.remove('active'));

            // Adicionar classe 'active' ao link clicado
            link.classList.add('active');

            // Ocultar todas as seções
            sections.forEach(section => section.classList.remove('active'));

            // Obter o alvo da seção a ser exibida
            const target = link.getAttribute('data-target');
            const targetSection = document.getElementById(target);

            if (targetSection) {
                targetSection.classList.add('active');
                // Se a seção é 'usuarios', carregar os usuários
                if (target === 'usuarios') {
                    loadUsers();
                }
            }

            // Fechar a sidebar após selecionar um item (em mobile)
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
            }
        });
    });

    // Fechar a sidebar ao clicar fora dela (em mobile)
    mainContent.addEventListener('click', () => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });

    // Função para atualizar o total de usuários no cartão de Início
    function updateTotalUsuarios() {
        console.log('Fazendo requisição para obter o total de usuários');
        fetch('/api/users/count', {
            method: 'GET'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Total de usuários recebido:', data.count);
                document.getElementById('total-usuarios').textContent = data.count;
            })
            .catch(error => console.error('Erro ao obter total de usuários:', error));
    }

    // Função para carregar usuários na tabela
    function loadUsers() {
        console.log('Carregando usuários');
        fetch('/api/users', {
            method: 'GET'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Usuários recebidos:', data);
                const tbody = document.querySelector('#users-table tbody');
                tbody.innerHTML = ''; // Limpar tabela

                data.forEach(user => {
                    const tr = document.createElement('tr');

                    tr.innerHTML = `
                        <td>${user.id}</td>
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td>${user.endereco || '-'}</td>
                        <td>${user.celular || '-'}</td>
                        <td>${user.designacao}</td>
                        <td>${user.init ? 'Ativo' : 'Restrito'}</td>
                        <td>
                            <button class="action-btn edit-btn" data-id="${user.id}"><i class="fas fa-edit"></i> Editar</button>
                            <button class="action-btn delete-btn" data-id="${user.id}"><i class="fas fa-trash-alt"></i> Excluir</button>
                            ${user.init
                            ? `<button class="action-btn restrict-btn" data-id="${user.id}"><i class="fas fa-lock"></i> Restringir</button>`
                            : `<button class="action-btn accept-btn" data-id="${user.id}"><i class="fas fa-unlock"></i> Aceitar</button>`
                        }
                        </td>
                    `;

                    tbody.appendChild(tr);
                });

                // Adicionar eventos aos botões
                addUserActionEvents();
            })
            .catch(error => console.error('Erro ao carregar usuários:', error));
    }

    // Função para adicionar eventos aos botões de ação
    function addUserActionEvents() {
        // Editar usuário
        const editButtons = document.querySelectorAll('.edit-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', () => {
                const userId = button.getAttribute('data-id');
                openEditModal(userId);
            });
        });

        // Excluir usuário
        const deleteButtons = document.querySelectorAll('.delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', () => {
                const userId = button.getAttribute('data-id');
                deleteUser(userId);
            });
        });

        // Aceitar ou Restringir acesso
        const acceptButtons = document.querySelectorAll('.accept-btn');
        acceptButtons.forEach(button => {
            button.addEventListener('click', () => {
                const userId = button.getAttribute('data-id');
                changeUserStatus(userId, true);
            });
        });

        const restrictButtons = document.querySelectorAll('.restrict-btn');
        restrictButtons.forEach(button => {
            button.addEventListener('click', () => {
                const userId = button.getAttribute('data-id');
                changeUserStatus(userId, false);
            });
        });
    }

    // Função para abrir o modal de edição
    function openEditModal(userId) {
        console.log(`Abrindo modal de edição para o usuário ID ${userId}`);
        fetch(`/api/users/${userId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro ao buscar usuário: ${response.status}`);
                }
                return response.json();
            })
            .then(user => {
                if (user) {
                    document.getElementById('edit-user-id').value = user.id;
                    document.getElementById('edit-username').value = user.username;
                    document.getElementById('edit-email').value = user.email;
                    document.getElementById('edit-endereco').value = user.endereco || '';
                    document.getElementById('edit-celular').value = user.celular || '';
                    document.getElementById('edit-designacao').value = user.designacao;

                    // Abrir modal
                    document.getElementById('edit-user-modal').style.display = 'block';
                }
            })
            .catch(error => console.error('Erro ao buscar usuário:', error));
    }

    // Função para excluir usuário
    function deleteUser(userId) {
        if (confirm('Tem certeza de que deseja excluir este usuário?')) {
            console.log(`Excluindo usuário ID ${userId}`);
            fetch(`/api/users/${userId}`, { method: 'DELETE' })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Erro ao excluir usuário: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    alert(data.message);
                    loadUsers();
                    updateTotalUsuarios();
                })
                .catch(error => console.error('Erro ao excluir usuário:', error));
        }
    }

    // Função para aceitar ou restringir acesso do usuário
    function changeUserStatus(userId, accept) {
        const endpoint = accept ? `/api/users/${userId}/accept` : `/api/users/${userId}/restrict`;
        const action = accept ? 'aceitar' : 'restringir';

        if (confirm(`Tem certeza de que deseja ${action} o acesso deste usuário?`)) {
            console.log(`${action.charAt(0).toUpperCase() + action.slice(1)} acesso do usuário ID ${userId}`);
            fetch(endpoint, { method: 'POST' })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Erro ao ${action} o usuário: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    alert(data.message);
                    loadUsers();
                    updateTotalUsuarios();
                })
                .catch(error => console.error(`Erro ao ${action} o usuário:`, error));
        }
    }

    // Fechar modais ao clicar no botão de fechar
    const closeButtons = document.querySelectorAll('.close-btn');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.parentElement.parentElement.style.display = 'none';
        });
    });

    // Fechar modais ao clicar fora do conteúdo do modal
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });

    // Adicionar usuário
    document.getElementById('add-user-btn')?.addEventListener('click', () => {
        document.getElementById('add-user-modal').style.display = 'block';
    });

    document.getElementById('add-user-form')?.addEventListener('submit', (e) => {
        e.preventDefault();

        const username = document.getElementById('add-username').value;
        const email = document.getElementById('add-email').value;
        const endereco = document.getElementById('add-endereco').value;
        const celular = document.getElementById('add-celular').value;
        const password = document.getElementById('add-password').value;
        const designacao = document.getElementById('add-designacao').value;

        console.log('Adicionando novo usuário');

        fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, endereco, celular, password, designacao })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro ao adicionar usuário: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                alert(data.message);
                document.getElementById('add-user-form').reset();
                document.getElementById('add-user-modal').style.display = 'none';
                loadUsers();
                updateTotalUsuarios();
            })
            .catch(error => console.error('Erro ao adicionar usuário:', error));
    });

    // Editar usuário
    document.getElementById('edit-user-form')?.addEventListener('submit', (e) => {
        e.preventDefault();

        const userId = document.getElementById('edit-user-id').value;
        const username = document.getElementById('edit-username').value;
        const email = document.getElementById('edit-email').value;
        const endereco = document.getElementById('edit-endereco').value;
        const celular = document.getElementById('edit-celular').value;
        const designacao = document.getElementById('edit-designacao').value;

        console.log(`Editando usuário ID ${userId}`);

        fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, endereco, celular, designacao })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro ao editar usuário: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                alert(data.message);
                document.getElementById('edit-user-form').reset();
                document.getElementById('edit-user-modal').style.display = 'none';
                loadUsers();
                updateTotalUsuarios();
            })
            .catch(error => console.error('Erro ao editar usuário:', error));
    });

    // Inicializar
    function initialize() {
        // Se a seção ativa for 'usuarios' ao carregar, carregar os usuários
        const activeSection = document.querySelector('.section.active');
        if (activeSection.id === 'usuarios') {
            loadUsers();
        }
    }

    initialize();

    /* ===================== Seção de Território ===================== */

    // Gerenciar as abas dentro da seção "Território"
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Remover classe 'active' de todos os links e conteúdos
            tabLinks.forEach(link => link.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Adicionar classe 'active' ao link e conteúdo clicados
            link.classList.add('active');
            const tab = link.getAttribute('data-tab');
            document.getElementById(tab).classList.add('active');

            // Se a aba 'gerenciamento' for ativada, carregar os territórios
            if (tab === 'gerenciamento') {
                loadTerritorios();
            }
        });
    });

    // Botão para desenhar o território
    document.getElementById('draw-territory-btn').addEventListener('click', () => {
        // Desativar os modos de edição e apagar se estiverem ativos
        if (isEditing || isDeleting) {
            toggleEditingMode(false);
            toggleDeletingMode(false);
        }
        isDrawingTerritory = true;
        isDrawingLots = false;
        drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
    });

    // Botão para desenhar os lotes
    document.getElementById('draw-lots-btn').addEventListener('click', () => {
        if (!territoryShape) {
            alert('Por favor, desenhe primeiro o território principal.');
            return;
        }
        // Desativar os modos de edição e apagar se estiverem ativos
        if (isEditing || isDeleting) {
            toggleEditingMode(false);
            toggleDeletingMode(false);
        }
        isDrawingTerritory = false;
        isDrawingLots = true;
        drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
    });

    // Botão para editar os polígonos
    document.getElementById('edit-mode-btn').addEventListener('click', () => {
        toggleEditingMode(!isEditing);
        // Desativar o modo de apagar se estiver ativo
        if (isDeleting) {
            toggleDeletingMode(false);
        }
    });

    // Botão para apagar os polígonos
    document.getElementById('delete-mode-btn').addEventListener('click', () => {
        toggleDeletingMode(!isDeleting);
        // Desativar o modo de edição se estiver ativo
        if (isEditing) {
            toggleEditingMode(false);
        }
    });

    // Função para alternar o modo de edição
    function toggleEditingMode(enable) {
        isEditing = enable;
        if (isEditing) {
            // Ativar modo de edição
            setEditing(true);
            // Desativar o modo de desenho
            drawingManager.setDrawingMode(null);
            isDrawingTerritory = false;
            isDrawingLots = false;
            // Atualizar aparência do botão
            document.getElementById('edit-mode-btn').classList.add('active');
        } else {
            // Desativar modo de edição
            setEditing(false);
            // Atualizar aparência do botão
            document.getElementById('edit-mode-btn').classList.remove('active');
        }
    }

    // Função para alternar o modo de apagar
    function toggleDeletingMode(enable) {
        isDeleting = enable;
        if (isDeleting) {
            // Ativar modo de apagar
            setDeleting(true);
            // Desativar os modos de desenho e edição
            drawingManager.setDrawingMode(null);
            isDrawingTerritory = false;
            isDrawingLots = false;
            setEditing(false);
            // Atualizar aparência do botão
            document.getElementById('delete-mode-btn').classList.add('active');
        } else {
            // Desativar modo de apagar
            setDeleting(false);
            // Atualizar aparência do botão
            document.getElementById('delete-mode-btn').classList.remove('active');
        }
    }

    // Função para definir o estado de edição nos polígonos
    function setEditing(enabled) {
        if (territoryShape) {
            territoryShape.setEditable(enabled);
        }
        lotShapes.forEach(shape => {
            shape.setEditable(enabled);
        });
        // Alterar o cursor do mapa
        if (enabled) {
            map.setOptions({ draggableCursor: 'pointer' });
        } else {
            map.setOptions({ draggableCursor: null });
        }
    }

    // Função para definir o estado de apagar nos polígonos
    function setDeleting(enabled) {
        if (enabled) {
            // Alterar o cursor para indicar modo de apagar
            map.setOptions({ draggableCursor: 'not-allowed' });
        } else {
            map.setOptions({ draggableCursor: null });
        }
    }

    // Botão para salvar o território
    document.getElementById('save-territorio-btn').addEventListener('click', () => {
        const identificador = document.getElementById('territorio-id').value.trim();
        if (!identificador) {
            alert('Por favor, insira um identificador para o território.');
            return;
        }

        if (!territoryShape) {
            alert('Por favor, desenhe o território principal.');
            return;
        }

        // Obter os dados do território principal
        let territoryCoordinates = [];
        territoryShape.getPath().forEach(point => {
            territoryCoordinates.push({ lat: point.lat(), lng: point.lng() });
        });

        // Obter os dados dos lotes
        let lotsData = lotShapes.map(shape => {
            let shapeCoordinates = [];
            shape.getPath().forEach(point => {
                shapeCoordinates.push({ lat: point.lat(), lng: point.lng() });
            });
            return shapeCoordinates;
        });

        // Log para verificar os dados
        console.log('Dados a serem enviados:');
        console.log('Identificador:', identificador);
        console.log('Territory:', territoryCoordinates);
        console.log('Lots:', lotsData);

        // Enviar os dados ao servidor
        fetch('/api/territorios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identificador: identificador,
                territory: territoryCoordinates,
                lots: lotsData
            })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro ao salvar território: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                alert(data.message);
                // Limpar mapa e formulário
                if (territoryShape) {
                    territoryShape.setMap(null);
                    territoryShape = null;
                }
                lotShapes.forEach(shape => {
                    shape.setMap(null);
                });
                lotShapes = [];
                document.getElementById('territorio-id').value = '';
                // Atualizar estado dos botões
                document.getElementById('draw-territory-btn').disabled = false;
                document.getElementById('draw-lots-btn').disabled = true;
            })
            .catch(error => {
                console.error('Erro ao salvar território:', error);
                alert('Erro ao salvar território. Tente novamente.');
            });
    });

    // Botão para salvar alterações no território e lotes
    document.getElementById('save-edits-btn').addEventListener('click', () => {
        if (!territoryShape) {
            alert('Nenhum território para salvar.');
            return;
        }

        // Obter os dados atualizados do território
        let territoryCoordinates = [];
        territoryShape.getPath().forEach(point => {
            territoryCoordinates.push({ lat: point.lat(), lng: point.lng() });
        });

        // Obter os dados atualizados dos lotes
        let lotsData = lotShapes.map(shape => {
            let shapeCoordinates = [];
            shape.getPath().forEach(point => {
                shapeCoordinates.push({ lat: point.lat(), lng: point.lng() });
            });
            return {
                id: shape.loteId, // Certifique-se de associar o ID do lote ao shape
                coordenadas: shapeCoordinates
            };
        });

        // Enviar os dados ao servidor
        fetch(`/api/territorios/${territoryShape.territorioId}`, { // Certifique-se de armazenar o ID do território
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                territory: territoryCoordinates,
                lots: lotsData
            })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro ao salvar alterações: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                alert(data.message);
            })
            .catch(error => {
                console.error('Erro ao salvar alterações:', error);
                alert('Erro ao salvar alterações. Tente novamente.');
            });
    });

    function loadTerritorios() {
        console.log('Carregando territórios');
        fetch('/api/territorios', {
            method: 'GET'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const tbody = document.querySelector('#territorios-table tbody');
                tbody.innerHTML = ''; // Limpar tabela

                data.forEach(territorio => {
                    const tr = document.createElement('tr');

                    tr.innerHTML = `
                        <td>${territorio.id}</td>
                        <td>${territorio.identificador}</td>
                        <td>${territorio.status ? 'Concluído' : 'Pendente'}</td>
                        <td>
                            <button class="action-btn view-btn" data-id="${territorio.id}"><i class="fas fa-eye"></i> Visualizar</button>
                            <button class="action-btn delete-btn" data-id="${territorio.id}"><i class="fas fa-trash-alt"></i> Excluir</button>
                        </td>
                    `;

                    tbody.appendChild(tr);
                });

                // Adicionar eventos aos botões
                addTerritorioActionEvents();
            })
            .catch(error => console.error('Erro ao carregar territórios:', error));
    }

    function addTerritorioActionEvents() {
        // Visualizar território
        const viewButtons = document.querySelectorAll('.view-btn');
        viewButtons.forEach(button => {
            button.addEventListener('click', () => {
                const territorioId = button.getAttribute('data-id');
                viewTerritorio(territorioId);
            });
        });

        // Excluir território
        const deleteButtons = document.querySelectorAll('.delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', () => {
                const territorioId = button.getAttribute('data-id');
                deleteTerritorio(territorioId);
            });
        });
    }

    function viewTerritorio(territorioId) {
        fetch(`/api/territorios/${territorioId}`, {
            method: 'GET'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro ao buscar território: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Exibir o território e os lotes no mapa
                showTerritorioOnMap(data);
            })
            .catch(error => {
                console.error('Erro ao visualizar território:', error);
                alert('Erro ao visualizar território. Tente novamente.');
            });
    }

    function showTerritorioOnMap(data) {
        const territorio = data.territorio;
        const lotes = data.lotes;

        // Limpar o mapa
        if (territoryShape) {
            territoryShape.setMap(null);
            territoryShape = null;
        }
        lotShapes.forEach(shape => {
            shape.setMap(null);
        });
        lotShapes = [];

        // Definir cor do território com base no status
        const territoryColor = territorio.status ? '#32CD32' : 'rgba(255, 0, 0, 0.3)';

        // Desenhar o território
        const territoryCoords = territorio.territory;
        territoryShape = new google.maps.Polygon({
            paths: territoryCoords,
            fillColor: territoryColor,
            fillOpacity: 0.5,
            strokeWeight: 2,
            editable: isEditing, // Definir com base no modo de edição
            map: map
        });

        // Armazenar o ID do território no shape
        territoryShape.territorioId = territorio.id;
        territoryShape.type = 'territory';

        // Adicionar listener para exclusão de vértices no território
        setupPolygonDeleteListener(territoryShape);

        // Adicionar listener para seleção no modo de edição
        territoryShape.addListener('click', () => {
            if (isDeleting) {
                deleteShape(territoryShape);
            } else if (isEditing) {
                selectShape(territoryShape);
            }
        });

        // Desenhar os lotes
        lotes.forEach(lote => {
            const lotColor = lote.status ? '#32CD32' : '#FF0000';

            const lotShape = new google.maps.Polygon({
                paths: lote.coordenadas,
                fillColor: lotColor,
                fillOpacity: 0.5,
                strokeWeight: 2,
                editable: isEditing, // Definir com base no modo de edição
                map: map
            });

            // Armazenar o ID do lote no shape
            lotShape.loteId = lote.id;
            lotShape.type = 'lot';

            // Adicionar listener para exclusão de vértices no lote
            setupPolygonDeleteListener(lotShape);

            // Adicionar listener para seleção no modo de edição
            lotShape.addListener('click', () => {
                if (isDeleting) {
                    deleteShape(lotShape);
                } else if (isEditing) {
                    selectShape(lotShape);
                }
            });

            // Adicionar evento de clique para atualizar o status do lote
            lotShape.addListener('click', () => {
                if (!isDeleting && !isEditing) {
                    updateLoteStatus(lote.id, !lote.status);
                }
            });

            lotShapes.push(lotShape);
        });

        // Centralizar o mapa no território
        const bounds = new google.maps.LatLngBounds();
        territoryCoords.forEach(coord => {
            bounds.extend(new google.maps.LatLng(coord.lat, coord.lng));
        });
        map.fitBounds(bounds);

        // Alternar para a aba de cadastro para exibir o mapa
        tabLinks.forEach(link => link.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        document.querySelector('.tab-link[data-tab="cadastro"]').classList.add('active');
        document.getElementById('cadastro').classList.add('active');
    }

    function updateLoteStatus(loteId, newStatus) {
        fetch(`/api/lotes/${loteId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro ao atualizar status do lote: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                alert(data.message);
                // Recarregar o território para atualizar as cores
                viewTerritorio(territoryShape.territorioId);
            })
            .catch(error => {
                console.error('Erro ao atualizar status do lote:', error);
                alert('Erro ao atualizar status do lote. Tente novamente.');
            });
    }

    function deleteTerritorio(territorioId) {
        if (confirm('Tem certeza de que deseja excluir este território?')) {
            fetch(`/api/territorios/${territorioId}`, { method: 'DELETE' })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Erro ao excluir território: ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    alert(data.message);
                    loadTerritorios();
                })
                .catch(error => console.error('Erro ao excluir território:', error));
        }
    }
});
