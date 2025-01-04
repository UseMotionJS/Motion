/****************************************************
 * mjssInterpreter.ts
 *
 * A modular MJSS Interpreter in TypeScript that lets
 * you add new commands (functions) on the fly.
 ****************************************************/

//---------------------------
// 1. Types & Interfaces
//---------------------------

/**
 * Signature for a handler that processes a single MJSS command.
 *
 * @param args - The arguments extracted from the script line.
 * @returns optional data or a promise, depending on your design.
 */
export type MJSSCommandHandler = (args: string[]) => unknown;

/**
 * Configuration for the MJSS Interpreter.
 */
export interface MJSSInterpreterConfig {
  /**
   * Optional: A function to call when errors occur.
   */
  onError?: (context: string, error: unknown) => void;

  /**
   * Optional: A function called when a line is successfully parsed/executed.
   */
  onLineParsed?: (command: string, args: string[]) => void;
}

/**
 * A minimal interface for environment or state
 * you might want to share across commands.
 *
 * Example: Store references to DOM elements, config, etc.
 */
export interface MJSSInterpreterEnv {
  // You can store anything you need here
  [key: string]: any;
}

//---------------------------
// 2. MJSSInterpreter Class
//---------------------------

export class MJSSInterpreter {
  private config: MJSSInterpreterConfig;
  private env: MJSSInterpreterEnv;

  /**
   * A map of "command name" => "handler function".
   * Example: "setProperty" => setPropertyHandler
   */
  private commandRegistry: Map<string, MJSSCommandHandler>;

  constructor(config?: MJSSInterpreterConfig) {
    this.config = config || {};
    this.env = {};
    this.commandRegistry = new Map<string, MJSSCommandHandler>();

    // Register built-in or default commands here
    this.registerDefaultCommands();
  }

  /**
   * Provide a shared environment object (optional).
   * This might be useful if commands need to read/write
   * shared data (like a DOM reference, config object, etc.)
   */
  public setEnvironment(env: MJSSInterpreterEnv): void {
    this.env = env;
  }

  /**
   * Register a new command in the interpreter.
   * @param commandName - e.g. "setProperty"
   * @param handler - A function that executes when that command is seen.
   */
  public registerFunction(
    commandName: string,
    handler: MJSSCommandHandler,
  ): void {
    if (!commandName) {
      throw new Error("Cannot register MJSS function without a name.");
    }
    this.commandRegistry.set(commandName, handler);
  }

  /**
   * Parse and execute the given MJSS script.
   * @param script - The MJSS script as a string.
   */
  public parse(script: string): void {
    // Split into lines, strip whitespace
    const lines = script.split("\n").map((line) => line.trim());

    for (const line of lines) {
      // Ignore empty lines or comment lines starting with "#"
      if (!line || line.startsWith("#")) {
        continue;
      }

      // Basic approach: split by space
      // e.g. "setProperty buttonColor red"
      // First token is the command, rest are args
      const tokens = line.split(/\s+/);
      const commandName = tokens[0];
      const args = tokens.slice(1);

      // Look up the command in the registry
      const commandHandler = this.commandRegistry.get(commandName);

      if (!commandHandler) {
        // Unknown command
        this.handleError(
          "parse",
          new Error(`Unrecognized command: ${commandName}`),
        );
        continue;
      }

      // Execute the command handler
      try {
        commandHandler(args);

        // Optionally call onLineParsed
        if (this.config.onLineParsed) {
          this.config.onLineParsed(commandName, args);
        }
      } catch (err) {
        this.handleError(`Command '${commandName}'`, err);
      }
    }
  }

  /**
   * A simple built-in error handler that delegates to config.onError if available.
   */
  private handleError(context: string, error: unknown): void {
    if (this.config.onError) {
      this.config.onError(context, error);
    } else {
      console.error(`[MJSS ${context} ERROR]`, error);
    }
  }

  /**
   * Register a few example commands that demonstrate how it works.
   */
  private registerDefaultCommands(): void {
    // Example #1: setProperty
    // Syntax in MJSS: "setProperty key value"
    this.registerFunction("setProperty", (args: string[]) => {
      if (args.length < 2) {
        throw new Error(`setProperty requires at least 2 args: key, value`);
      }
      const [key, ...rest] = args;
      const value = rest.join(" "); // if the value has spaces
      // Save in the environment
      this.env[key] = value;
      // For demonstration, log it
      console.log(`[setProperty] Set '${key}' to '${value}' in env.`);
    });

    // Example #2: animateElement
    // Syntax in MJSS: "animateElement fadeIn 2s"
    this.registerFunction("animateElement", (args: string[]) => {
      if (args.length < 2) {
        throw new Error(
          `animateElement requires at least 2 args: animationName, duration`,
        );
      }
      const [animationName, duration] = args;

      // In a real app, you might manipulate DOM elements or CSS classes here.
      console.log(
        `[animateElement] Animating with '${animationName}' for '${duration}'.`,
      );
      // For demonstration, store it in env or call your real animation logic
      this.env.lastAnimation = { animationName, duration };
    });
  }
}
