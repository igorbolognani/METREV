# ADR 0001 — Build decision support on a coupled MFC/MEC and wastewater model

## Status

Accepted, narrowed by spec 038

## Context

The active domain is microbial fuel cells (MFC), microbial electrolysis cells (MEC), wastewater management/treatment, and electrochemical biosensors. A biosensor may be standalone or integrated with an MFC or MEC. The product must model the coupled physical, chemical, biological, electrochemical, materials, operating, and measurement boundaries before generating decisions. The initial executable solver is an explicit lumped 0D model; it is not a spatial CFD or validated multiphysics solver.

## Decision

The system is a scientific decision-support platform whose evaluation path includes:

- source-referenced wastewater and component inputs
- a coupled mechanistic MFC/MEC baseline and standalone/integrated amperometric biosensor response
- structured ontology
- explicit intake normalization and missing-data checks
- typed evidence
- deterministic and semi-deterministic rules
- multicriteria prioritization
- consulting-style report generation

## Consequences

### Positive

- system outputs are grounded in explicit physical and operational inputs
- model results remain distinct from measurements and source evidence
- recommendations retain data gaps, assumptions, and uncertainty

### Negative

- the first solver is lumped and cannot resolve spatial gradients or every chemical species
- validation, parameter fitting, uncertainty propagation, and deeper transport models remain later increments

## Alternatives considered

- spatially resolved multiphysics architecture before a source-backed lumped baseline
- LLM-first freeform recommendation engine
