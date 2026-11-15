import { ENGINE_API_VERSION } from '@arunodaya/engine';

const root = document.getElementById('root');

if (root) {
  root.innerHTML = `
    <main>
      <h1>Arunodaya</h1>
      <p class="tagline">A little closer to the sun.</p>
      <p class="build">Foundation build</p>
      <p class="meta">Engine API version: <span id="engine-api-version">${String(ENGINE_API_VERSION)}</span></p>
    </main>
  `;
}
