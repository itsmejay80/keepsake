import { createTransport } from "nodemailer";

import { getTracer, withSpan } from "@karakeep/shared-server";
import serverConfig from "@karakeep/shared/config";
import { escapeHtml } from "@karakeep/shared/utils/htmlUtils";

const tracer = getTracer("@karakeep/trpc");

function buildTransporter() {
  if (!serverConfig.email.smtp) {
    throw new Error("SMTP is not configured");
  }
  return createTransport({
    host: serverConfig.email.smtp.host,
    port: serverConfig.email.smtp.port,
    secure: serverConfig.email.smtp.secure,
    auth:
      serverConfig.email.smtp.user && serverConfig.email.smtp.password
        ? {
            user: serverConfig.email.smtp.user,
            pass: serverConfig.email.smtp.password,
          }
        : undefined,
  });
}

type Transporter = ReturnType<typeof buildTransporter>;

type Fn<Args extends unknown[] = unknown[]> = (
  transport: Transporter,
  ...args: Args
) => Promise<void>;

interface TracingOptions {
  silentFail?: boolean;
}

function withTracing<Args extends unknown[]>(
  name: string,
  fn: Fn<Args>,
  options: TracingOptions = {},
) {
  return async (...args: Args): Promise<void> => {
    if (options.silentFail && !serverConfig.email.smtp) {
      return;
    }
    const transporter = buildTransporter();
    await withSpan(tracer, name, {}, () => fn(transporter, ...args));
  };
}

export const sendVerificationEmail = withTracing(
  "sendVerificationEmail",
  async (
    transporter: Transporter,
    email: string,
    name: string,
    token: string,
    redirectUrl?: string,
  ) => {
    let verificationUrl = `${serverConfig.publicUrl}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    if (redirectUrl) {
      verificationUrl += `&redirectUrl=${encodeURIComponent(redirectUrl)}`;
    }

    const mailOptions = {
      from: serverConfig.email.smtp!.from,
      to: email,
      subject: "Verify your email address",
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your Keepsake library is almost ready, ${escapeHtml(name)}.</h2>
        <p>Confirm your email address to start saving the things you want to revisit:</p>
        <p>
          <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </p>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account with us, please ignore this email.</p>
      </div>
    `,
      text: `
Your Keepsake library is almost ready, ${name}.

Confirm your email address to start saving things you want to revisit:
${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account with us, please ignore this email.
    `,
    };

    await transporter.sendMail(mailOptions);
  },
);

export const sendInviteEmail = withTracing(
  "sendInviteEmail",
  async (
    transporter: Transporter,
    email: string,
    token: string,
    inviterName: string,
  ) => {
    const inviteUrl = `${serverConfig.publicUrl}/invite/${encodeURIComponent(token)}`;

    const mailOptions = {
      from: serverConfig.email.smtp!.from,
      to: email,
      subject: "An invitation to share in Keepsake",
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Make space for what you want to keep.</h2>
        <p>${escapeHtml(inviterName)} invited you to Keepsake, a place to save and revisit links, notes, and ideas together.</p>
        <p>Accept the invitation to create your account:</p>
        <p>
          <a href="${inviteUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Accept Invitation
          </a>
        </p>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p><a href="${inviteUrl}">${inviteUrl}</a></p>

        <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
      </div>
    `,
      text: `
You have an invitation to Keepsake.

${inviterName} invited you to a place to save and revisit links, notes, and ideas together.

Accept your invitation by visiting this link:
${inviteUrl}



If you weren't expecting this invitation, you can safely ignore this email.
    `,
    };

    await transporter.sendMail(mailOptions);
  },
);

export const sendPasswordResetEmail = withTracing(
  "sendPasswordResetEmail",
  async (
    transporter: Transporter,
    email: string,
    name: string,
    token: string,
  ) => {
    const resetUrl = `${serverConfig.publicUrl}/reset-password?token=${encodeURIComponent(token)}`;

    const mailOptions = {
      from: serverConfig.email.smtp!.from,
      to: email,
      subject: "Reset your password",
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset your Keepsake password</h2>
        <p>Hi ${escapeHtml(name)},</p>
        <p>Use the link below to get back to your saved library:</p>
        <p>
          <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
      </div>
    `,
      text: `
Hi ${name},

Use this link to reset your Keepsake password and get back to your saved library:
${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
    `,
    };

    await transporter.sendMail(mailOptions);
  },
);

export const sendListInvitationEmail = withTracing(
  "sendListInvitationEmail",
  async (
    transporter: Transporter,
    email: string,
    inviterName: string,
    listName: string,
    listId: string,
  ) => {
    const inviteUrl = `${serverConfig.publicUrl}/dashboard/lists?pendingInvitation=${encodeURIComponent(listId)}`;

    const mailOptions = {
      from: serverConfig.email.smtp!.from,
      to: email,
      subject: `${inviterName} invited you to collaborate on "${listName}"`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>A list is better when you can share it.</h2>
        <p>${escapeHtml(inviterName)} invited you to work together on <strong>"${escapeHtml(listName)}"</strong> in Keepsake.</p>
        <p>Click the link below to view and accept or decline the invitation:</p>
        <p>
          <a href="${inviteUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Invitation
          </a>
        </p>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p><a href="${inviteUrl}">${inviteUrl}</a></p>
        <p>You can accept or decline this invitation from your library.</p>
        <p>If you weren't expecting this invitation, you can safely ignore this email or decline it in your dashboard.</p>
      </div>
    `,
      text: `
You have an invitation to a shared list.

${inviterName} invited you to work together on "${listName}" in Keepsake.

View your invitation by visiting this link:
${inviteUrl}

You can accept or decline this invitation from your library.

If you weren't expecting this invitation, you can safely ignore this email or decline it in your dashboard.
    `,
    };

    await transporter.sendMail(mailOptions);
  },
  { silentFail: true },
);
