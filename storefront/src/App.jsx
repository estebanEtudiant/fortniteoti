import React, { useState, useEffect } from 'react';
import { I18nProvider } from './lib/i18n.jsx';
import { useRoute } from './lib/router.js';
import { useAuth } from './hooks/useAuth.js';
import { usePublicSettings } from './hooks/usePublicSettings.js';
import { useScrollProgress } from './hooks/useScrollProgress.js';
import { useScrollAnimations } from './hooks/useScrollAnimations.js';
import { usePageTitle } from './hooks/usePageTitle.js';
import { useExitIntent } from './hooks/useExitIntent.js';
import { api } from './lib/api.js';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import AnnouncementBanner from './components/AnnouncementBanner.jsx';
import ExitIntentPopup from './components/ExitIntentPopup.jsx';
import MaintenancePage from './pages/MaintenancePage.jsx';
import HomePage from './pages/HomePage.jsx';
import HowItWorksPage from './pages/HowItWorksPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import PaymentPage from './pages/PaymentPage.jsx';
import PaymentSuccessPage from './pages/PaymentSuccessPage.jsx';
import PaymentCancelPage from './pages/PaymentCancelPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import VerifyEmailSentPage from './pages/VerifyEmailSentPage.jsx';
import VerifyEmailPage from './pages/VerifyEmailPage.jsx';
import LegalPage from './pages/LegalPage.jsx';
import PrivacyPage from './pages/PrivacyPage.jsx';
import StatusPage from './pages/StatusPage.jsx';

export default function App() {
  const route = useRoute();
  const { customer, loading, login, register, logout, refresh } = useAuth();
  const publicSettings = usePublicSettings();
  const scrollProgress = useScrollProgress();
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [showExitIntent, setShowExitIntent] = useState(false);
  const showBanner = !!(publicSettings.announcement && !(publicSettings.announcementDismissible !== false && announcementDismissed));

  // Ajoute/retire la classe CSS sur body pour décaler le contenu sous la bannière
  useEffect(() => {
    document.body.classList.toggle('has-announcement', showBanner);
    return () => document.body.classList.remove('has-announcement');
  }, [showBanner]);
  useScrollAnimations(route);
  usePageTitle(route);
  useExitIntent(() => setShowExitIntent(true));

  // Track storefront pageviews for admin activity dashboard
  useEffect(() => { api.trackPageview(route); }, [route]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>Chargement...</p>
      </div>
    );
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
    <I18nProvider>
      <>
        {/* Scroll progress bar */}
        <div className="scroll-progress" style={{ width: `${scrollProgress}%` }} />

        <Header customer={customer} onLogout={logout} discordUrl={publicSettings.discordInviteUrl} />

        {/* Announcement banner */}
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

        {/* Page with fade-in transition */}
        <div key={route} className="page-transition">
          {page}
        </div>

        <Footer discordUrl={publicSettings.discordInviteUrl} />

        {/* Exit-intent popup */}
        {showExitIntent && (
          <ExitIntentPopup
            onClose={() => setShowExitIntent(false)}
            discordUrl={publicSettings.discordInviteUrl}
          />
        )}
      </>
    </I18nProvider>
  );
}
