import type React from 'react';

import { RulesClient } from '../../../components/rules/RulesClient';

interface RulesPageProps {
  params: Promise<{ token: string }>;
}

export default async function RulesPage({ params }: RulesPageProps): Promise<React.JSX.Element> {
  const { token } = await params;
  return <RulesClient token={token} />;
}
