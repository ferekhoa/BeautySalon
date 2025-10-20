// src/utils/gmail.js
export function gmailComposeURL({ to, subject, body, bcc }) {
    const p = new URLSearchParams();
    if (to) p.set("to", to);
    if (subject) p.set("su", subject);
    if (body) p.set("body", body);
    if (bcc) p.set("bcc", bcc);
    // If you use multiple Google accounts, open this link in a browser profile
    // where the owner account is the *only* signed-in account.
    return `https://mail.google.com/mail/?view=cm&fs=1&${p.toString()}`;
}
