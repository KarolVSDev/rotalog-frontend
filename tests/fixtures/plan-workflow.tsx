// Browser test entry only. Not imported by the application or included in the production build.
import { createRoot } from "react-dom/client";
import { PlanWorkflow } from "../../src/features/planning/components/PlanWorkflow";
import { PlanningRepository } from "../../src/features/planning/api/planningRepository";
import { apiAuthService } from "../../src/features/services/apiAuth.service";
import { cargoFixture, manualPlanFixture } from "./route-plan";
import "../../src/index.css";
await apiAuthService.restore();
createRoot(document.getElementById("root")!).render(<main data-supplier-ui><h1>Cenário automatizado com carga interceptada</h1><PlanWorkflow repository={new PlanningRepository("org")} organizationId="org" draft={manualPlanFixture} eligibility={cargoFixture} onPublished={route => { document.title = `Publicada ${route.id}`; }}/></main>);
