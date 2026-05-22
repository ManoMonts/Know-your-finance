import { supabase } from './lib/supabase';

function closeAuthModal() {
  document.body.classList.remove('auth-open');
  document.querySelector('.auth-root')?.remove();
}

function openAnalyzerArea() {
  const startButton = document.querySelector<HTMLButtonElement>('.landing-primary');
  if (startButton) {
    startButton.click();
  }

  window.setTimeout(() => {
    document.getElementById('analise')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 200);
}

if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
      closeAuthModal();
      openAnalyzerArea();
    }
  });
}
