import React, { useEffect, useState } from 'react';
import { I18nProvider, useTranslation } from './lib/i18n.jsx';
import { useRoute } from './lib/router.js';
import { useAuth } from './hooks/useAuth.js';
import { usePublicSettings } from './hooks/usePublicSettings.js';
import { useScrollProgress } from './hooks/useScrollProgress.js';
import { useScrollAnimations } from './hooks/useScrollAnimations.js';
import { usePageTitle } from './hooks/usePageTitle.js';
import { useExitIntent } from './hooks/useExitIntent.js';
import { api } from './lib/api.js';
import AnnouncementBanner from './components/AnnouncementBanner.jsx';
import ExitIntentPopup from './components/ExitIntentPopup.jsx';
import Footer from './components/Footer.jsx';
import Header from './components/Header.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import HomePage from './pages/HomePage.jsx';
import HowItWorksPage from './pages/HowItWorksPage.jsx';
import LegalPage from './pages/LegalPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MaintenancePage from './pages/MaintenancePage.jsx';
import PaymentCancelPage from './pages/PaymentCancelPage.jsx';
import PaymentPage from './pages/PaymentPage.jsx';
import PaymentSuccessPage from './pages/PaymentSuccessPage.jsx';
import MenoriaPage from './pages/MenoriaPage.jsx';
import PokemonPage from './pages/PokemonPage.jsx';
import PokemonLoginPage from './pages/PokemonLoginPage.jsx';
import PokemonRegisterPage from './pages/PokemonRegisterPage.jsx';
import PokemonAccountPage from './pages/PokemonAccountPage.jsx';
import PokemonLegalPage from './pages/PokemonLegalPage.jsx';
import MenoriaPaymentPage from './pages/MenoriaPaymentPage.jsx';
import PrivacyPage from './pages/PrivacyPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import StatusPage from './pages/StatusPage.jsx';
import VerifyEmailPage from './pages/VerifyEmailPage.jsx';
import VerifyEmailSentPage from './pages/VerifyEmailSentPage.jsx';

function AppContent() {
  const route = useRoute();
  const { customer, loading, login, register, logout, refresh } = useAuth();
  const publicSettings = usePublicSettings();
  const scrollProgress = useScrollProgress();
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [showExitIntent, setShowExitIntent] = useState(false);
  const { t } = useTranslation();

  const showBanner = !!(
    publicSettings.announcement
    && !(publicSettings.announcementDismissible !== false && announcementDismissed)
  );

  useEffect(() => {
    document.body.classList.toggle('has-announcement', showBanner);
    return () => document.body.classList.remove('has-announcement');
  }, [showBanner]);

  useScrollAnimations(route);
  usePageTitle(route);
  useExitIntent(() => setShowExitIntent(true));

  useEffect(() => {
    api.trackPageview(route);
  }, [route]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>{t('common.loading')}</p>
      </div>
    );
  }

  // Mini-site totalement à part (CardRevive) : sa propre DA, son propre routing,
  // pas de header/footer/bannière 404Tweaks.
  if (route.startsWith('/pokemon')) {
    switch (route) {
      case '/pokemon/login':
        return customer ? <PokemonAccountPage customer={customer} onLogout={logout} /> : <PokemonLoginPage onLogin={login} />;
      case '/pokemon/register':
        return customer ? <PokemonAccountPage customer={customer} onLogout={logout} /> : <PokemonRegisterPage onRegister={register} />;
      case '/pokemon/account':
        return customer ? <PokemonAccountPage customer={customer} onLogout={logout} /> : <PokemonLoginPage onLogin={login} />;
      case '/pokemon/legal':
        return <PokemonLegalPage customer={customer} onLogout={logout} />;
      default:
        return <PokemonPage customer={customer} onLogout={logout} />;
    }
  }

  if (publicSettings.maintenanceMode && !customer?.isAdmin) {
    return <MaintenancePage discordUrl={publicSettings.discordInviteUrl} />;
  }

  let page;
  switch (route) {
    case '/login':
      page = customer ? <ProfilePage customer={customer} onLogout={logout} onRefresh={refresh} /> : <LoginPage onLogin={login} />;
      break;
    case '/register':
      page = customer ? <ProfilePage customer={customer} onLogout={logout} onRefresh={refresh} /> : <RegisterPage onRegister={register} />;
      break;
    case '/profile':
      page = customer ? <ProfilePage customer={customer} onLogout={logout} onRefresh={refresh} /> : <LoginPage onLogin={login} />;
      break;
    case '/payment':
      page = customer ? <PaymentPage customer={customer} /> : <LoginPage onLogin={login} />;
      break;
    case '/menoria':
      page = <MenoriaPage customer={customer} />;
      break;
    case '/menoria/payment':
      page = customer ? <MenoriaPaymentPage customer={customer} /> : <LoginPage onLogin={login} />;
      break;
    case '/payment/success':
      page = <PaymentSuccessPage />;
      break;
    case '/payment/cancel':
      page = <PaymentCancelPage />;
      break;
    case '/forgot-password':
      page = <ForgotPasswordPage />;
      break;
    case '/reset-password':
      page = <ResetPasswordPage />;
      break;
    case '/verify-email-sent':
      page = <VerifyEmailSentPage customer={customer} />;
      break;
    case '/verify-email':
      page = <VerifyEmailPage onRefresh={refresh} />;
      break;
    case '/comment-ca-marche':
      page = <HowItWorksPage />;
      break;
    case '/legal':
      page = <LegalPage />;
      break;
    case '/privacy':
      page = <PrivacyPage />;
      break;
    case '/status':
      page = <StatusPage />;
      break;
    default:
      page = <HomePage customer={customer} screenshotUrl={publicSettings.screenshotUrl} screenshotUrls={publicSettings.screenshotUrls} />;
  }

  return (
    <>
      <div className="scroll-progress" style={{ width: `${scrollProgress}%` }} />

      <Header customer={customer} onLogout={logout} discordUrl={publicSettings.discordInviteUrl} />

      {showBanner && (
        <AnnouncementBanner
          message={publicSettings.announcement}
          color={publicSettings.announcementColor}
          icon={publicSettings.announcementIcon}
          label={publicSettings.announcementLabel}
          dismissible={publicSettings.announcementDismissible}
          link={publicSettings.announcementLink}
          linkText={publicSettings.announcementLinkText}
          onDismiss={() => setAnnouncementDismissed(true)}
        />
      )}

      <div key={route} className="page-transition">
        {page}
      </div>

      <Footer discordUrl={publicSettings.discordInviteUrl} />

      {showExitIntent && (
        <ExitIntentPopup
          onClose={() => setShowExitIntent(false)}
          discordUrl={publicSettings.discordInviteUrl}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
