import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private from: string;
  private readonly logger = new Logger(MailService.name);

  constructor(private config: ConfigService) {
    this.from = config.get<string>('mail.from', '404Tweaks <noreply@fortnite.opti>');
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

  async sendEmailVerification(email: string, verifyUrl: string): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:#111;padding:32px 40px;border-bottom:1px solid #222;text-align:center;">
            <h1 style="margin:0;color:#00d4ff;font-size:22px;letter-spacing:2px;text-transform:uppercase;">
              404Tweaks
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#fff;margin:0 0 16px;font-size:20px;">
              Verification de ton adresse email
            </h2>
            <p style="color:#aaa;margin:0 0 24px;line-height:1.7;font-size:15px;">
              Merci de t'etre inscrit sur 404Tweaks ! Clique sur le bouton ci-dessous pour valider ton adresse email et acceder a l'achat.
            </p>
            <p style="color:#aaa;margin:0 0 32px;line-height:1.7;font-size:15px;">
              Ce lien est valable <strong style="color:#fff;">24 heures</strong>.
            </p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center">
                  <a href="${verifyUrl}" style="display:inline-block;background:#00d4ff;color:#000;font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;">
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
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #222;text-align:center;">
            <p style="color:#444;margin:0;font-size:12px;">
              &copy; 2026 404Tweaks — Ce message est automatique, ne pas repondre.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: 'Verifiez votre adresse email — 404Tweaks',
      html,
    });

    this.logger.log(`Verification email sent to ${email}`);
  }

  async sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;border-radius:12px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#111;padding:32px 40px;border-bottom:1px solid #222;text-align:center;">
            <h1 style="margin:0;color:#00d4ff;font-size:22px;letter-spacing:2px;text-transform:uppercase;">
              404Tweaks
            </h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#fff;margin:0 0 16px;font-size:20px;">
              Reinitialisation du mot de passe
            </h2>
            <p style="color:#aaa;margin:0 0 24px;line-height:1.7;font-size:15px;">
              Tu as demande a reinitialiser ton mot de passe. Clique sur le bouton ci-dessous pour en choisir un nouveau.
            </p>
            <p style="color:#aaa;margin:0 0 32px;line-height:1.7;font-size:15px;">
              Ce lien est valable <strong style="color:#fff;">1 heure</strong>. Si tu n'es pas a l'origine de cette demande, ignore cet email.
            </p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center">
                  <a href="${resetUrl}" style="display:inline-block;background:#00d4ff;color:#000;font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;">
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

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #222;text-align:center;">
            <p style="color:#444;margin:0;font-size:12px;">
              &copy; 2026 404Tweaks — Ce message est automatique, ne pas repondre.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: 'Reinitialisation de votre mot de passe — 404Tweaks',
      html,
    });

    this.logger.log(`Password reset email sent to ${email}`);
  }

  async sendLicenseKey(email: string, licenseKey: string, planName: string, profileUrl: string): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;border-radius:12px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#111;padding:32px 40px;border-bottom:1px solid #222;text-align:center;">
            <h1 style="margin:0;color:#00d4ff;font-size:22px;letter-spacing:2px;text-transform:uppercase;">
              404Tweaks
            </h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#fff;margin:0 0 8px;font-size:22px;">
              Paiement confirme ! &#127881;
            </h2>
            <p style="color:#aaa;margin:0 0 28px;line-height:1.7;font-size:15px;">
              Merci pour ton achat <strong style="color:#fff;">404Tweaks — ${planName}</strong>.<br>
              Voici ta cle de licence personnelle. Conserve-la precieusement.
            </p>

            <!-- License key box -->
            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
              <tr>
                <td style="background:#0a0a0a;border:1px solid #00d4ff;border-radius:8px;padding:18px 20px;">
                  <p style="color:#aaa;font-size:11px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.08em;">
                    Ta cle de licence
                  </p>
                  <p style="color:#00d4ff;font-family:'Courier New',monospace;font-size:16px;font-weight:700;letter-spacing:0.12em;margin:0;word-break:break-all;">
                    ${licenseKey}
                  </p>
                </td>
              </tr>
            </table>

            <!-- What's included -->
            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
              <tr>
                <td style="background:#161616;border:1px solid #222;border-radius:8px;padding:16px 20px;">
                  <p style="color:#aaa;font-size:11px;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.08em;">Inclus avec ton achat</p>
                  <p style="color:#ddd;margin:4px 0;font-size:14px;">&#10003;&nbsp; Plusieur macros</p>
                  <p style="color:#ddd;margin:4px 0;font-size:14px;">&#10003;&nbsp; Logiciel d'optimisation</p>
                  <p style="color:#ddd;margin:4px 0;font-size:14px;">&#10003;&nbsp; Acces Discord VIP prive</p>
                  <p style="color:#ddd;margin:4px 0;font-size:14px;">&#10003;&nbsp; Mises a jour gratuites</p>
                  <p style="color:#ddd;margin:4px 0;font-size:14px;">&#10003;&nbsp; Support technique direct</p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center">
                  <a href="${profileUrl}" style="display:inline-block;background:#00d4ff;color:#000;font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;">
                    Acceder a mon profil &amp; telecharger
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

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #222;text-align:center;">
            <p style="color:#444;margin:0;font-size:12px;">
              &copy; 2026 404Tweaks — Ce message est automatique, ne pas repondre.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: `Votre cle de licence 404Tweaks — ${planName}`,
      html,
    });

    this.logger.log(`License key email sent to ${email}`);
  }
}