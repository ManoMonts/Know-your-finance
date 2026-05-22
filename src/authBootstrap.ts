import { isSupabaseConfigured, supabase } from './lib/supabase';

type AuthMode = 'signin' | 'signup';

let modalElement: HTMLDivElement | null = null;
let currentMode: AuthMode = 'signin';

function getModalTitle() {
  return currentMode === 'signin' ? 'Entrar na sua conta' : 'Criar sua conta';
}

function getModalSubtitle() {
  return currentMode === 'signin'
    ? 'Acesse seu espaço financeiro para salvar análises e histórico futuramente.'
    : 'Crie uma conta para preparar o histórico mensal e as análises salvas.';
}

function getSubmitText() {
  return currentMode === 'signin' ? 'Entrar' : 'Criar conta';
}

function renderAuthModal(message = '') {
  if (!modalElement) return;

  modalElement.innerHTML = `
    <div class="auth-backdrop" data-auth-close="true"></div>
    <section class="auth-modal" role="dialog" aria-modal="true" aria-label="Autenticação">
      <button type="button" class="auth-close" data-auth-close="true" aria-label="Fechar">×</button>
      <div class="auth-kicker">Know Your Finance</div>
      <h2>${getModalTitle()}</h2>
      <p>${getModalSubtitle()}</p>

      <div class="auth-tabs">
        <button type="button" class="${currentMode === 'signin' ? 'active' : ''}" data-auth-mode="signin">Entrar</button>
        <button type="button" class="${currentMode === 'signup' ? 'active' : ''}" data-auth-mode="signup">Criar conta</button>
      </div>

      ${!isSupabaseConfigured ? `
        <div class="auth-warning">
          Login indisponível no momento. Confira a configuração do Supabase na Vercel.
        </div>
      ` : ''}

      <form class="auth-form">
        <label>
          <span>E-mail</span>
          <input type="email" name="email" autocomplete="email" placeholder="seuemail@exemplo.com" required />
        </label>
        <label>
          <span>Senha</span>
          <input type="password" name="password" autocomplete="${currentMode === 'signin' ? 'current-password' : 'new-password'}" placeholder="Mínimo 6 caracteres" required minlength="6" />
        </label>
        <button type="submit" class="auth-submit">${getSubmitText()}</button>
      </form>

      ${message ? `<div class="auth-message">${message}</div>` : ''}
      <small class="auth-note">A conta será usada para salvar histórico, categorias e relatórios.</small>
    </section>
  `;
}

function openAuthModal() {
  if (!modalElement) {
    modalElement = document.createElement('div');
    modalElement.className = 'auth-root';
    document.body.appendChild(modalElement);
  }

  document.body.classList.add('auth-open');
  renderAuthModal();
}

function closeAuthModal() {
  document.body.classList.remove('auth-open');
  modalElement?.remove();
  modalElement = null;
}

function goToAnalyzer() {
  const startButton = document.querySelector<HTMLButtonElement>('.landing-primary');
  if (startButton) startButton.click();

  window.setTimeout(() => {
    document.getElementById('analise')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 150);
}

async function handleAuthSubmit(form: HTMLFormElement) {
  const formData = new FormData(form);
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!isSupabaseConfigured || !supabase) {
    renderAuthModal('Login indisponível no momento. Confira a configuração do Supabase na Vercel.');
    return;
  }

  const submitButton = form.querySelector<HTMLButtonElement>('.auth-submit');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Processando...';
  }

  const response = currentMode === 'signin'
    ? await supabase.auth.signInWithPassword({ email, password })
    : await supabase.auth.signUp({ email, password });

  if (response.error) {
    renderAuthModal(response.error.message);
    return;
  }

  if (currentMode === 'signin') {
    closeAuthModal();
    goToAnalyzer();
    return;
  }

  renderAuthModal('Conta criada. Verifique seu e-mail se a confirmação estiver ativa no Supabase.');
}

function bindAuthEvents() {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (target.closest('.login-preview-button')) {
      event.preventDefault();
      openAuthModal();
      return;
    }

    if (target.dataset.authClose === 'true') {
      closeAuthModal();
      return;
    }

    const modeButton = target.closest<HTMLButtonElement>('[data-auth-mode]');
    if (modeButton) {
      currentMode = modeButton.dataset.authMode as AuthMode;
      renderAuthModal();
    }
  });

  document.addEventListener('submit', (event) => {
    const form = event.target as HTMLFormElement | null;
    if (!form?.classList.contains('auth-form')) return;

    event.preventDefault();
    void handleAuthSubmit(form);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modalElement) closeAuthModal();
  });
}

bindAuthEvents();
