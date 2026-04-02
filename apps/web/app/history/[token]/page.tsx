import type React from 'react';

import { HistoryClient } from '../../../components/history/HistoryClient';

interface HistoryPageProps {
  params: Promise<{ token: string }>;
}

export default async function HistoryPage({ params }: HistoryPageProps): Promise<React.JSX.Element> {
  const { token } = await params;
  return <HistoryClient token={token} />;
}
