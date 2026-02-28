import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "@copilotkit/react-ui/styles.css";

const rootElement = document.getElementById("copilot-widget-root");

if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
} else {
    console.error("Copilot widget root element (#copilot-widget-root) not found.");
}
