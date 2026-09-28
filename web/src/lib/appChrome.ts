// Which routes show the app's navigation (retention plan R12 j). A visitor
// on the sign in and password pages is not a member yet: showing them Home,
// Cabinet, Journal and the rest promises screens they cannot open, and every
// link sends them straight back to /login. The middleware already redirects
// every other route to /login for a signed out visitor, so the route alone
// decides; no session lookup is needed and members never see a flash.
const NO_CHROME_ROUTES = ['/login', '/reset-password'];
const NO_CHROME_PREFIXES = ['/auth/'];

export function showsAppChrome(pathname: string | null | undefined): boolean {
  const path = pathname ?? '';
  if (NO_CHROME_ROUTES.includes(path)) return false;
  return !NO_CHROME_PREFIXES.some(prefix => path.startsWith(prefix));
}
