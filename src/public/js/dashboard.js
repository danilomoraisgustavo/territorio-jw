
  // 1) buscar user-info e preencher placeholders
  fetch('/user-info')
    .then(res => res.json())
    .then(data => {
      document.getElementById('welcome-name').textContent = data.username;
      document.getElementById('user-email').textContent  = data.email;
      document.getElementById('user-name').textContent = data.designacao;
    })
    .catch(console.error);

  // 2) dropdown toggle
  const profileEl = document.getElementById('profile');
  const btn        = document.getElementById('profileBtn');
  btn.addEventListener('click', () => {
    profileEl.classList.toggle('active');
  });
  // opcional: fechar ao clicar fora
  document.addEventListener('click', e => {
    if (!profileEl.contains(e.target)) profileEl.classList.remove('active');
  });

  // 3) logout via API e redirect
  document.getElementById('logoutBtn')
    .addEventListener('click', e => {
      e.preventDefault();
      fetch('/logout', { method: 'POST' })
        .then(() => location.href = '/')
        .catch(console.error);
    });

