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
let selectedShape = null;

// Função initMap no escopo global
function initMap() {
    console.log('Inicializando o mapa');
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -6.530239, lng: -49.851626 },
        zoom: 12
    });

    drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: false,
        polygonOptions: {
            fillColor: '#1E90FF',
            fillOpacity: 0.5,
            strokeWeight: 2,
            clickable: true,
            editable: false,
            zIndex: 1
        }
    });
    drawingManager.setMap(map);

    google.maps.event.addListener(drawingManager, 'overlaycomplete', function (event) {
        let newShape = event.overlay;
        newShape.type = event.type;
        newShape.setEditable(isEditing);
        setupPolygonDeleteListener(newShape);

        if (isDrawingTerritory) {
            if (territoryShape) {
                territoryShape.setMap(null);
            }
            territoryShape = newShape;
            territoryShape.type = 'territory';

            drawingManager.setDrawingMode(null);

            document.getElementById('draw-territory-btn').disabled = true;
            document.getElementById('draw-lots-btn').disabled = false;

            isDrawingTerritory = false;
        } else if (isDrawingLots) {
            newShape.type = 'lot';

            let isValidLot = true;
            newShape.getPath().forEach(function (point) {
                if (!google.maps.geometry.poly.containsLocation(point, territoryShape)) {
                    isValidLot = false;
                }
            });

            if (!isValidLot) {
                alert('O lote desenhado está fora do território. Por favor, desenhe o lote dentro do território.');
                newShape.setMap(null);
            } else {
                lotShapes.push(newShape);
            }
        }

        google.maps.event.addListener(newShape, 'click', function () {
            if (isDeleting) {
                deleteShape(newShape);
            } else if (isEditing) {
                selectShape(newShape);
            }
        });
    });
}

function setupPolygonDeleteListener(polygon) {
    google.maps.event.addListener(polygon.getPath(), 'rightclick', function (event) {
        if (event.vertex != null) {
            polygon.getPath().removeAt(event.vertex);
        }
    });
}

function selectShape(shape) {
    if (selectedShape) {
        selectedShape.setEditable(false);
    }
    selectedShape = shape;
    selectedShape.setEditable(true);
}

