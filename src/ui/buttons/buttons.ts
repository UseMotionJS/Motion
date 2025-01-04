/****************************************************
 * mjssEngine.ts
 *
 * An advanced TypeScript module that:
 * - Renders a button using a custom MJSS (Motion.js) script
 * - Parses the script to apply properties (text, color, size, animations, etc.)
 * - Persists changes to localStorage
 * - Reloads changes instantly on page refresh
 ****************************************************/

//---------------------------
// Types & Interfaces
//---------------------------

/**
 * High-level structure of the parsed MJSS data.
 * You can extend this to include more properties as needed.
 */
interface MJSSProperties {
    /** An optional ID to give the button element. */
    buttonID?: string;
    /** The visible text of the button. */
    text?: string;
    /** The background color of the button. */
    color?: string;
    /** The width of the button (e.g. "150px", "10rem"). */
    width?: string;
    /** The height of the button (e.g. "50px", "2rem"). */
    height?: string;
  
    /** Nested property for animations. */
    animation?: {
      type?: string;
      duration?: string;
      [key: string]: unknown; // catch-all for custom animation keys
    };
  
    /** Catch-all for other or future properties. */
    [key: string]: unknown;
  }
  
  /**
   * Configuration options for the MJSSEngine constructor.
   */
  interface MJSSEngineOptions {
    /** The DOM container (ID or Element) where the button(s) will be rendered. */
    container: string | HTMLElement;
  
    /**
     * Optional: A unique key for localStorage.
     * If not provided, defaults to "MJSS_SCRIPT".
     */
    localStorageKey?: string;
  
    /**
     * A callback for logging or error reporting.
     * You could integrate real monitoring (Sentry, Datadog, etc.) here.
     */
    onError?: (context: string, error: unknown) => void;
  }
  
  //---------------------------
  // MJSSEngine Class
  //---------------------------
  
  export class MJSSEngine {
    private containerElem: HTMLElement;
    private localStorageKey: string;
    private onError?: (context: string, error: unknown) => void;
    private currentMJSSProps: MJSSProperties = {};
  
    /** The main button element we’re rendering. */
    private buttonElem: HTMLButtonElement | null = null;
  
    constructor(options: MJSSEngineOptions) {
      // Resolve container
      if (typeof options.container === "string") {
        const elem = document.getElementById(options.container);
        if (!elem) {
          throw new Error(
            `MJSSEngine: Container element with ID '${options.container}' not found.`,
          );
        }
        this.containerElem = elem;
      } else {
        this.containerElem = options.container;
      }
  
      // Setup localStorage key
      this.localStorageKey = options.localStorageKey || "MJSS_SCRIPT";
      this.onError = options.onError;
  
      // Initialize
      this.initialize();
    }
  
    /**
     * Reads saved MJSS from localStorage (if any), then renders the button.
     */
    private initialize(): void {
      try {
        const savedScript = localStorage.getItem(this.localStorageKey) || "";
        if (savedScript) {
          this.currentMJSSProps = this.parseMJSS(savedScript);
        }
  
        // Render or re-render the button based on saved MJSS.
        this.renderButton();
      } catch (err) {
        this.handleError("Initialization", err);
      }
    }
  
    /**
     * A basic parser for the custom MJSS script syntax.
     * Example:
     * ```
     * buttonID = "myButton1"
     * text = "Hello"
     * color = "red"
     * animation.type = "fade"
     * animation.duration = "2s"
     * ```
     *
     * In a real app, replace this with a more robust parser.
     */
    private parseMJSS(script: string): MJSSProperties {
      const lines = script.split("\n").map((line) => line.trim());
      const props: MJSSProperties = {};
  
      for (const line of lines) {
        // Skip empty or comment lines
        if (!line || line.startsWith("#")) {
          continue;
        }
  
        // Basic syntax: key = value
        // or nested syntax: animation.type = "fade"
        const [rawKey, rawValue] = line.split("=").map((v) => v.trim());
        if (!rawKey || rawValue === undefined) {
          continue;
        }
  
        // Handle nested keys (e.g. animation.type)
        const keyParts = rawKey.split(".");
        let currentObj: any = props;
  
        // For each part except the last, drill down
        for (let i = 0; i < keyParts.length - 1; i++) {
          const part = keyParts[i];
          if (!(part in currentObj)) {
            currentObj[part] = {};
          }
          currentObj = currentObj[part];
        }
  
        const lastKey = keyParts[keyParts.length - 1];
  
        // Remove quotes from the raw value if present (simple approach)
        const cleanedValue = rawValue.replace(/^["']|["']$/g, "").trim();
  
        // We could do type inference (numbers, booleans), but for now store as string
        currentObj[lastKey] = cleanedValue;
      }
  
      return props;
    }
  
    /**
     * Render (or re-render) the button based on currentMJSSProps.
     * If the button doesn’t exist, create it. Otherwise, update it.
     */
    private renderButton(): void {
      // Create the button if it doesn’t exist
      if (!this.buttonElem) {
        this.buttonElem = document.createElement("button");
        // If a buttonID was provided, set it
        if (this.currentMJSSProps.buttonID) {
          this.buttonElem.id = this.currentMJSSProps.buttonID;
        }
        this.containerElem.appendChild(this.buttonElem);
      }
  
      // Set properties on the button
      if (this.currentMJSSProps.text) {
        this.buttonElem.textContent = this.currentMJSSProps.text;
      }
      if (this.currentMJSSProps.color) {
        this.buttonElem.style.backgroundColor = this.currentMJSSProps.color;
      }
      if (this.currentMJSSProps.width) {
        this.buttonElem.style.width = this.currentMJSSProps.width;
      }
      if (this.currentMJSSProps.height) {
        this.buttonElem.style.height = this.currentMJSSProps.height;
      }
  
      // Handle animations
      // Here, we just do a minimal demonstration (you could do fancy CSS classes, etc.)
      if (this.currentMJSSProps.animation) {
        if (this.currentMJSSProps.animation.type === "fade") {
          // e.g. fade in/out effect
          this.buttonElem.style.transition = `opacity ${
            this.currentMJSSProps.animation.duration || "1s"
          } ease-in-out`;
        }
        // Extend this with more animation handling as desired
      }
    }
  
    /**
     * Update the MJSS script at runtime. The engine will:
     * 1. Parse the new script
     * 2. Merge changes with current properties
     * 3. Re-render the button
     * 4. Persist changes to localStorage
     * @param newScript The new MJSS script string
     * @param replace If true, replace all properties instead of merging
     */
    public updateMJSS(newScript: string, replace = false): void {
      try {
        const newProps = this.parseMJSS(newScript);
  
        if (replace) {
          // Replace the entire object
          this.currentMJSSProps = newProps;
        } else {
          // Merge into existing
          this.currentMJSSProps = {
            ...this.currentMJSSProps,
            ...newProps,
            // Handle nested objects (e.g. animation) carefully if needed
            animation: {
              ...this.currentMJSSProps.animation,
              ...newProps.animation,
            },
          };
        }
  
        // Re-render
        this.renderButton();
  
        // Save to localStorage
        localStorage.setItem(this.localStorageKey, this.buildMJSS());
      } catch (err) {
        this.handleError("UpdateMJSS", err);
      }
    }
  
    /**
     * Convert the current MJSSProperties object back to a script-like string.
     * This is useful for persisting to localStorage or debugging.
     * In real usage, you might store the raw script the user typed, or build it differently.
     */
    private buildMJSS(): string {
      // We’ll do a naive approach; in a real app you’d want a robust serializer
      const lines: string[] = [];
      for (const [key, val] of Object.entries(this.currentMJSSProps)) {
        if (typeof val === "object" && val !== null) {
          // e.g. animation block
          for (const [nestedKey, nestedVal] of Object.entries(val)) {
            lines.push(`${key}.${nestedKey} = "${nestedVal}"`);
          }
        } else {
          lines.push(`${key} = "${val}"`);
        }
      }
      return lines.join("\n");
    }
  
    /**
     * Simple error handling. In production, you could integrate with a real monitoring system.
     */
    private handleError(context: string, error: unknown): void {
      if (this.onError) {
        this.onError(context, error);
      } else {
        console.error(`[${context} ERROR]`, error);
      }
    }
  }
  
  //---------------------------
  // Example: Automatic Startup
  //---------------------------
  
  /**
   * OPTIONAL: If you want to automatically create an engine
   * when this script is loaded, uncomment below.
   *
   * Otherwise, you can create an instance from your own script:
   *
   *   const engine = new MJSSEngine({ container: "app" });
   *
   * Then call engine.updateMJSS(...), etc.
   */
  
  // document.addEventListener("DOMContentLoaded", () => {
  //   try {
  //     const engine = new MJSSEngine({ container: "app" });
  //     // Optionally, load/modify the MJSS script after startup:
  //     // engine.updateMJSS(`text = "Dynamically Updated!"`);
  //   } catch (error) {
  //     console.error("[Startup ERROR]", error);
  //   }
  // });
  