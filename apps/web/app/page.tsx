import type React from 'react';

import { EndpointCreator } from '../components/landing/EndpointCreator';

export default function LandingPage(): React.JSX.Element {
  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '56px 24px' }}>
      <h1 style={{ marginTop: 0, fontSize: 40 }}>Snag Web Console</h1>
      <p style={{ color: '#9fb0d1', maxWidth: 760 }}>
        Capture inbound webhooks at a stable URL and inspect them in real time. Start by creating an endpoint below.
      </p>
      <EndpointCreator />
    </main>
  );
}
