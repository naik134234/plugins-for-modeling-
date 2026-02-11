import React from "react";
import ReactDOM from "react-dom/client";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import App from "./components/App";
import "./styles/global.css";

/* global Office */

/**
 * Renders the React tree into the #root div.
 * Uses a data attribute guard so it is never called twice.
 */
function renderApp() {
    const rootElement = document.getElementById("root");
    if (rootElement && !rootElement.dataset.rendered) {
        rootElement.dataset.rendered = "true";
        const root = ReactDOM.createRoot(rootElement);
        root.render(
            <React.StrictMode>
                <FluentProvider theme={webLightTheme}>
                    <App />
                </FluentProvider>
            </React.StrictMode>
        );
    }
}

// 1. Try Office.onReady (when sideloaded inside Excel)
try {
    Office.onReady(() => renderApp());
} catch {
    // Not in Office context — that's fine
}

// 2. Fallback: render on DOMContentLoaded (browser dev server / standalone)
//    Short timeout gives Office.onReady a chance to fire first when available.
setTimeout(() => {
    if (document.readyState !== "loading") {
        renderApp();
    } else {
        document.addEventListener("DOMContentLoaded", () => renderApp());
    }
}, 500);
