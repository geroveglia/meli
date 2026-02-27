import nodemailer from 'nodemailer';
import fs from 'fs';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const emailWrapper = (content: string) => `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin: 0; padding: 0; background-color: #f0f2f5; font-family: 'Segoe UI', Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f2f5; padding: 40px 20px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); padding: 40px 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
                <div style="font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: 1px;">
                  LumbaConnect
                </div>
                <div style="width: 50px; height: 3px; background: linear-gradient(90deg, #4facfe, #00f2fe); margin: 12px auto 0; border-radius: 2px;"></div>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="background-color: #ffffff; padding: 40px 40px 30px;">
                ${content}
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background-color: #fafbfc; padding: 24px 40px; border-radius: 0 0 16px 16px; border-top: 1px solid #e8ecf1;">
                <p style="margin: 0 0 8px; font-size: 12px; color: #8898aa; text-align: center; line-height: 1.6;">
                  Este es un correo automático de <strong>LumbaConnect</strong>. Por favor, no respondas a este mensaje.
                </p>
                <p style="margin: 0; font-size: 11px; color: #adb5bd; text-align: center;">
                  © ${new Date().getFullYear()} LumbaConnect. Todos los derechos reservados.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
`;

export const send2FACodeEmail = async (to: string, code: string) => {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 64px; height: 64px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); border-radius: 50%; line-height: 64px; font-size: 28px;">
        🛡️
      </div>
    </div>
    <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #1a1a2e; text-align: center;">
      Código de Verificación
    </h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #6c757d; text-align: center; line-height: 1.6;">
      Has solicitado iniciar sesión en <strong style="color: #1a1a2e;">LumbaConnect</strong>. Ingresá el siguiente código de 6 dígitos para continuar:
    </p>
    <div style="background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%); border: 2px dashed #4facfe; padding: 24px; font-size: 36px; font-weight: 800; text-align: center; letter-spacing: 12px; border-radius: 12px; margin: 0 0 24px; color: #1a1a2e; font-family: 'Courier New', monospace;">
      ${code}
    </div>
    <div style="background-color: #fff8e1; border-left: 4px solid #ffc107; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 13px; color: #856404;">
        ⏱️ Este código expirará en <strong>10 minutos</strong>.
      </p>
    </div>
    <p style="margin: 0; font-size: 13px; color: #adb5bd; text-align: center; line-height: 1.6;">
      Si no has solicitado este código, podés ignorar este correo de forma segura.
    </p>
  `;

  const mailOptions = {
    from: `"LumbaConnect" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Tu código de verificación de LumbaConnect',
    html: emailWrapper(content),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] 2FA code sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[Email] Error sending 2FA code to ${to}:`, error);
    return false;
  }
};

export const sendPasswordResetEmail = async (to: string, resetUrl: string) => {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 64px; height: 64px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); border-radius: 50%; line-height: 64px; font-size: 28px;">
        🔒
      </div>
    </div>
    <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #1a1a2e; text-align: center;">
      Restablecer Contraseña
    </h2>
    <p style="margin: 0 0 28px; font-size: 15px; color: #6c757d; text-align: center; line-height: 1.6;">
      Recibimos una solicitud para restablecer tu contraseña en <strong style="color: #1a1a2e;">LumbaConnect</strong>. Hacé clic en el botón de abajo para elegir una nueva contraseña:
    </p>
    <div style="text-align: center; margin: 0 0 28px;">
      <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 15px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(79, 172, 254, 0.4);">
        Restablecer Mi Contraseña
      </a>
    </div>
    <div style="border-top: 1px solid #e8ecf1; padding-top: 20px; margin-bottom: 20px;">
      <p style="margin: 0 0 8px; font-size: 13px; color: #8898aa;">
        O copiá y pegá este enlace en tu navegador:
      </p>
      <p style="margin: 0; font-size: 13px; word-break: break-all; color: #4facfe; background-color: #f8f9ff; padding: 12px; border-radius: 8px; line-height: 1.5;">
        ${resetUrl}
      </p>
    </div>
    <div style="background-color: #fff8e1; border-left: 4px solid #ffc107; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 13px; color: #856404;">
        ⏱️ Este enlace expirará en <strong>1 hora</strong>.
      </p>
    </div>
    <p style="margin: 0; font-size: 13px; color: #adb5bd; text-align: center; line-height: 1.6;">
      Si no has solicitado restablecer tu contraseña, podés ignorar este correo de forma segura.
    </p>
  `;

  const mailOptions = {
    from: `"LumbaConnect" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Restablecimiento de Contraseña - LumbaConnect',
    html: emailWrapper(content),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Password reset link sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`[Email] Error sending password reset link to ${to}:`, error);
    fs.writeFileSync('nodemailer_error.json', JSON.stringify({ message: error.message, stack: error.stack, code: error.code }));
    return false;
  }
};

export const sendClientWelcomeEmail = async (to: string, name: string, tempPassword: string) => {
  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173/login';

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 64px; height: 64px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); border-radius: 50%; line-height: 64px; font-size: 28px;">
        👋
      </div>
    </div>
    <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #1a1a2e; text-align: center;">
      ¡Hola ${name}!
    </h2>
    <p style="margin: 0 0 16px; font-size: 15px; color: #6c757d; text-align: center; line-height: 1.6;">
      Te damos la bienvenida a <strong style="color: #1a1a2e;">LumbaConnect</strong>. Tu cuenta ha sido creada exitosamente.
    </p>
    <p style="margin: 0 0 24px; font-size: 15px; color: #6c757d; text-align: center; line-height: 1.6;">
      Puedes iniciar sesión usando tu correo electrónico (${to}) y la siguiente contraseña temporal:
    </p>
    <div style="background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%); border: 2px dashed #4facfe; padding: 16px; font-size: 24px; font-weight: 800; text-align: center; letter-spacing: 4px; border-radius: 12px; margin: 0 0 24px; color: #1a1a2e; font-family: 'Courier New', monospace;">
      ${tempPassword}
    </div>
    <div style="text-align: center; margin: 0 0 28px;">
      <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 15px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(79, 172, 254, 0.4);">
        Iniciar Sesión
      </a>
    </div>
    <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 13px; color: #0d47a1;">
        ℹ️ Te recomendamos cambiar esta contraseña desde tu perfil una vez que hayas iniciado sesión.
      </p>
    </div>
  `;

  const mailOptions = {
    from: `"LumbaConnect" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Bienvenido a LumbaConnect - Tus credenciales de acceso',
    html: emailWrapper(content),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Welcome email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`[Email] Error sending welcome email to ${to}:`, error);
    fs.writeFileSync('nodemailer_error.json', JSON.stringify({ message: error.message, stack: error.stack, code: error.code }));
    return false;
  }
};

export const sendTenantWelcomeEmail = async (to: string, name: string, tenantName: string, tempPassword: string) => {
  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173/login';

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 64px; height: 64px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); border-radius: 50%; line-height: 64px; font-size: 28px;">
        🚀
      </div>
    </div>
    <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #1a1a2e; text-align: center;">
      ¡Bienvenido a LumbaConnect, ${name}!
    </h2>
    <p style="margin: 0 0 16px; font-size: 15px; color: #6c757d; text-align: center; line-height: 1.6;">
      Tu organización <strong style="color: #1a1a2e;">${tenantName}</strong> ha sido configurada exitosamente y está lista para ser utilizada.
    </p>
    <p style="margin: 0 0 24px; font-size: 15px; color: #6c757d; text-align: center; line-height: 1.6;">
      Puedes iniciar sesión como <strong>Administrador</strong> usando tu correo electrónico (${to}) y esta contraseña temporal:
    </p>
    <div style="background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%); border: 2px dashed #4facfe; padding: 16px; font-size: 24px; font-weight: 800; text-align: center; letter-spacing: 4px; border-radius: 12px; margin: 0 0 24px; color: #1a1a2e; font-family: 'Courier New', monospace;">
      ${tempPassword}
    </div>
    <div style="text-align: center; margin: 0 0 28px;">
      <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 15px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(79, 172, 254, 0.4);">
        Ir a Mi Panel de Control
      </a>
    </div>
    <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 13px; color: #0d47a1;">
        ℹ️ Por motivos de seguridad, te recomendamos cambiar esta contraseña por una definitiva tras iniciar sesión.
      </p>
    </div>
  `;

  const mailOptions = {
    from: `"LumbaConnect" <${process.env.SMTP_USER}>`,
    to,
    subject: `Bienvenido a LumbaConnect - Tus accesos para ${tenantName}`,
    html: emailWrapper(content),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Tenant Welcome email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`[Email] Error sending tenant welcome email to ${to}:`, error);
    fs.writeFileSync('nodemailer_error.json', JSON.stringify({ message: error.message, stack: error.stack, code: error.code }));
    return false;
  }
};

