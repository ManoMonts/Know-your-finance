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
          Supabase ainda não configurado. Adicione <strong>VITE_SUPABASE_URL</strong> e <strong>VITE_SUPABASE_PUBLISHABLE_KEY</strong> na Vercel para ativar login real.
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
      <small class="auth-note">Por enquanto, a análise do extrato continua acontecendo no navegador. O login será usado para salvar histórico, categorias e relatórios.</small>
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

async function handleAuthSubmit(form: HTMLFormElement) {
  const formData = new FormData(form);
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!isSupabaseConfigured || !supabase) {
    renderAuthModal('Configure as variáveis do Supabase na Vercel para ativar autenticação real.');
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

  renderAuthModal(
    currentMode === 'signin'
      ? 'Login realizado com sucesso.'
      : 'Conta criada. Verifique seu e-mail se a confirmação estiver ativa no Supabase.',
  );
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
