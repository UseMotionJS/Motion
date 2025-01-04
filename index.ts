/**************************************************************
 * index.ts (root of your project)
 *
 * A universal script that works in both Node.js and browsers.
 * - Detects dev vs. production environment
 * - Handles errors differently in dev vs. prod
 * - Optionally launches a Node server (in Node context)
 * - Dynamically loads UI/CSS modules in browser context
 **************************************************************/

//---------------------------------------
// 1. Detect Environment & Platforms
//---------------------------------------

/** Indicates if the script is running in Node.js. */
const isNode: boolean =
  typeof process !== "undefined" &&
  !!process.versions &&
  !!process.versions.node;

/** Indicates if the script is running in a browser. */
const isBrowser: boolean = typeof window !== "undefined";

/** Supported environment modes */
type EnvironmentMode = "development" | "production";

/** Determine environment mode & debug flag */
let ENV: EnvironmentMode = "production";
let debugMode = false;

if (isNode) {
  /**
   * In Node, rely on environment variables.
   * E.g.: NODE_ENV=development node index.js
   */
  if (process.env.NODE_ENV === "development") {
    ENV = "development";
    debugMode = true;
  }
} else if (isBrowser) {
  /**
   * In the browser, check if the hostname is "localhost"
   * or an equivalent local address (IPv6 ::1 or IPv4 127.x.x.x).
   */
  const isLocalhost = Boolean(
    window.location.hostname === "localhost" ||
      window.location.hostname === "[::1]" ||
      window.location.hostname.match(
        /^127(?:\.(?:25[0-5]|2[0-4]\d|[01]?\d?\d)){3}$/,
      ),
  );
  ENV = isLocalhost ? "development" : "production";
  debugMode = isLocalhost;
}

//---------------------------------------
// 2. Global Configuration Object
//---------------------------------------

interface IConfig {
  environment: EnvironmentMode;
  debug: boolean;
  /**
   * Example API endpoint that differs in dev vs. prod.
   */
  apiEndpoint: string;
}

/** A globally shared config object. */
const config: IConfig = {
  environment: ENV,
  debug: debugMode,
  apiEndpoint: debugMode
    ? "http://localhost:3000/api"
    : "https://api.yourdomain.com",
};

console.info(
  `[INIT] Running in ${ENV.toUpperCase()} mode${
    isNode ? " (Node.js)" : isBrowser ? " (Browser)" : ""
  }`,
);

//---------------------------------------
// 3. Error Handling & Monitoring
//---------------------------------------

/**
 * A placeholder for sending errors to your monitoring system.
 * In a real app, this might use Sentry, Datadog, or another service.
 */
function sendErrorToMonitoringService(context: string, err: unknown): void {
  // This is just an example. Replace with real API calls/logging:
  console.log(
    `[${context}] [PRODUCTION] Sending error to monitoring service:`,
    err,
  );
}

/**
 * A robust helper for logging or reporting errors based on environment.
 * @param context A label or identifier for the error’s source.
 * @param error The unknown error; can be anything thrown by the runtime or libraries.
 */
function handleError(context: string, error: unknown): void {
  if (config.debug) {
    // In development, log full details to the console.
    console.error(`[${context} ERROR - DEV MODE]`, error);
  } else {
    // In production, keep logs minimal and send details to a monitoring service.
    sendErrorToMonitoringService(context, error);
  }
}

/** Setup global error handling for Node.js */
function setupNodeErrorHandling(): void {
  process.on("uncaughtException", (err: Error) => {
    handleError("Node uncaughtException", err);
  });
  process.on("unhandledRejection", (reason: unknown) => {
    handleError("Node unhandledRejection", reason);
  });
}

/** Setup global error handling for Browsers */
function setupBrowserErrorHandling(): void {
  window.addEventListener("error", (event) => {
    handleError("Global Browser", event.error);
  });
  window.addEventListener("unhandledrejection", (event) => {
    handleError("Browser PromiseRejection", event.reason);
  });
}

//---------------------------------------
// 4. Node.js Boot Logic (Optional)
//---------------------------------------

/**
 * Bootstraps a Node.js server. In a production app, you might:
 * - Initialize databases
 * - Use Express/Koa for routing
 * - Serve static files or APIs
 * - Etc.
 */
async function bootstrapNode(configObject: IConfig): Promise<void> {
  console.info(`[INIT] Bootstrapping Node.js environment...`);

  // Dynamically import the 'node:http' module (ESM style).
  // If you compile to CommonJS, you might do a direct import.
  const httpModule = await import("node:http");
  const http = httpModule.default;

  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(
      `Hello from Node! We are in ${configObject.environment} mode.\n` +
        `Debug is ${configObject.debug ? "enabled" : "disabled"}.\n`,
    );
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.info(`[INIT] Node server is listening on http://localhost:${PORT}`);
  });
}

//---------------------------------------
// 5. Browser Boot Logic (UI + CSS)
//---------------------------------------

/**
 * Dynamically load UI modules (which presumably manipulate the DOM).
 * These imports are only relevant in the browser context.
 */
async function loadUI(): Promise<void> {
  try {
    // Example path – adjust to your project structure.
    // Some bundlers let you specify a "chunk name" comment:
    // import(/* webpackChunkName: "ui" */ './src/ui/uiInit.js');
    const { default: initUI } = await import("./src/ui/uiInit.js");
    // initUI is presumably a function that takes your config.
    initUI(config);
  } catch (err) {
    handleError("UI Init", err);
  }
}

/**
 * Dynamically import a module that applies custom styles or theming.
 */
async function loadCustomCSS(): Promise<void> {
  try {
    const { default: applyStyles } = await import(
      "./src/styles/customStyles.js"
    );
    applyStyles(config);
  } catch (err) {
    handleError("CustomCSS", err);
  }
}

/**
 * Combine everything in a single bootstrap function for the browser.
 */
async function bootstrapBrowser(configObject: IConfig): Promise<void> {
  console.info("[INIT] Bootstrapping the browser application...");

  // Load UI & custom styles in parallel for performance.
  await Promise.all([loadUI(), loadCustomCSS()]);

  // If you have more steps, you can chain them here.
  console.info("[INIT] Browser application bootstrap complete.");
}

//---------------------------------------
// 6. Entry Point
//---------------------------------------

/**
 * Main entry point that decides which context we’re in
 * and calls the appropriate bootstrap function.
 */
async function main(): Promise<void> {
  try {
    if (isNode) {
      setupNodeErrorHandling();
      await bootstrapNode(config);
    } else if (isBrowser) {
      setupBrowserErrorHandling();
      await bootstrapBrowser(config);
    } else {
      console.warn("[INIT] Unknown environment! Not Node, not Browser.");
    }
  } catch (error) {
    handleError("Main Initialization", error);
  }
}

// In an ESM environment (e.g., `"type": "module"` in package.json),
// you can do top-level awaits. Otherwise, call main() after your imports:
main().catch((error) => {
  handleError("Top-level main()", error);
});
