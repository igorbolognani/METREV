# Copilot instructions

Follow the repository rules in [`AGENTS.md`](../AGENTS.md) and bootstrap in [`README.md`](../README.md). The active scope is MFC/MEC, wastewater treatment/management, and standalone or integrated electrochemical biosensors.

Keep domain meaning in `bioelectrochem_agent_kit/domain/`, input/serialization contracts in `bioelectro-copilot-contracts/contracts/`, and implementation in `packages/` or `apps/`. Do not create a parallel vocabulary or reintroduce historical technologies as active choices.

Scientific inputs require an explicit value, unit, source kind, and reference. Missing critical values block execution; never invent defaults. Mark solver results as modeled, retain MEC input/output distinctions, and describe the model as an uncalibrated, lumped, isothermal 0D baseline with no uncertainty propagation.

For behavior changes, run focused tests and typechecks before broad gates. Planning dry-runs must stay offline. Do not write to a database or contact a literature provider unless the task specifies a configured target and real ingestion.
