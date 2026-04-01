declare module "ignore" {
  interface Ignore {
    add(patterns: string | readonly string[]): Ignore;
    ignores(pathname: string): boolean;
  }

  function ignore(): Ignore;

  export type { Ignore };
  export default ignore;
}
