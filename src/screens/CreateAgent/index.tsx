import { useState } from 'react';
import { ChatPanel } from './ChatPanel';
import { Intro } from '../../components/shared/Intro';
import { PreviewPanel } from './PreviewPanel';

function makeSessionId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sess-${Date.now()}`;
}

export function CreateAgentScreen() {
  const [sessionId] = useState(makeSessionId);
  const [agentId, setAgentId] = useState<string | null>(null);

  return (
    <section className="screen">
      <h1 className="page">Create an agent</h1>
      <Intro line="Describe the job in plain language. Rewive asks what it needs, shows you the plan, and builds the agent — no workflows, no prompts." />

      <div className="grid create-wrap">
        <ChatPanel sessionId={sessionId} onAgentCreated={setAgentId} />
        <PreviewPanel sessionId={sessionId} agentId={agentId} />
      </div>
    </section>
  );
}
