# Cerebero Privacy Policy

Last updated: August 14, 2026

Cerebero is a private library for links and Markdown notes. This policy covers
the Cerebero website, API, and Chrome extension.

## Data Cerebero handles

Cerebero handles only the data needed to provide the product:

- Google account information used to identify your Cerebero account, including
  your email address and the public name or profile image Google provides;
- links, authored titles, Markdown notes, tags, and other library state that you
  choose to save;
- authentication and scoped extension-session records; and
- operational security information such as session creation, expiry, and last
  use timestamps.

The Chrome extension reads the current page URL and title only when you open its
popup or explicitly choose **Save to Cerebero** from Chrome's page context menu.
It does not read the page body, browsing history, bookmarks, form data, or other
tabs. An authored title or note is sent only when you confirm Capture in the
popup.

## Google and extension authentication

The website uses Google OAuth through Better Auth. The Chrome extension uses
Chrome Identity with Google's email-only scope so it can connect the same Google
account to Cerebero.

During extension sign-in, Chrome supplies a temporary Google access token. The
extension sends that token to the Cerebero API over HTTPS for verification and
then removes it from Chrome's token cache on a best-effort basis. Cerebero does
not write the Google access token to extension storage.

After verification, the API issues a Cerebero extension session limited to
creating Items and checking for duplicates. The extension stores that scoped
session and basic account display information in Chrome local extension storage.
The stored data is unavailable to ordinary web pages and content scripts. It is
removed from the extension when you sign out or uninstall it; the server-side
session is revoked on sign-out or expires after thirty days.

If a signed-out user invokes the context-menu action, the extension keeps one
pending page URL and title locally so the user can sign in, review it, and
explicitly confirm Capture. A newer pending Capture replaces the older one.

## How data is used and shared

Data is used only to authenticate you, provide your private Cerebero Library,
detect duplicate links, perform Captures you request, and maintain service
security. Cerebero does not sell personal data, use it for advertising, or share
it with data brokers.

Cerebero's use of information received from Google APIs follows the Chrome Web
Store User Data Policy, including its Limited Use requirements. User data is not
transferred except as necessary to provide Cerebero, comply with applicable law,
or protect the service and its users. Humans do not read private library data
unless you give specific consent for support, access is required for security or
legal reasons, or the data has been aggregated and anonymized for internal
operations.

Public Share Links are optional. When you create one, anyone with the link can
read the deliberately limited, read-only projection of that Item until you
revoke the link.

## Control and deletion

You can sign out of the Chrome extension to revoke its session and clear its
local authentication data. You can delete your Cerebero account from Settings;
this removes the account and its owned Items, Tags, Share Links, sessions, and
related records. Uninstalling the extension clears its local Chrome storage but
does not delete your Cerebero account.

## Contact

Questions about this policy can be sent to
[thatcoderguyshubham@gmail.com](mailto:thatcoderguyshubham@gmail.com).
