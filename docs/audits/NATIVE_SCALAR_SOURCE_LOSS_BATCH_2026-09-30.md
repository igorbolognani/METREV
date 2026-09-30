# Native scalar source/loss implementation batch

Baseline: main `793ff09`, after approved spatial consolidation and branch maintenance. This batch advances P03/P06/P07/P14/P15 together through one explicit development path; their full completion requirements remain open.

| Layer                   | Implemented boundary                                                                                   | Verification                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Contracts and authority | Optional constant production and first-order loss; both nonnegative SI coefficients require provenance | Invalid units, missing coefficients/provenance, unknown law and parameters rejected |
| Native common kernel    | `div(u*c-D*grad(c)) = s-k*c`, using actual solved same-domain Stokes/Darcy velocity                    | Pure loss, pure production and equilibrium analytic profiles on three meshes        |
| Conservation            | Separately measured outward port/wall flux, integrated production and consumption                      | Residual derived from all measured terms; no concentration clipping                 |
| Sidecar integrity       | Law, area and concentration-integral binding                                                           | Missing, fabricated or inconsistent reactive budgets rejected                       |
| Worker and persistence  | Reactive result-v2 and measured species budget                                                         | Native Stokes/Darcy worker claims and authenticated field API                       |
| Governance              | Explicit scope and retained partial statuses                                                           | Governance validation and unchanged product admission                               |

Numerical fixture coefficients are synthetic and are not empirical calibration. The optional law is one neutral scalar; reaction networks, ionic migration, coupled charge, membrane interfaces, biofilm/electrode kinetics, cathode, external circuit, nonlinear cell convergence and a product case runner remain unimplemented. The full program status stays 10 partial points, 29 pending and P37 complete; this count is not a percentage of engineering progress.

Verification before publication: full local lint/build and fast matrix pass (517 JavaScript tests, five native worker variants skipped locally; 17 cross-language contract checks, 30 Python tests with three native dependency skips). The five worker variants and analytic refinement gate must pass in the pinned native CI container. The PR also retains PostgreSQL migrations/integration, authenticated E2E, provider stub, workflow semantics and CodeQL gates. Passing development fixtures does not promote numerical or experimental maturity of a full-cell model.

Next sequence: conservative interfaces and heterogeneous material transport; declared species/reaction networks with mass/charge checks; ionic and solid charge with nonlinear convergence; membrane/biofilm/electrode/cathode/circuit coupling; full-cell persistence and viewer; independent benchmark/holdout gates. Reuse one active branch per coherent batch, target main and archive after verified merge.
