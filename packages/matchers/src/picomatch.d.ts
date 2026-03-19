declare module 'picomatch' {
  interface PicomatchOptions {
    dot?: boolean;
    nocase?: boolean;
    contains?: boolean;
    matchBase?: boolean;
    [key: string]: unknown;
  }

  type Matcher = (input: string) => boolean;

  interface Picomatch {
    (glob: string | string[], options?: PicomatchOptions): Matcher;
    isMatch(input: string, glob: string | string[], options?: PicomatchOptions): boolean;
    makeRe(glob: string, options?: PicomatchOptions): RegExp;
  }

  const picomatch: Picomatch;
  export default picomatch;
}
