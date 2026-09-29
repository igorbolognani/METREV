"""Tagged-mesh, steady incompressible Stokes development kernel (EQ-FL-001/002).

The caller supplies source-backed coefficients and compatible boundary traction
expressions. This is a numerical component, not a cell model or product executor.
Positive facet flow is outward; inlet flow is reported as its negative.
"""

from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Any

import basix.ufl
from mpi4py import MPI
import numpy as np
from petsc4py import PETSc
import ufl
from dolfinx import fem
from dolfinx.fem.petsc import LinearProblem


@dataclass(frozen=True)
class PlanarStokesResult:
    velocity: Any
    pressure: Any
    inlet_flow_m2_s_per_depth: float
    outlet_flow_m2_s_per_depth: float
    relative_flow_balance: float
    mean_inlet_pressure_pa: float
    mean_outlet_pressure_pa: float
    divergence_l2_per_s: float
    linear_iterations: int
    linear_converged_reason: int


def solve_planar_stokes(
    mesh_data: Any,
    *,
    viscosity_pa_s: float,
    wall_tags: tuple[str, ...],
    inlet_tag: str,
    outlet_tag: str,
    traction_by_tag: dict[str, Any],
) -> PlanarStokesResult:
    """Solve -div(2μ sym(grad u)) + grad p=0, div u=0 on tagged 2D liquid.

    Walls are no-slip Dirichlet; named inlet/outlet tractions have SI pressure
    units and represent the full symmetric Cauchy stress σn. The caller must
    supply consistent hydrodynamic boundary conditions; no traction is inferred
    from pressure alone. Porous interfaces and transient/turbulent flow are absent.
    """
    domain = mesh_data.mesh
    if domain.topology.dim != 2 or domain.geometry.dim != 2:
        raise ValueError("Planar Stokes requires a two-dimensional mesh")
    if isinstance(viscosity_pa_s, bool) or not isinstance(viscosity_pa_s, (int, float)) \
            or not math.isfinite(viscosity_pa_s) or viscosity_pa_s <= 0:
        raise ValueError("Dynamic viscosity must be finite and positive in Pa*s")
    if not wall_tags or len(set(wall_tags)) != len(wall_tags) or \
            inlet_tag == outlet_tag or inlet_tag in wall_tags or outlet_tag in wall_tags:
        raise ValueError("Wall, inlet and outlet tags must be distinct")
    if set(traction_by_tag) != {inlet_tag, outlet_tag}:
        raise ValueError("Both inlet and outlet require explicit full tractions")
    if mesh_data.facet_tags is None or mesh_data.cell_tags is None:
        raise ValueError("Tagged cells and exterior facets are required")

    groups = mesh_data.physical_groups
    for name in (*wall_tags, inlet_tag, outlet_tag):
        if name not in groups or groups[name].dim != 1 or len(mesh_data.facet_tags.find(groups[name].tag)) == 0:
            raise ValueError(f"Missing exterior facet group {name}")
    for tag, traction in traction_by_tag.items():
        if getattr(traction, "ufl_shape", None) != (2,):
            raise ValueError(f"Traction at {tag} must be a planar vector")

    space = fem.functionspace(domain, basix.ufl.mixed_element([
        basix.ufl.element("Lagrange", domain.basix_cell(), 2, shape=(2,)),
        basix.ufl.element("Lagrange", domain.basix_cell(), 1),
    ]))
    velocity_space, _ = space.sub(0).collapse()
    zero_velocity = fem.Function(velocity_space)
    zero_velocity.x.array[:] = 0.0
    wall_facets = np.unique(np.concatenate([
        mesh_data.facet_tags.find(groups[name].tag) for name in wall_tags
    ]))
    wall_dofs = fem.locate_dofs_topological(
        (space.sub(0), velocity_space), 1, wall_facets
    )
    if len(wall_dofs) == 0:
        raise ValueError("No no-slip velocity degrees of freedom on walls")
    boundary_condition = fem.dirichletbc(zero_velocity, wall_dofs, space.sub(0))

    velocity, pressure = ufl.TrialFunctions(space)
    test_velocity, test_pressure = ufl.TestFunctions(space)
    mu = fem.Constant(domain, PETSc.ScalarType(viscosity_pa_s))
    dx = ufl.Measure("dx", domain=domain)
    ds = ufl.Measure("ds", domain=domain, subdomain_data=mesh_data.facet_tags)
    normal = ufl.FacetNormal(domain)
    bilinear = (
        2 * mu * ufl.inner(ufl.sym(ufl.grad(velocity)), ufl.sym(ufl.grad(test_velocity)))
        - pressure * ufl.div(test_velocity)
        - test_pressure * ufl.div(velocity)
    ) * dx
    linear = sum(
        (ufl.dot(traction, test_velocity) * ds(groups[tag].tag)
         for tag, traction in traction_by_tag.items()),
        fem.Constant(domain, PETSc.ScalarType(0.0)) * test_pressure * dx,
    )
    problem = LinearProblem(
        bilinear, linear, bcs=[boundary_condition],
        petsc_options_prefix=f"metrev_stokes_{len(mesh_data.cell_tags.values)}_",
        petsc_options={"ksp_type": "preonly", "pc_type": "lu", "ksp_error_if_not_converged": True},
    )
    solved = problem.solve()
    reason = int(problem.solver.getConvergedReason())
    if reason <= 0:
        raise RuntimeError("Stokes linear solve did not converge")
    solved_velocity, solved_pressure = solved.split()
    solved_velocity = solved_velocity.collapse()
    solved_pressure = solved_pressure.collapse()
    solved_velocity.x.scatter_forward()
    solved_pressure.x.scatter_forward()

    def integrated(form: Any) -> float:
        local = fem.assemble_scalar(fem.form(form))
        return domain.comm.allreduce(float(local), op=MPI.SUM)

    inlet_id, outlet_id = groups[inlet_tag].tag, groups[outlet_tag].tag
    inlet_measure, outlet_measure = integrated(1.0 * ds(inlet_id)), integrated(1.0 * ds(outlet_id))
    if inlet_measure <= 0 or outlet_measure <= 0:
        raise ValueError("Inlet and outlet facets must have positive measure")
    inlet_flow = -integrated(ufl.dot(solved_velocity, normal) * ds(inlet_id))
    outlet_flow = integrated(ufl.dot(solved_velocity, normal) * ds(outlet_id))
    flow_scale = max(abs(inlet_flow), abs(outlet_flow), 1e-30)
    divergence = math.sqrt(max(0.0, integrated(ufl.div(solved_velocity)**2 * dx)))
    values = (inlet_flow, outlet_flow, divergence)
    if any(not math.isfinite(value) for value in values):
        raise RuntimeError("Stokes solve produced non-finite flow diagnostics")
    return PlanarStokesResult(
        velocity=solved_velocity,
        pressure=solved_pressure,
        inlet_flow_m2_s_per_depth=inlet_flow,
        outlet_flow_m2_s_per_depth=outlet_flow,
        relative_flow_balance=abs(inlet_flow - outlet_flow) / flow_scale,
        mean_inlet_pressure_pa=integrated(solved_pressure * ds(inlet_id)) / inlet_measure,
        mean_outlet_pressure_pa=integrated(solved_pressure * ds(outlet_id)) / outlet_measure,
        divergence_l2_per_s=divergence,
        linear_iterations=int(problem.solver.getIterationNumber()),
        linear_converged_reason=reason,
    )
