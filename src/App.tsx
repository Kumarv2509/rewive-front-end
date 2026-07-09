import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ToastProvider } from './components/shared/Toast';
import { CommandCenterScreen } from './screens/CommandCenter';
import { CreateAgentScreen } from './screens/CreateAgent';
import { RunsScreen } from './screens/Runs';
import { DecisionsScreen } from './screens/Decisions';
import { PeopleScreen } from './screens/People';
import { OutcomesScreen } from './screens/Outcomes';
import { ConnectorsScreen } from './screens/Connectors';
import { AgentSpaceScreen } from './screens/AgentSpace';
import { AgentDetailScreen } from './screens/AgentSpace/Detail';
import { AgentStudioScreen } from './screens/AgentStudio';
import { SignalDetailScreen } from './screens/SignalDetail';
import { FindingsScreen } from './screens/Findings';
import { FindingDetailScreen } from './screens/Findings/Detail';
import { SolutionDesignScreen } from './screens/SolutionDesign';
import { UnifiedAgentStudioScreen } from './screens/UnifiedAgentStudio';
import { TasksScreen } from './screens/Tasks';
import { KpiLibraryScreen } from './screens/KpiLibrary';
import { KpiBrainScreen } from './screens/KpiBrain';
import { LandingScreen } from './screens/Landing';
import { ShadowOrgScreen } from './screens/ShadowOrg';
import { ClosureScreen } from './screens/Closure';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 10_000 },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public landing — the Agentic Operating Model, no app chrome */}
            <Route path="/" element={<LandingScreen />} />

            <Route element={<AppLayout />}>
              <Route path="command" element={<CommandCenterScreen />} />
              <Route path="operate" element={<Navigate to="/command" replace />} />

              <Route path="operate/shadow" element={<ShadowOrgScreen />} />
              <Route path="operate/runs" element={<RunsScreen />} />
              <Route path="operate/decisions" element={<DecisionsScreen />} />
              <Route path="operate/tasks" element={<TasksScreen />} />

              <Route path="build" element={<Navigate to="/build/picture" replace />} />
              <Route path="build/picture" element={<KpiBrainScreen />} />
              <Route path="build/brain" element={<Navigate to="/build/picture" replace />} />
              <Route path="build/kpis" element={<KpiLibraryScreen />} />
              <Route path="build/create" element={<CreateAgentScreen />} />
              <Route path="build/connectors" element={<ConnectorsScreen />} />
              <Route path="build/studio" element={<AgentStudioScreen />} />
              <Route path="build/studio/:workflowId" element={<AgentStudioScreen />} />
              <Route path="build/solutions/:solutionId" element={<SolutionDesignScreen />} />
              <Route path="build/agent-studio/:agentSpecId" element={<UnifiedAgentStudioScreen />} />

              <Route path="insights" element={<Navigate to="/insights/agents" replace />} />
              <Route path="insights/agents" element={<AgentSpaceScreen />} />
              <Route path="insights/agents/:agentId" element={<AgentDetailScreen />} />
              <Route path="insights/people" element={<PeopleScreen />} />
              <Route path="insights/outcomes" element={<Navigate to="/insights/outcomes/latest" replace />} />
              <Route path="insights/outcomes/:runId" element={<OutcomesScreen />} />
              <Route path="insights/findings" element={<FindingsScreen />} />
              <Route path="insights/findings/:findingId" element={<FindingDetailScreen />} />
              <Route path="insights/closure" element={<ClosureScreen />} />
              {/* v3 signals evolved into findings — the studio list redirects, detail stays for old signal links */}
              <Route path="insights/signals" element={<Navigate to="/insights/findings" replace />} />
              <Route path="insights/signals/:signalId" element={<SignalDetailScreen />} />

              {/* v1 URL redirects, kept working for old bookmarks/links */}
              <Route path="runs" element={<Navigate to="/operate/runs" replace />} />
              <Route path="decisions" element={<Navigate to="/operate/decisions" replace />} />
              <Route path="create" element={<Navigate to="/build/create" replace />} />
              <Route path="people" element={<Navigate to="/insights/people" replace />} />
              <Route path="outcomes" element={<Navigate to="/insights/outcomes/latest" replace />} />
              <Route path="outcomes/:runId" element={<LegacyOutcomeRedirect />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

function LegacyOutcomeRedirect() {
  const { runId } = useParams();
  return <Navigate to={`/insights/outcomes/${runId}`} replace />;
}

export default App;
