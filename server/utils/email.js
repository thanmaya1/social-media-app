/* eslint-disable node/no-missing-require */
const logger = require('./logger');

let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  try {
    // require lazily so tests without nodemailer installed don't fail
    // npm install nodemailer in production or CI if real emails are needed
    // eslint-disable-next-line global-require
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } catch (e) {
    logger.warn('nodemailer not installed or failed to initialize; emails will be logged.');
    transporter = null;
  }
}

async function sendMail(opts) {
  const defaultFrom = process.env.EMAIL_FROM || 'no-reply@example.com';
  const mail = {
    from: opts.from || defaultFrom,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  };

  if (!transporter) {
    // fallback: log the email for development
    logger.info('Email (stub) would be sent:', { to: mail.to, subject: mail.subject });
    logger.debug('Email body:', { text: mail.text, html: mail.html });
    return true;
  }

  try {
    const res = await transporter.sendMail(mail);
    logger.info('Email sent', res && res.messageId);
    return res;
  } catch (err) {
    logger.error('Email send failed', err);
    throw err;
  }
}

module.exports = { sendMail };
