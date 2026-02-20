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

export const send2FACodeEmail = async (to: string, code: string) => {
  const mailOptions = {
    from: `"LumbaConnect" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Tu código de verificación de LumbaConnect',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Código de Verificación</h2>
        <p>Has solicitado iniciar sesión en LumbaConnect.</p>
        <p>Por favor, ingresa el siguiente código de 6 dígitos para continuar:</p>
        <div style="background-color: #f4f4f4; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; border-radius: 5px; margin: 20px 0;">
          ${code}
        </div>
        <p>Este código expirará en 10 minutos.</p>
        <p>Si no has solicitado este código, puedes ignorar este correo de forma segura.</p>
      </div>
    `,
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
  const mailOptions = {
    from: `"LumbaConnect" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Restablecimiento de Contraseña - LumbaConnect',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Restablecer Contraseña</h2>
        <p>Has solicitado restablecer tu contraseña en LumbaConnect. Haz clic en el siguiente enlace para elegir una nueva contraseña:</p>
        <div style="margin: 20px 0;">
          <a href="${resetUrl}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Restablecer Mi Contraseña
          </a>
        </div>
        <p>O copia y pega este enlace en tu navegador:</p>
        <p style="word-break: break-all; color: #0066cc;">${resetUrl}</p>
        <p>Este enlace expirará en 1 hora.</p>
        <p>Si no has solicitado restablecer tu contraseña, puedes ignorar este correo de forma segura.</p>
      </div>
    `,
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
