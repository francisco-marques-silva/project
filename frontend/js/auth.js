/**
 * Authentication handling for login page
 */
document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect
  if (localStorage.getItem('auth_token') && window.location.pathname === '/login') {
    window.location.href = '/portal';
    return;
  }

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const showRegister = document.getElementById('showRegister');
  const showLogin = document.getElementById('showLogin');
  const authError = document.getElementById('authError');

  if (showRegister) {
    showRegister.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
      authError.style.display = 'none';
    });
  }

  if (showLogin) {
    showLogin.addEventListener('click', (e) => {
      e.preventDefault();
      registerForm.style.display = 'none';
      loginForm.style.display = 'block';
      authError.style.display = 'none';
    });
  }

  // Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      authError.style.display = 'none';

      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;

      try {
        const result = await api.login(email, password);
        localStorage.setItem('auth_token', result.token);
        localStorage.setItem('user_name', result.user.username || result.user.email);
        localStorage.setItem('user_id', result.user.id);
        window.location.href = '/portal';
      } catch (error) {
        authError.textContent = error.message;
        authError.style.display = 'block';
      }
    });
  }

  // Register
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      authError.style.display = 'none';

      const data = {
        username: document.getElementById('regUsername').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        full_name: document.getElementById('regFullName').value,
        institution: document.getElementById('regInstitution').value
      };

      try {
        const result = await api.register(data);
        localStorage.setItem('auth_token', result.token);
        localStorage.setItem('user_name', result.user.username || result.user.email);
        localStorage.setItem('user_id', result.user.id);
        window.location.href = '/portal';
      } catch (error) {
        authError.textContent = error.message;
        authError.style.display = 'block';
      }
    });
  }
});
