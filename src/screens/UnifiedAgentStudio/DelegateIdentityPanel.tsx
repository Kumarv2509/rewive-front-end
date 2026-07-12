import { useState } from 'react';
import { useUpdateDelegateIdentity } from '../../api/agentSpec';
import { useToast } from '../../components/shared/Toast';
import { Pill } from '../../components/shared/Pill';
import type {
  AgentCommunicationStyle,
  AgentDelegateIdentity,
  AgentResponseType,
  AgentSpec,
  AgentTone,
  AgentWorkingHours,
} from '../../api/types';

const tones: AgentTone[] = ['direct', 'diplomatic', 'warm', 'formal'];
const styles: AgentCommunicationStyle[] = ['concise', 'data_first', 'story_first'];
const responseTypes: AgentResponseType[] = ['proactive', 'wait_to_be_asked', 'scheduled_digest'];
const workingHoursOptions: AgentWorkingHours[] = ['business_hours', 'always_on', 'custom'];

function label(s: string) {
  return s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

export function DelegateIdentityPanel({ spec }: { spec: AgentSpec }) {
  const [name, setName] = useState(spec.delegateIdentity.delegateName);
  const [whenUnsure, setWhenUnsure] = useState(spec.delegateIdentity.whenUnsure);
  const update = useUpdateDelegateIdentity(spec.id);
  const { showToast } = useToast();

  function patch(vars: Partial<AgentDelegateIdentity>) {
    update.mutate(vars);
  }

  return (
    <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>Delegate identity</div>
        <Pill tone="gray">a delegate, not a bot</Pill>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 12 }}>How this agent presents itself and behaves — not just what it does.</div>

      <label style={{ fontSize: 11.5, color: 'var(--ink-2)', display: 'block', marginBottom: 4 }}>Name</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ flex: 1, border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
        />
        <button
          className="btn ghost sm"
          disabled={update.isPending || name === spec.delegateIdentity.delegateName}
          onClick={() => patch({ delegateName: name })}
        >
          Save
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginBottom: 6 }}>Tone</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {tones.map((t) => (
              <button key={t} className={`fchip${spec.delegateIdentity.tone === t ? ' on' : ''}`} onClick={() => patch({ tone: t })}>{label(t)}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginBottom: 6 }}>Communication style</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {styles.map((s) => (
              <button key={s} className={`fchip${spec.delegateIdentity.communicationStyle === s ? ' on' : ''}`} onClick={() => patch({ communicationStyle: s })}>{label(s)}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginBottom: 6 }}>Response type</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {responseTypes.map((r) => (
            <button key={r} className={`fchip${spec.delegateIdentity.responseType === r ? ' on' : ''}`} onClick={() => patch({ responseType: r })}>{label(r)}</button>
          ))}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginBottom: 6 }}>
            Escalation temperament &mdash; cautious {' '}&harr;{' '} decisive
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={spec.delegateIdentity.escalationTemperament}
            onChange={(e) => patch({ escalationTemperament: Number(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginBottom: 6 }}>Working hours</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {workingHoursOptions.map((w) => (
              <button key={w} className={`fchip${spec.delegateIdentity.workingHours === w ? ' on' : ''}`} onClick={() => patch({ workingHours: w })}>{label(w)}</button>
            ))}
          </div>
        </div>
      </div>

      <label style={{ fontSize: 11.5, color: 'var(--ink-2)', display: 'block', marginBottom: 4 }}>When it's unsure</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <textarea
          value={whenUnsure}
          onChange={(e) => setWhenUnsure(e.target.value)}
          style={{ flex: 1, minHeight: 44, border: '1px solid var(--border-strong)', borderRadius: 8, padding: 10, fontFamily: 'inherit', fontSize: 13, resize: 'vertical' }}
        />
        <button
          className="btn ghost sm"
          disabled={update.isPending || whenUnsure === spec.delegateIdentity.whenUnsure}
          onClick={() => { patch({ whenUnsure }); showToast('Saved'); }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
