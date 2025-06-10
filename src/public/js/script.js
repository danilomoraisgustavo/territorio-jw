// Verifica se o elemento 'container' existe antes de alternar entre login e cadastro
const container = document.getElementById('container');
if (container) {
    toggle = () => {
        container.classList.toggle('sign-in');
        container.classList.toggle('sign-up');
    }

    setTimeout(() => {
        container.classList.add('sign-in');
    }, 200);
}

// Validação de Cadastro
const signupBtn = document.getElementById('signup-btn');
if (signupBtn) {
    signupBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const username = document.getElementById('signup-username');
        const email = document.getElementById('signup-email');
        const endereco = document.getElementById('signup-endereco');
        const celular = document.getElementById('signup-celular');
        const password = document.getElementById('signup-password');
        const confirmPassword = document.getElementById('signup-confirm-password');

        // Resetar todos os erros antes de validar
        resetError(username);
        resetError(email);
        resetError(endereco);
        resetError(celular);
        resetError(password);
        resetError(confirmPassword);

        let isValid = true;

        // Validação de campos
        if (username.value.trim() === '') {
            showError(username, 'O nome é obrigatório');
            isValid = false;
        }
        if (username.value.trim() === '') {
            showError(username, 'O nome de usuário é obrigatório');
            isValid = false;
        }
        if (!validateEmail(email.value)) {
            showError(email, 'Por favor, insira um e-mail válido');
            isValid = false;
        }
        if (endereco.value.trim() === '') {
            showError(endereco, 'O endereço é obrigatório');
            isValid = false;
        }
        if (celular.value.length !== 16) {
            showError(celular, 'Por favor, insira um celular válido');
            isValid = false;
        }
        if (password.value.length < 6) {
            showError(password, 'A senha deve ter pelo menos 6 caracteres');
            isValid = false;
        }
        if (password.value !== confirmPassword.value) {
            showError(confirmPassword, 'As senhas não coincidem');
            isValid = false;
        }

        if (isValid) {
            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: username.value,
                        email: email.value,
                        endereco: endereco.value,
                        celular: celular.value,
                        password: password.value
                    })
                });
                const result = await response.json();

                if (response.status === 200) {
                    showNotification(result.message, true);

                    // Limpar campos e alternar para login
                    username.value = '';
                    email.value = '';
                    endereco.value = '';
                    celular.value = '';
                    password.value = '';
                    confirmPassword.value = '';
                    toggle();
                } else {
                    showNotification(result.message, false);
                }
            } catch (error) {
                showNotification('Erro ao registrar. Tente novamente mais tarde.', false);
            }
        }
    });
}

// Validação de Login
const signinBtn = document.getElementById('signin-btn');
if (signinBtn) {
    signinBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const email = document.getElementById('signin-username').value;
        const password = document.getElementById('signin-password').value;

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const result = await response.json();

            if (response.status === 200) {
                window.location.href = result.redirect;
            } else {
                showNotification(result.message, false);
            }
        } catch (error) {
            showNotification('Erro ao fazer login', false);
        }
    });
}

// Função para exibir erro
function showError(input, message) {
    const inputGroup = input.parentElement;
    const errorMessage = inputGroup.querySelector('.error-message');

    errorMessage.innerText = message;
    errorMessage.style.display = 'block';
    inputGroup.classList.add('error');
}

// Função para resetar o erro
function resetError(input) {
    const inputGroup = input.parentElement;
    const errorMessage = inputGroup.querySelector('.error-message');

    errorMessage.style.display = 'none';
    inputGroup.classList.remove('error');
}

// Validação de e-mail
function validateEmail(email) {
    const re = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return re.test(String(email).toLowerCase());
}

// Função para alternar visibilidade da senha
function togglePasswordVisibility(fieldId) {
    const passwordField = document.getElementById(fieldId);
    const passwordIcon = passwordField.nextElementSibling;

    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        passwordIcon.classList.replace('bx-show', 'bx-hide');
    } else {
        passwordField.type = 'password';
        passwordIcon.classList.replace('bx-hide', 'bx-show');
    }
}

// Função para exibir a notificação
function showNotification(message, isSuccess = true) {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    notificationMessage.innerText = message;

    if (isSuccess) {
        notification.classList.add('success');
        notification.classList.remove('error');
    } else {
        notification.classList.add('error');
        notification.classList.remove('success');
    }

    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);

    const closeNotification = document.getElementById('close-notification');
    if (closeNotification) {
        closeNotification.onclick = () => {
            notification.style.display = 'none';
        };
    }
}

// Formatação do campo de celular
const celularInput = document.getElementById('signup-celular');
if (celularInput) {
    celularInput.addEventListener('input', function (e) {
        let x = e.target.value.replace(/\D/g, '').substring(0, 11);
        let formattedNumber = '';

        if (x.length > 0) {
            formattedNumber += '(' + x.substring(0, 2);
        }
        if (x.length >= 3) {
            formattedNumber += ') ' + x.substring(2, 3);
        }
        if (x.length >= 4) {
            formattedNumber += ' ' + x.substring(3, 7);
        }
        if (x.length >= 8) {
            formattedNumber += '-' + x.substring(7, 11);
        }

        e.target.value = formattedNumber;
    });
}

// Alternar Menu Lateral e Hamburger
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menu-toggle');
const navbar = document.querySelector('.navbar');
const mainContent = document.querySelector('.main-content'); // Adicione uma classe "main-content" à div principal se necessário

if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        sidebar.classList.toggle('active');
        navbar.classList.toggle('active');
        if (mainContent) {
            mainContent.classList.toggle('active');
        }
    });
}


// Exibir Nome de Usuário e Designação
const usernameElement = document.getElementById('username');
const designationElement = document.getElementById('designation');

// Função para carregar as informações do usuário
async function loadUserInfo() {
    if (usernameElement && designationElement) {
        try {
            const response = await fetch('/user-info');
            const userData = await response.json();
            if (response.ok) {
                usernameElement.textContent = userData.username;
                designationElement.textContent = userData.designacao;
                showMenuItems(userData.designacao);
            } else {
                console.error('Erro ao carregar informações do usuário');
            }
        } catch (error) {
            console.error('Erro ao carregar informações do usuário:', error);
        }
    }
}

// Função para exibir itens do menu com base na designação
function showMenuItems(designacao) {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        const roles = item.getAttribute('data-role').split(',');
        if (roles.includes(designacao)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Carrega as informações do usuário ao abrir o dashboard
loadUserInfo();

// Exibir e ocultar dropdown do usuário
const userMenu = document.getElementById('user-menu');
if (userMenu) {
    userMenu.addEventListener('click', () => {
        userMenu.classList.toggle('active');
    });
}

// Logout
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/logout', { method: 'POST' });
            if (response.ok) {
                window.location.href = '/';
            } else {
                console.error('Erro ao fazer logout');
            }
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    });
}
