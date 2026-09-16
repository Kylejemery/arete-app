import { Redirect } from 'expo-router';

/**
 * The Scale of Happiness moved into the Garden, where it is an exhibit
 * wrapped in the shared exhibit template (see docs/garden/). This route is
 * kept so that nothing already pointing at /happiness-scale breaks: deep
 * links, notifications, and anything a build in the wild still carries.
 *
 * The screen that used to live here was a WebView over the Academy's
 * Playground page. The exhibit template now does that, from the row's
 * embed_url, so there is no second copy of it.
 */
export default function HappinessScaleRedirect() {
    return <Redirect href={'/garden/scale-of-happiness' as any} />;
}
