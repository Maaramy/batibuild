import { registerRootComponent } from "expo";
import * as SplashScreen from "expo-splash-screen";

// Keep the native splash screen up while the JS bundle boots; App() hides it
// as soon as the (visually identical) React splash screen is rendered.
SplashScreen.preventAutoHideAsync().catch(() => {});

import App from "./App";

registerRootComponent(App);