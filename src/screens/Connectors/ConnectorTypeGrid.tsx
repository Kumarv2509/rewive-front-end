import { useConnections, useConnectorTypes } from '../../api/connectors';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import type { ConnectorType } from '../../api/types';

export function ConnectorTypeGrid({
  selectedTypeId,
  onSelect,
  onAddCustom,
}: {
  selectedTypeId?: string;
  onSelect: (type: ConnectorType) => void;
  onAddCustom: () => void;
}) {
  const { data, isLoading, isError } = useConnectorTypes();
  const { data: connections } = useConnections();

  if (isLoading) return <Loading />;
  if (isError) return <ErrorMessage />;

  return (
    <div className="card connector-list">
      {data?.map((t) => {
        const connectedCount = connections?.filter((c) => c.connectorTypeId === t.id).length ?? 0;
        return (
          <div
            className={`connector-list-item${selectedTypeId === t.id ? ' active' : ''}`}
            key={t.id}
            onClick={() => onSelect(t)}
          >
            <div className="c-icon">{t.icon}</div>
            <div>
              <div className="c-name">{t.name}</div>
              <div className="c-desc">{t.description}</div>
            </div>
            <div className="c-meta">{connectedCount} connection{connectedCount === 1 ? '' : 's'} →</div>
          </div>
        );
      })}
      <div className="connector-list-item add-custom" onClick={onAddCustom}>
        <div className="c-icon">＋</div>
        <div className="c-name">Custom connector type</div>
      </div>
    </div>
  );
}
