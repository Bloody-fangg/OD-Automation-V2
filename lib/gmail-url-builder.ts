/**
 * Gmail Compose URL Builder
 * Generates a Gmail web compose URL with prefilled recipient, subject, and body.
 * Shows a warning if body exceeds 2000 characters (Gmail web draft limit).
 * Usage: openGmailDraft(subject, body, to)
 */

export function buildGmailComposeUrl({
  to = 'amiarchive.in@gmail.com',
  subject,
  body
}: {
  to?: string;
  subject: string;
  body: string;
}): { url: string; tooLong: boolean } {
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${encodedSubject}&body=${encodedBody}`;
  return {
    url,
    tooLong: body.length > 2000
  };
}
