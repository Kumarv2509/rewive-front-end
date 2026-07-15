import { useRef, useState } from 'react';
import {
  useAgentBuilderSession,
  useSendAgentBuilderMessage,
  useToggleSelection,
  useCreateAgent,
} from '../../api/agentBuilder';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { Pill } from '../../components/shared/Pill';
import { useToast } from '../../components/shared/Toast';

export function ChatPanel({ sessionId, onAgentCreated }: { sessionId: string; onAgentCreated: (agentId: string) => void }) {
  const { data: session, isLoading, isError } = useAgentBuilderSession(sessionId);
  const sendMessage = useSendAgentBuilderMessage(sessionId);
  const toggleSelection = useToggleSelection(sessionId);
  const createAgent = useCreateAgent();
  const { showToast } = useToast();
  const [draft, setDraft] = useState('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleRefine = () => {
    if (!draft) setDraft('Refine the plan: ');
    inputRef.current?.focus();
  };

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    sendMessage.mutate(text);
  };

  const handleCreate = () => {
    setCreating(true);
    createAgent.mutate(sessionId, {
      onSuccess: (agent) => {
        setCreating(false);
        setCreated(true);
        onAgentCreated(agent.agentId);
        showToast(`${agent.name} is live — first run queued`);
      },
      onError: () => setCreating(false),
    });
  };

  return (
    <div className="card chat">
      <div className="chat-head">
        <div className="logo-mark" style={{ width: 26, height: 26, fontSize: 12, borderRadius: 7 }}>R</div>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>Agent Builder</div>
        {session?.detectedTemplate && (
          <span className="pill indigo" style={{ marginLeft: 'auto' }}>{session.detectedTemplate}</span>
        )}
      </div>
      <div className="chat-body">
        {isLoading && <Loading label="Starting session…" />}
        {isError && <ErrorMessage message="Couldn't reach the agent builder." />}
        {session?.messages.map((m) => (
          <div className={`msg ${m.role}`} key={m.id}>
            {m.stepLabel && <div className="mini">{m.stepLabel}</div>}
            {m.text}
            {m.choices && (
              <div className="choice-grid">
                {m.choices.map((c) => (
                  <div
                    key={c.id}
                    className={`choice${c.selected ? ' on' : ''}`}
                    onClick={() =>
                      toggleSelection.mutate({ messageId: m.id, choiceId: c.id, selected: !c.selected })
                    }
                  >
                    <span className="box">{c.selected ? '✓' : ''}</span>
                    {c.label}
                  </div>
                ))}
              </div>
            )}
            {m.plan && (
              <>
                <div className="plan">
                  <div className="p-head">
                    <span>{m.plan.name}</span>
                    <Pill tone="green">est. run {m.plan.estRuntime}</Pill>
                  </div>
                  {m.plan.steps.map((s) => (
                    <div className="step" key={s.n}>
                      <span className="n">{s.n}</span>
                      {s.text}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                  <button className="btn primary" disabled={creating || created} onClick={handleCreate}>
                    {created ? '✓ Agent created' : creating ? 'Building agent…' : 'Create agent'}
                  </button>
                  <button className="btn ghost" onClick={handleRefine}>Refine plan</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          ref={inputRef}
          placeholder="Reply or refine — e.g. 'add a Saudi market comparison'"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button className="btn primary" onClick={handleSend} disabled={sendMessage.isPending}>
          Send
        </button>
      </div>
    </div>
  );
}
