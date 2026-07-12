import Layout from "./components/layout/Layout";
import { useSocketSync } from "./hooks/useSocketSync";

// ---------------------------------------------------------------------------
// Phase 0 verification — proves @transitops/shared resolves from /client.
// Remove this console.log after Phase 0 sign-off (check #10).
// ---------------------------------------------------------------------------
import { HealthResponseSchema } from "@transitops/shared";
console.log(
  "[Phase 0] @transitops/shared resolves from /client ✓ — HealthResponseSchema:",
  HealthResponseSchema.shape
);

function App() {
  // Initialises the Socket.io connection to /ops namespace.
  // Event listeners are added in Steps 4–6; currently just scaffolds the WS.
  useSocketSync();

  return <Layout />;
}

export default App;
