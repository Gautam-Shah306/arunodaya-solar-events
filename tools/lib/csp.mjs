export const CSP_POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";

/**
 * Vite plugin injecting Content-Security-Policy meta tag during build
 * @returns {import('vite').Plugin}
 */
export function cspPlugin() {
  return {
    name: 'arunodaya-csp',
    apply: 'build',
    transformIndexHtml(html) {
      const metaTag = `<meta http-equiv="Content-Security-Policy" content="${CSP_POLICY}">`;
      return html.replace('</head>', `  ${metaTag}\n  </head>`);
    },
  };
}
