// src/services/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:     process.env.SMTP_HOST,
  port:     process.env.SMTP_PORT,
  secure:  false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendResetEmail(to, token) {
  const mailOptions = {
    from:    process.env.SMTP_FROM,
    to,
    subject: 'Código de recuperação de senha',
    text:    `Seu código de recuperação é: ${token}`,
    html:    `<p>Seu código de recuperação é: <strong>${token}</strong></p>`
  };
  await transporter.sendMail(mailOptions);
}

module.exports = {
  sendResetEmail
};
