declare module "potrace" {
  interface PotraceOptions {
    color?: string;
    background?: string;
    threshold?: number;
    turdSize?: number;
    optCurve?: boolean;
    optTolerance?: number;
  }

  interface Potrace {
    trace(
      image: Buffer | string,
      options: PotraceOptions,
      callback: (err: Error | null, svg: string) => void
    ): void;
  }

  const potrace: Potrace;
  export = potrace;
}

