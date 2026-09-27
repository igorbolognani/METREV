# ADR-007 — Numerical verification and experimental validation

Status: accepted. Date: 2026-09-27.

Numerical verification asks whether the declared equations and discretization are implemented and solved as intended. Evidence includes limiting/manufactured solutions, mass and charge balances, mesh/time refinement, positivity and nonlinear convergence. Experimental validation asks whether predictions match independent, condition-matched observations with units, coordinates, dataset roles and uncertainty preserved. Calibration uses a separate split and does not validate itself.

The alternative of treating an accurate mesh result, a DOI, or an in-sample fitted curve as independent validation is rejected. Capability matrices carry separate numerical and experimental maturity. Gate: provenance and holdout review before any predictive status promotion. Current 1D case-runner output is informational development evidence only.
