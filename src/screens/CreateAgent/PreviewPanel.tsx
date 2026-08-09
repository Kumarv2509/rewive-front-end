import { useAgentPreview, useSessionPreview } from '../../api/agentBuilder';
import { Avatar } from '../../components/shared/Avatar';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';

export function PreviewPanel({ sessionId, agentId }: { sessionId: string; agentId: string | null }) {
  const sessionPreview = useSessionPreview(sessionId);
  const agentPreview = useAgentPreview(agentId ?? undefined);

  const preview = agentId ? agentPreview.data : sessionPreview.data;
  const isLoading = agentId ? agentPreview.isLoading : sessionPreview.isLoading;
  const isError = agentId ? agentPreview.isError : sessionPreview.isError;

  return (
    <div className="card preview">
      <div className="ph">
        ⚡ Worker preview
        <span className={`pill ${preview?.state === 'live' ? 'green' : 'gray'}`} style={{ marginLeft: 'auto' }}>
          {preview?.state === 'live' ? 'Live' : 'Draft'}
        </span>
      </div>
      {isLoading && <Loading />}
      {isError && <ErrorMessage />}
      {preview && (
        <>
          <div className="pv-row"><span className="l">Name</span><span className="v">{preview.name}</span></div>
          <div className="pv-row"><span className="l">Function</span><span className="v">{preview.function}</span></div>
          <div className="pv-row"><span className="l">Capabilities</span><span className="v">{preview.capabilitiesCount} selected</span></div>
          <div className="pv-row"><span className="l">Data inputs</span><span className="v">{preview.dataInputs}</span></div>
          <div className="pv-row"><span className="l">Review gate</span><span className="v">{preview.reviewGate}</span></div>
          <div className="pv-row">
            <span className="l">Accountable owner</span>
            <span className="v">
              <span className="human">
                <Avatar initials={preview.owner.initials} background={preview.owner.avatarBg} size={20} fontSize={9} />
                {preview.owner.name}
              </span>
            </span>
          </div>
          <div className="pv-row"><span className="l">Guardrails</span><span className="v">{preview.guardrails}</span></div>
          <div className="pv-row"><span className="l">Est. runtime</span><span className="v">{preview.estRuntime}</span></div>
          <div className="pv-foot">
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
              Every run is logged to the Decision Ledger with its outcome, owner and impact — that's the accountability contract.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
