import React from "react";
import ReactDOM from "react-dom/client";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import App from "./components/App";
import "./styles/global.css";

/* global Office */

Office.onReady(() => {
    const rootElement = document.getElementById("root");
    if (rootElement) {
        const root = ReactDOM.createRoot(rootElement);
        root.render(
            <React.StrictMode>
                <FluentProvider theme={webLightTheme}>
                    <App />
                </FluentProvider>
            </React.StrictMode>
        );
    }
});
