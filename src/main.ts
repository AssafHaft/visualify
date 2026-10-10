import { isDesktop } from "./platform";
import { createApp } from "@wearesage/vue";
import * as generatedRoutes from "./routes.generated";
import App from "./App.vue";

// GitHub Pages serves the web version under a sub-path (/visualify/) that the Sage router knows nothing about: match
// routes without it, and keep page changes in memory rather than in the address bar, so a reload lands on the real URL.
// ponytail: so Back leaves the app instead of stepping through pages; prefix the base in pushState and add a 404.html
// fallback if pages ever need their own links.
const base = import.meta.env.BASE_URL;
const routes = { ...generatedRoutes, matchRoute: (path: string) => generatedRoutes.matchRoute(path.replace(base, "/")) };
if (!isDesktop) history.pushState = history.replaceState = () => {};

async function initializeApp() {
  const { app, router, pinia } = await createApp(App, { routes });

  return { app, router, pinia };
}

initializeApp().catch(console.error);
