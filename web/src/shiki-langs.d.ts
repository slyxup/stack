declare module 'shiki/dist/langs/*.mjs' {
  // biome-ignore lint/suspicious/noExplicitAny: shiki grammar registration passthrough
  const langs: any;
  export default langs;
}

declare module 'shiki/dist/themes/*.mjs' {
  // biome-ignore lint/suspicious/noExplicitAny: shiki theme registration passthrough
  const theme: any;
  export default theme;
}
