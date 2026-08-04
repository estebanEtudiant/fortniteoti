import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

type Brand = 'ftn' | 'ng' | 'shop' | 'pokemon';

interface BrandConfig {
  name: string;
  color: string;
  textColor: string;
  from: string;
}

const BRANDS: Record<Brand, BrandConfig> = {
  ftn: {
    name: '404Tweaks',
    color: '#00d4ff',
    textColor: '#000',
    from: '404 Tweaks <404tweakscontact@gmail.com>',
  },
  ng: {
    name: '404 Client',
    color: '#8B5CF6',
    textColor: '#fff',
    from: '404 Client <404tweakscontact@gmail.com>',
  },
  shop: {
    name: '404 GG',
    color: '#ff7a18',
    textColor: '#000',
    from: '404 GG <404tweakscontact@gmail.com>',
  },
  pokemon: {
    name: '404 GG — Pokemon',
    color: '#FFCB05',
    textColor: '#000',
    from: '404 GG <404tweakscontact@gmail.com>',
  },
};

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('mail.host', 'smtp.gmail.com'),
      port: config.get<number>('mail.port', 587),
      secure: config.get<number>('mail.port', 587) === 465,
      auth: {
        user: config.get<string>('mail.user', ''),
        pass: config.get<string>('mail.pass', ''),
      },
    });
  }

  private header(b: BrandConfig) {
    return `
      <tr>
        <td style="background:#111;padding:32px 40px;border-bottom:1px solid #222;text-align:center;">
          <h1 style="margin:0;color:${b.color};font-size:22px;letter-spacing:2px;text-transform:uppercase;">
            ${b.name}
          </h1>
        </td>
      </tr>`;
  }

  private footer(b: BrandConfig) {
    return `
      <tr>
        <td style="padding:20px 40px;border-top:1px solid #222;text-align:center;">
          <p style="color:#444;margin:0;font-size:12px;">
            &copy; 2026 ${b.name} — Ce message est automatique, ne pas repondre.
          </p>
        </td>
      </tr>`;
  }

  private wrap(body: string) {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;border-radius:12px;overflow:hidden;">
        ${body}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  async sendEmailVerification(email: string, verifyUrl: string, brand: Brand = 'ftn'): Promise<void> {
    const b = BRANDS[brand];
    const html = this.wrap(`
      ${this.header(b)}
      <tr>
        <td style="padding:40px;">
          <h2 style="color:#fff;margin:0 0 16px;font-size:20px;">Verification de ton adresse email</h2>
          <p style="color:#aaa;margin:0 0 24px;line-height:1.7;font-size:15px;">
            Merci de t'etre inscrit sur ${b.name} ! Clique sur le bouton ci-dessous pour valider
            ton adresse email et acceder a l'achat.
          </p>
          <p style="color:#aaa;margin:0 0 32px;line-height:1.7;font-size:15px;">
            Ce lien est valable <strong style="color:#fff;">24 heures</strong>.
          </p>
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="center">
                <a href="${verifyUrl}" style="display:inline-block;background:${b.color};color:${b.textColor};font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;">
                  Verifier mon email
                </a>
              </td>
            </tr>
          </table>
          <p style="color:#555;margin:32px 0 0;font-size:12px;word-break:break-all;">
            Ou copie ce lien dans ton navigateur :<br>
            <span style="color:#777;">${verifyUrl}</span>
          </p>
        </td>
      </tr>
      ${this.footer(b)}`);

    await this.transporter.sendMail({
      from: b.from,
      to: email,
      subject: `Verifiez votre adresse email — ${b.name}`,
      html,
    });

    this.logger.log(`Verification email [${brand}] sent to ${email}`);
  }

  async sendPasswordReset(email: string, resetUrl: string, brand: Brand = 'ftn'): Promise<void> {
    const b = BRANDS[brand];
    const html = this.wrap(`
      ${this.header(b)}
      <tr>
        <td style="padding:40px;">
          <h2 style="color:#fff;margin:0 0 16px;font-size:20px;">Reinitialisation du mot de passe</h2>
          <p style="color:#aaa;margin:0 0 24px;line-height:1.7;font-size:15px;">
            Tu as demande a reinitialiser ton mot de passe sur ${b.name}. Clique sur le bouton ci-dessous pour en choisir un nouveau.
          </p>
          <p style="color:#aaa;margin:0 0 32px;line-height:1.7;font-size:15px;">
            Ce lien est valable <strong style="color:#fff;">1 heure</strong>. Si tu n'es pas a l'origine de cette demande, ignore cet email.
          </p>
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="center">
                <a href="${resetUrl}" style="display:inline-block;background:${b.color};color:${b.textColor};font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;">
                  Reinitialiser mon mot de passe
                </a>
              </td>
            </tr>
          </table>
          <p style="color:#555;margin:32px 0 0;font-size:12px;word-break:break-all;">
            Ou copie ce lien dans ton navigateur :<br>
            <span style="color:#777;">${resetUrl}</span>
          </p>
        </td>
      </tr>
      ${this.footer(b)}`);

    await this.transporter.sendMail({
      from: b.from,
      to: email,
      subject: `Reinitialisation de votre mot de passe — ${b.name}`,
      html,
    });

    this.logger.log(`Password reset email [${brand}] sent to ${email}`);
  }

  async sendLicenseKey(
    email: string,
    licenseKey: string,
    planName: string,
    profileUrl: string,
    brand: Brand = 'ftn',
  ): Promise<void> {
    const b = BRANDS[brand];

    const features = brand === 'ng'
      ? `<p style="color:#ddd;margin:4px 0;font-size:14px;">&#10003;&nbsp; Client NationsGlory optimise</p>
         <p style="color:#ddd;margin:4px 0;font-size:14px;">&#10003;&nbsp; Modules et fonctionnalites exclusives</p>
         <p style="color:#ddd;margin:4px 0;font-size:14px;">&#10003;&nbsp; Acces Discord 404 Client</p>
         <p style="color:#ddd;margin:4px 0;font-size:14px;">&#10003;&nbsp; Mises a jour gratuites</p>
         <p style="color:#ddd;margin:4px 0;font-size:14px;">&#10003;&nbsp; Support technique direct</p>`
      : brand === 'shop'
      ? `<p style="color:#ddd;margin:4px 0;font-size:14px;">&#10003;&nbsp; Acces complet au cheat</p>
         <p style="color:#ddd;margin:4px 0;font-size:14px;">&#10003;&nbsp; Nouveaux modules chaque patch</p>
         <p style="color:#ddd;margin:4px 0;font-size:14px;">&#10003;&nbsp; Canal prive Discord</p>
         <p style="color:#ddd;margin:4px 0;font-size:14px;">&#10003;&nbsp; Priorite support</p>
         <p style="color:#ddd;margin:4px 0;font-size:14px;">&#10003;&nbsp; Loader securise</p>`
      : `<p style="color:#ddd;margin:4px 0;font-size:14px;">&#10003;&nbsp; Plusieurs macros</p>
         <p style="color:#ddd;margin:4px 0;font-size:14px;">&#10003;&nbsp; Logiciel d'optimisation</p>
         <p style="color:#ddd;margin:4px 0;font-size:14px;">&#10003;&nbsp; Acces Discord VIP prive</p>
         <p style="color:#ddd;margin:4px 0;font-size:14px;">&#10003;&nbsp; Mises a jour gratuites</p>
         <p style="color:#ddd;margin:4px 0;font-size:14px;">&#10003;&nbsp; Support technique direct</p>`;

    const html = this.wrap(`
      ${this.header(b)}
      <tr>
        <td style="padding:40px;">
          <h2 style="color:#fff;margin:0 0 8px;font-size:22px;">Paiement confirme ! &#127881;</h2>
          <p style="color:#aaa;margin:0 0 28px;line-height:1.7;font-size:15px;">
            Merci pour ton achat <strong style="color:#fff;">${b.name} — ${planName}</strong>.<br>
            Voici ta cle de licence personnelle. Conserve-la precieusement.
          </p>
          <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
            <tr>
              <td style="background:#0a0a0a;border:1px solid ${b.color};border-radius:8px;padding:18px 20px;">
                <p style="color:#aaa;font-size:11px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.08em;">Ta cle de licence</p>
                <p style="color:${b.color};font-family:'Courier New',monospace;font-size:16px;font-weight:700;letter-spacing:0.12em;margin:0;word-break:break-all;">
                  ${licenseKey}
                </p>
              </td>
            </tr>
          </table>
          <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
            <tr>
              <td style="background:#161616;border:1px solid #222;border-radius:8px;padding:16px 20px;">
                <p style="color:#aaa;font-size:11px;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.08em;">Inclus avec ton achat</p>
                ${features}
              </td>
            </tr>
          </table>
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="center">
                <a href="${profileUrl}" style="display:inline-block;background:${b.color};color:${b.textColor};font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;">
                  Acceder a mon profil
                </a>
              </td>
            </tr>
          </table>
          <p style="color:#555;margin:28px 0 0;font-size:12px;line-height:1.6;">
            Ta cle et le lien de telechargement sont aussi disponibles dans ton profil a tout moment.<br>
            En cas de probleme, contacte notre support.
          </p>
        </td>
      </tr>
      ${this.footer(b)}`);

    await this.transporter.sendMail({
      from: b.from,
      to: email,
      subject: `Votre cle de licence ${b.name} — ${planName}`,
      html,
    });

    this.logger.log(`License key email [${brand}] sent to ${email}`);
  }

  async sendPokemonOrderConfirmation(
    email: string,
    orderSummary: string,
    profileUrl: string,
  ): Promise<void> {
    const b = BRANDS.pokemon;
    const html = this.wrap(`
      ${this.header(b)}
      <tr>
        <td style="padding:40px;">
          <h2 style="color:#fff;margin:0 0 8px;font-size:22px;">Commande confirmee ! &#127881;</h2>
          <p style="color:#aaa;margin:0 0 24px;line-height:1.7;font-size:15px;">
            Merci pour ta commande <strong style="color:#fff;">${orderSummary}</strong>.<br>
            Ton kit de renovation de cartes va etre prepare et expedie sous peu.
          </p>
          <p style="color:#aaa;margin:0 0 28px;line-height:1.7;font-size:15px;">
            Tu recevras un email avec ton numero de suivi des que le colis part de notre entrepot.
          </p>
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="center">
                <a href="${profileUrl}" style="display:inline-block;background:${b.color};color:${b.textColor};font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;">
                  Suivre ma commande
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      ${this.footer(b)}`);

    await this.transporter.sendMail({
      from: b.from,
      to: email,
      subject: `Confirmation de commande — ${b.name}`,
      html,
    });

    this.logger.log(`Pokemon order confirmation email sent to ${email}`);
  }

  async sendShippingNotice(
    email: string,
    trackingNumber: string,
    trackingUrl?: string,
    carrier?: string,
  ): Promise<void> {
    const b = BRANDS.pokemon;
    const html = this.wrap(`
      ${this.header(b)}
      <tr>
        <td style="padding:40px;">
          <h2 style="color:#fff;margin:0 0 8px;font-size:22px;">Ton colis est en route ! &#128230;</h2>
          <p style="color:#aaa;margin:0 0 24px;line-height:1.7;font-size:15px;">
            Bonne nouvelle, ton kit de renovation de cartes vient d'etre expedie${carrier ? ` via ${carrier}` : ''}.
          </p>
          <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
            <tr>
              <td style="background:#0a0a0a;border:1px solid ${b.color};border-radius:8px;padding:18px 20px;">
                <p style="color:#aaa;font-size:11px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.08em;">Numero de suivi</p>
                <p style="color:${b.color};font-family:'Courier New',monospace;font-size:16px;font-weight:700;letter-spacing:0.12em;margin:0;word-break:break-all;">
                  ${trackingNumber}
                </p>
              </td>
            </tr>
          </table>
          ${trackingUrl ? `
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="center">
                <a href="${trackingUrl}" style="display:inline-block;background:${b.color};color:${b.textColor};font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;">
                  Suivre le colis
                </a>
              </td>
            </tr>
          </table>` : ''}
        </td>
      </tr>
      ${this.footer(b)}`);

    await this.transporter.sendMail({
      from: b.from,
      to: email,
      subject: `Ta commande a ete expediee — ${b.name}`,
      html,
    });

    this.logger.log(`Shipping notice email sent to ${email}`);
  }
}
