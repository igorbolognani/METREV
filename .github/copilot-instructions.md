# Copilot instructions

Follow the repository rules in [`AGENTS.md`](../AGENTS.md) and bootstrap in [`README.md`](../README.md). The active scope is MFC/MEC, wastewater treatment/management, and standalone or integrated electrochemical biosensors.

Keep domain meaning in `bioelectrochem_agent_kit/domain/`, input/serialization contracts in `bioelectro-copilot-contracts/contracts/`, and implementation in `packages/` or `apps/`. Do not create a parallel vocabulary or reintroduce historical technologies as active choices.

Read the active capability and dependency manifests in `governance/` before editing. The complete requirement text is in `governance/MASTER_EXECUTION_TASK.md`. Scientific inputs require an explicit value, unit, source kind, and reference. Missing critical values block execution; never invent defaults or silently downgrade fidelity. Mark solver results as modeled and retain MEC input/output distinctions. The case runner's current primary model is lumped, isothermal, 0D and uncalibrated; the restricted steady 1D cell runs through the analyst API and case evaluation only with a complete source-backed `cell_1d` payload. Catalog 2D/3D entries have no runtime yet.

For behavior changes, run focused tests and typechecks before broad gates. Planning dry-runs must stay offline. Do not write to a database or contact a literature provider unless the task specifies a configured target and real ingestion.