function deleteShape(shape) {
    if (!shape) return;

    let confirmDelete = confirm('Tem certeza de que deseja apagar este polígono?');
    if (confirmDelete) {
        if (shape.type === 'territory') {
            fetch(`/api/territorios/${shape.territorioId}`, { method: 'DELETE' })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Erro ao excluir território: ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    alert(data.message);
                    shape.setMap(null);
                    territoryShape = null;
                    lotShapes.forEach(lote => {
                        lote.setMap(null);
                    });
                    lotShapes = [];
                    document.getElementById('draw-territory-btn').disabled = false;
                    document.getElementById('draw-lots-btn').disabled = true;
                })
                .catch(error => {
                    console.error('Erro ao excluir território:', error);
                    alert('Erro ao excluir território. Tente novamente.');
                });
        } else if (shape.type === 'lot') {
            fetch(`/api/lotes/${shape.loteId}`, { method: 'DELETE' })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Erro ao excluir lote: ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    alert(data.message);
                    shape.setMap(null);
                    lotShapes = lotShapes.filter(lote => lote !== shape);
                })
                .catch(error => {
                    console.error('Erro ao excluir lote:', error);
                    alert('Erro ao excluir lote. Tente novamente.');
                });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    let currentUserDesignacao = '';

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
                if (!['Administrador', 'Superintendente de Serviço', 'Superintendente de Território'].includes(data.designacao)) {
                    document.querySelector('a[data-target="usuarios"]').parentElement.style.display = 'none';
                }
            }
            updateTotalUsuarios();
            const activeSection = document.querySelector('.section.active');
            if (activeSection.id === 'usuarios') {
                loadUsers();
            }
        })
        .catch(error => console.error('Erro ao obter informações do usuário:', error));

    document.getElementById('logout-btn').addEventListener('click', () => {
        fetch('/logout', { method: 'POST' })
            .then(() => {
                window.location.href = '/';
            })
            .catch(error => console.error('Erro ao fazer logout:', error));
    });

    const toggleBtn = document.querySelector('.toggle-btn');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    const navLinks = document.querySelectorAll('.sidebar nav ul li a');
    const sections = document.querySelectorAll('.section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(item => item.classList.remove('active'));
            link.classList.add('active');
            sections.forEach(section => section.classList.remove('active'));
            const target = link.getAttribute('data-target');
            const targetSection = document.getElementById(target);

            if (targetSection) {
                targetSection.classList.add('active');
                if (target === 'usuarios') {
                    loadUsers();
                }
            }

            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
            }
        });
    });

    mainContent.addEventListener('click', () => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });

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
                tbody.innerHTML = '';

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
                            : `<button class="action-btn accept-btn" data-id="${user.id}"><i class="fas fa-unlock"></i> Aceitar</button>`}
                        </td>
                    `;
                    tbody.appendChild(tr);
                });

                addUserActionEvents();
            })
            .catch(error => console.error('Erro ao carregar usuários:', error));
    }

    function addUserActionEvents() {
        const editButtons = document.querySelectorAll('.edit-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', () => {
                const userId = button.getAttribute('data-id');
                openEditModal(userId);
            });
        });

        const deleteButtons = document.querySelectorAll('.delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', () => {
                const userId = button.getAttribute('data-id');
                deleteUser(userId);
            });
        });

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
                    document.getElementById('edit-user-modal').style.display = 'block';
                }
            })
            .catch(error => console.error('Erro ao buscar usuário:', error));
    }

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

    const closeButtons = document.querySelectorAll('.close-btn');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.parentElement.parentElement.style.display = 'none';
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });

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
            headers: { 'Content-Type': 'application/json' },
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
            headers: { 'Content-Type': 'application/json' },
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

    function initialize() {
        const activeSection = document.querySelector('.section.active');
        if (activeSection.id === 'usuarios') {
            loadUsers();
        }
    }

    initialize();

    // Seção de Território
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            tabLinks.forEach(link => link.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            link.classList.add('active');
            const tab = link.getAttribute('data-tab');
            document.getElementById(tab).classList.add('active');

            if (tab === 'gerenciamento') {
                loadTerritorios();
            }
        });
    });

    document.getElementById('draw-territory-btn').addEventListener('click', () => {
        if (isEditing || isDeleting) {
            toggleEditingMode(false);
            toggleDeletingMode(false);
        }
        isDrawingTerritory = true;
        isDrawingLots = false;
        drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
    });

    document.getElementById('draw-lots-btn').addEventListener('click', () => {
        if (!territoryShape) {
            alert('Por favor, desenhe primeiro o território principal.');
            return;
        }
        if (isEditing || isDeleting) {
            toggleEditingMode(false);
            toggleDeletingMode(false);
        }
        isDrawingTerritory = false;
        isDrawingLots = true;
        drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
    });

    document.getElementById('edit-mode-btn').addEventListener('click', () => {
        toggleEditingMode(!isEditing);
        if (isDeleting) {
            toggleDeletingMode(false);
        }
    });

    document.getElementById('delete-mode-btn').addEventListener('click', () => {
        toggleDeletingMode(!isDeleting);
        if (isEditing) {
            toggleEditingMode(false);
        }
    });

    function toggleEditingMode(enable) {
        isEditing = enable;
        if (isEditing) {
            setEditing(true);
            drawingManager.setDrawingMode(null);
            isDrawingTerritory = false;
            isDrawingLots = false;
            document.getElementById('edit-mode-btn').classList.add('active');
        } else {
            setEditing(false);
            document.getElementById('edit-mode-btn').classList.remove('active');
        }
    }

    function toggleDeletingMode(enable) {
        isDeleting = enable;
        if (isDeleting) {
            setDeleting(true);
            drawingManager.setDrawingMode(null);
            isDrawingTerritory = false;
            isDrawingLots = false;
            setEditing(false);
            document.getElementById('delete-mode-btn').classList.add('active');
        } else {
            setDeleting(false);
            document.getElementById('delete-mode-btn').classList.remove('active');
        }
    }

    function setEditing(enabled) {
        if (territoryShape) {
            territoryShape.setEditable(enabled);
        }
        lotShapes.forEach(shape => {
            shape.setEditable(enabled);
        });
        if (enabled) {
            map.setOptions({ draggableCursor: 'pointer' });
        } else {
            map.setOptions({ draggableCursor: null });
        }
    }

    function setDeleting(enabled) {
        if (enabled) {
            map.setOptions({ draggableCursor: 'not-allowed' });
        } else {
            map.setOptions({ draggableCursor: null });
        }
    }

    document.getElementById('save-territorio-btn').addEventListener('click', () => {
        const identificador = document.getElementById('territorio-id').value.trim();
        const bairro = document.getElementById('territorio-bairro').value.trim();
        if (!identificador) {
            alert('Por favor, insira um identificador para o território.');
            return;
        }
        if (!bairro) {
            alert('Por favor, insira um bairro para o território.');
            return;
        }

        if (!territoryShape) {
            alert('Por favor, desenhe o território principal.');
            return;
        }

        let territoryCoordinates = [];
        territoryShape.getPath().forEach(point => {
            territoryCoordinates.push({ lat: point.lat(), lng: point.lng() });
        });

        let lotsData = lotShapes.map(shape => {
            let shapeCoordinates = [];
            shape.getPath().forEach(point => {
                shapeCoordinates.push({ lat: point.lat(), lng: point.lng() });
            });
            return shapeCoordinates;
        });

        console.log('Dados a serem enviados:');
        console.log('Identificador:', identificador);
        console.log('Bairro:', bairro);
        console.log('Territory:', territoryCoordinates);
        console.log('Lots:', lotsData);

        fetch('/api/territorios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identificador: identificador,
                bairro: bairro,
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
                if (territoryShape) {
                    territoryShape.setMap(null);
                    territoryShape = null;
                }
                lotShapes.forEach(shape => shape.setMap(null));
                lotShapes = [];
                document.getElementById('territorio-id').value = '';
                document.getElementById('territorio-bairro').value = '';
                document.getElementById('draw-territory-btn').disabled = false;
                document.getElementById('draw-lots-btn').disabled = true;
            })
            .catch(error => {
                console.error('Erro ao salvar território:', error);
                alert('Erro ao salvar território. Tente novamente.');
            });
    });

    document.getElementById('save-edits-btn').addEventListener('click', () => {
        if (!territoryShape) {
            alert('Nenhum território para salvar.');
            return;
        }

        let territoryCoordinates = [];
        territoryShape.getPath().forEach(point => {
            territoryCoordinates.push({ lat: point.lat(), lng: point.lng() });
        });

        let lotsData = lotShapes.map(shape => {
            let shapeCoordinates = [];
            shape.getPath().forEach(point => {
                shapeCoordinates.push({ lat: point.lat(), lng: point.lng() });
            });
            return {
                id: shape.loteId,
                coordenadas: shapeCoordinates
            };
        });

        fetch(`/api/territorios/${territoryShape.territorioId}`, {
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
                tbody.innerHTML = '';

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

                addTerritorioActionEvents();
            })
            .catch(error => console.error('Erro ao carregar territórios:', error));
    }

    function addTerritorioActionEvents() {
        const viewButtons = document.querySelectorAll('.view-btn');
        viewButtons.forEach(button => {
            button.addEventListener('click', () => {
                const territorioId = button.getAttribute('data-id');
                viewTerritorio(territorioId);
            });
        });

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

        if (territoryShape) {
            territoryShape.setMap(null);
            territoryShape = null;
        }
        lotShapes.forEach(shape => shape.setMap(null));
        lotShapes = [];

        const territoryColor = territorio.status ? '#32CD32' : 'rgba(255, 0, 0, 0.3)';
        const territoryCoords = territorio.territory;
        territoryShape = new google.maps.Polygon({
            paths: territoryCoords,
            fillColor: territoryColor,
            fillOpacity: 0.5,
            strokeWeight: 2,
            editable: isEditing,
            map: map
        });

        territoryShape.territorioId = territorio.id;
        territoryShape.type = 'territory';
        setupPolygonDeleteListener(territoryShape);

        territoryShape.addListener('click', () => {
            if (isDeleting) {
                deleteShape(territoryShape);
            } else if (isEditing) {
                selectShape(territoryShape);
            }
        });

        lotes.forEach(lote => {
            const lotColor = lote.status ? '#32CD32' : '#FF0000';
            const lotShape = new google.maps.Polygon({
                paths: lote.coordenadas,
                fillColor: lotColor,
                fillOpacity: 0.5,
                strokeWeight: 2,
                editable: isEditing,
                map: map
            });

            lotShape.loteId = lote.id;
            lotShape.type = 'lot';
            setupPolygonDeleteListener(lotShape);

            lotShape.addListener('click', () => {
                if (isDeleting) {
                    deleteShape(lotShape);
                } else if (isEditing) {
                    selectShape(lotShape);
                } else {
                    updateLoteStatus(lote.id, !lote.status);
                }
            });

            lotShapes.push(lotShape);
        });

        const bounds = new google.maps.LatLngBounds();
        territoryCoords.forEach(coord => {
            bounds.extend(new google.maps.LatLng(coord.lat, coord.lng));
        });
        map.fitBounds(bounds);

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

    // Exportação do Território
    const exportContainer = document.querySelector('.export-container');
    const exportToggleBtn = document.querySelector('.export-toggle-btn');
    const exportDropdown = document.querySelector('.export-dropdown');

    exportToggleBtn.addEventListener('click', () => {
        exportContainer.classList.toggle('active');
    });

    exportDropdown.addEventListener('click', (e) => {
        e.preventDefault();
        if (e.target.tagName === 'A') {
            const format = e.target.getAttribute('data-format');
            if (!territoryShape || !territoryShape.territorioId) {
                alert('Nenhum território carregado para exportar.');
                return;
            }
            window.open(`/api/territorios/${territoryShape.territorioId}/export?format=${format}`, '_blank');
        }
    });
});
