import type React from 'react';

import { ConsoleClient } from '../../../components/console/ConsoleClient';

interface ConsolePageProps {
  params: Promise<{ token: string }>;
}

export default async function ConsolePage({ params }: ConsolePageProps): Promise<React.JSX.Element> {
  const { token } = await params;
  return <ConsoleClient token={token} />;
}
