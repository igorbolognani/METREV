"""Same-mesh steady neutral scalar transport driven by a declared hydraulic field."""

from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Any

import numpy as np
from mpi4py import MPI
from petsc4py import PETSc
import ufl
from dolfinx import fem
from dolfinx.fem.petsc import LinearProblem


@dataclass(frozen=True)
class PlanarScalarTransportResult:
    concentration: Any
    inlet_species_rate_mol_m_s_per_depth: float
    outlet_species_rate_mol_m_s_per_depth: float
    wall_species_rate_mol_m_s_per_depth: float
    production_rate_mol_m_s_per_depth: float
    consumption_rate_mol_m_s_per_depth: float
    relative_species_balance: float
    peclet_number: float
    minimum_concentration_mol_m3: float
    maximum_concentration_mol_m3: float
    linear_iterations: int
    linear_converged_reason: int


def solve_planar_scalar_transport(
    mesh_data: Any,
    *,
    velocity: Any,
    domain_tag: str,
    inlet_tag: str,
    outlet_tag: str,
    wall_tags: tuple[str, ...],
    inlet_concentration_mol_m3: float,
    outlet_concentration_mol_m3: float,
    effective_diffusivity_m2_s: float,
    characteristic_length_m: float,
    linear_source_loss: tuple[float, float] | None = None,
) -> PlanarScalarTransportResult:
    """Solve div(u c - D_eff grad(c)) = source - loss*c with declared coefficients.

    Declared superficial or bulk velocity is consumed as the advective flux. Concentration
    is P1. The conservative term div(u*c) retains div(u)*c, including
    any discrete divergence of a solved velocity; no divergence-free field
    is silently substituted. Concentration is fixed at both declared pressure ports and the walls
    have zero normal hydraulic and diffusive flux. An absent source/loss law means
    the existing explicitly source-free formulation, not inferred coefficients.
    Electrochemical/biological networks, migration and porous/bulk interfaces remain unsupported.
    """
    source_rate, loss_rate = (0.0, 0.0) if linear_source_loss is None else linear_source_loss
    for value in (source_rate, loss_rate):
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
            raise ValueError("Scalar source and first-order loss must be finite and nonnegative")
    domain = mesh_data.mesh
    if velocity.ufl_domain() != domain.ufl_domain():
        raise ValueError("Transport velocity must use the exact same numerical mesh")
    if domain.topology.dim != 2 or domain.geometry.dim != 2:
        raise ValueError("Planar Hydraulic transport requires a two-dimensional mesh")
    for name, value in (
        ("effective diffusivity", effective_diffusivity_m2_s),
        ("characteristic length", characteristic_length_m),
    ):
        if isinstance(value, bool) or not isinstance(value, (int, float)) or \
                not math.isfinite(value) or value <= 0:
            raise ValueError(f"Transport {name} must be finite and positive")
    for name, value in (
        ("inlet concentration", inlet_concentration_mol_m3),
        ("outlet concentration", outlet_concentration_mol_m3),
    ):
        if isinstance(value, bool) or not isinstance(value, (int, float)) or \
                not math.isfinite(value) or value < 0:
            raise ValueError(f"Transport {name} must be finite and nonnegative")
    if inlet_tag == outlet_tag or not wall_tags or len(set(wall_tags)) != len(wall_tags) or \
            inlet_tag in wall_tags or outlet_tag in wall_tags:
        raise ValueError("Transport inlet, outlet and walls must be distinct")
    if mesh_data.facet_tags is None or mesh_data.cell_tags is None:
        raise ValueError("Tagged cells and exterior facets are required")
    groups = mesh_data.physical_groups
    region = groups.get(f"region:{domain_tag}")
    if region is None or region.dim != 2:
        raise ValueError("A declared cell group is required")
    owned_cells = domain.topology.index_map(2).size_local
    tagged_owned = mesh_data.cell_tags.indices < owned_cells
    invalid_cells = (
        not np.array_equal(
            mesh_data.cell_tags.indices[tagged_owned], np.arange(owned_cells)
        )
        or np.any(mesh_data.cell_tags.values[tagged_owned] != region.tag)
    )
    if domain.comm.allreduce(int(invalid_cells), op=MPI.SUM):
        raise ValueError("Hydraulic transport requires one physical-region mesh")
    domain.topology.create_connectivity(1, 2)

    space = fem.functionspace(domain, ("Lagrange", 1))
    boundary_dofs = []
    boundary_conditions = []
    boundary_values = {
        inlet_tag: inlet_concentration_mol_m3,
        outlet_tag: outlet_concentration_mol_m3,
    }
    for tag, value in boundary_values.items():
        group = groups.get(f"boundary:{tag}")
        if group is None or group.dim != 1:
            raise ValueError(f"Missing transport port facet group {tag}")
        facets = mesh_data.facet_tags.find(group.tag)
        if len(facets) == 0:
            raise ValueError(f"Transport port {tag} has no facets")
        dofs = fem.locate_dofs_topological(space, 1, facets)
        if len(dofs) == 0:
            raise ValueError(f"Transport port {tag} has no concentration degrees of freedom")
        boundary_dofs.extend(int(dof) for dof in dofs)
        value_function = fem.Function(space)
        value_function.x.array[:] = float(value)
        value_function.x.scatter_forward()
        boundary_conditions.append(fem.dirichletbc(value_function, dofs))
    if len(boundary_dofs) != len(set(boundary_dofs)):
        raise ValueError("Transport inlet and outlet concentration facets overlap")
    wall_ids = []
    for tag in wall_tags:
        group = groups.get(f"boundary:{tag}")
        if group is None or group.dim != 1:
            raise ValueError(f"Missing impermeable wall facet group {tag}")
        facets = mesh_data.facet_tags.find(group.tag)
        if len(facets) == 0:
            raise ValueError(f"Transport wall {tag} has no facets")
        wall_ids.append(group.tag)

    trial = ufl.TrialFunction(space)
    test = ufl.TestFunction(space)
    dx = ufl.Measure("dx", domain=domain)
    bilinear = (
        effective_diffusivity_m2_s * ufl.inner(ufl.grad(trial), ufl.grad(test))
        + ufl.div(velocity * trial) * test
        + loss_rate * trial * test
    ) * dx
    linear = fem.Constant(domain, PETSc.ScalarType(source_rate)) * test * dx
    problem = LinearProblem(
        bilinear,
        linear,
        bcs=boundary_conditions,
        petsc_options_prefix=f"metrev_scalar_transport_{len(mesh_data.cell_tags.values)}_",
        petsc_options={
            "ksp_type": "preonly",
            "pc_type": "lu",
            "ksp_error_if_not_converged": True,
        },
    )
    concentration = problem.solve()
    reason = int(problem.solver.getConvergedReason())
    if reason <= 0:
        raise RuntimeError("Hydraulic scalar transport solve did not converge")
    concentration.x.scatter_forward()

    ds = ufl.Measure("ds", domain=domain, subdomain_data=mesh_data.facet_tags)
    normal = ufl.FacetNormal(domain)
    species_flux = concentration * velocity - effective_diffusivity_m2_s * \
        ufl.grad(concentration)

    def integrated(form: Any) -> float:
        local = fem.assemble_scalar(fem.form(form))
        return domain.comm.allreduce(float(local), op=MPI.SUM)

    inlet_group = groups[f"boundary:{inlet_tag}"]
    outlet_group = groups[f"boundary:{outlet_tag}"]
    inlet_rate = integrated(ufl.dot(species_flux, normal) * ds(inlet_group.tag))
    outlet_rate = integrated(ufl.dot(species_flux, normal) * ds(outlet_group.tag))
    wall_rate = math.fsum(
        integrated(ufl.dot(species_flux, normal) * ds(tag)) for tag in wall_ids
    )
    production_rate = integrated(fem.Constant(domain, PETSc.ScalarType(source_rate)) * dx)
    consumption_rate = integrated(loss_rate * concentration * dx)
    balance_scale = max(abs(inlet_rate) + abs(outlet_rate) + abs(wall_rate) + production_rate + consumption_rate, 1e-30)
    relative_balance = abs(inlet_rate + outlet_rate + wall_rate - production_rate + consumption_rate) / balance_scale

    inlet_measure = integrated(1.0 * ds(inlet_group.tag))
    if inlet_measure <= 0:
        raise ValueError("Transport inlet must have positive measure")
    darcy_speed = abs(integrated(ufl.dot(velocity, normal) * ds(inlet_group.tag))) / inlet_measure
    peclet = darcy_speed * characteristic_length_m / effective_diffusivity_m2_s
    local_values = concentration.x.array[:]
    minimum = domain.comm.allreduce(float(np.min(local_values)), op=MPI.MIN)
    maximum = domain.comm.allreduce(float(np.max(local_values)), op=MPI.MAX)
    diagnostics = (inlet_rate, outlet_rate, wall_rate, production_rate, consumption_rate, relative_balance, peclet, minimum, maximum)
    if any(not math.isfinite(value) for value in diagnostics):
        raise RuntimeError("Hydraulic transport produced non-finite diagnostics")
    if minimum < -1e-9 * max(1.0, maximum):
        raise RuntimeError("Hydraulic transport produced a materially negative concentration")
    return PlanarScalarTransportResult(
        concentration=concentration,
        inlet_species_rate_mol_m_s_per_depth=inlet_rate,
        outlet_species_rate_mol_m_s_per_depth=outlet_rate,
        wall_species_rate_mol_m_s_per_depth=wall_rate,
        production_rate_mol_m_s_per_depth=production_rate,
        consumption_rate_mol_m_s_per_depth=consumption_rate,
        relative_species_balance=relative_balance,
        peclet_number=peclet,
        minimum_concentration_mol_m3=minimum,
        maximum_concentration_mol_m3=maximum,
        linear_iterations=int(problem.solver.getIterationNumber()),
        linear_converged_reason=reason,
    )
