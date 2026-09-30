"""Restricted homogeneous porous Darcy verification kernel (EQ-FL-003)."""

from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Any

from mpi4py import MPI
import numpy as np
from petsc4py import PETSc
import ufl
from dolfinx import fem, mesh as dolfinx_mesh
from dolfinx.fem.petsc import LinearProblem


@dataclass(frozen=True)
class PlanarDarcyResult:
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


def solve_planar_darcy(
    mesh_data: Any,
    *,
    porous_region_tag: str,
    permeability_m2: float,
    viscosity_pa_s: float,
    inlet_tag: str,
    outlet_tag: str,
    inlet_pressure_pa: float,
    outlet_pressure_pa: float,
) -> PlanarDarcyResult:
    """Solve div((k/μ) grad(p))=0 on one homogeneous porous 2D region.

    Inlet/outlet pressures are Dirichlet data; the two side walls are natural
    zero-flux boundaries. The reported Darcy velocity is -(k/μ) grad(p).
    Bulk-liquid coupling, heterogeneous permeability, Brinkman drag and
    transient flow are intentionally outside this development kernel.
    """
    domain = mesh_data.mesh
    if domain.topology.dim != 2 or domain.geometry.dim != 2:
        raise ValueError("Planar Darcy requires a two-dimensional mesh")
    for name, value in (("permeability", permeability_m2), ("viscosity", viscosity_pa_s)):
        if isinstance(value, bool) or not isinstance(value, (int, float)) or \
                not math.isfinite(value) or value <= 0:
            raise ValueError(f"Darcy {name} must be finite and positive")
    for name, value in (("inlet pressure", inlet_pressure_pa),
                        ("outlet pressure", outlet_pressure_pa)):
        if isinstance(value, bool) or not isinstance(value, (int, float)) or \
                not math.isfinite(value):
            raise ValueError(f"Darcy {name} must be finite and expressed in Pa")
    if inlet_tag == outlet_tag:
        raise ValueError("Darcy inlet and outlet tags must be distinct")
    if mesh_data.cell_tags is None or mesh_data.facet_tags is None:
        raise ValueError("Tagged cells and exterior facets are required")
    groups = mesh_data.physical_groups
    region = groups.get(porous_region_tag)
    if region is None or region.dim != 2:
        raise ValueError("A declared porous cell group is required")
    owned_cells = domain.topology.index_map(2).size_local
    tagged_owned = mesh_data.cell_tags.indices < owned_cells
    invalid_cells = (
        not np.array_equal(mesh_data.cell_tags.indices[tagged_owned], np.arange(owned_cells))
        or np.any(mesh_data.cell_tags.values[tagged_owned] != region.tag)
    )
    if domain.comm.allreduce(int(invalid_cells), op=MPI.SUM):
        raise ValueError("Darcy development solve requires one porous-region mesh")
    if domain.comm.allreduce(owned_cells, op=MPI.SUM) == 0:
        raise ValueError("Darcy mesh has no cells")

    domain.topology.create_connectivity(1, 2)
    exterior = dolfinx_mesh.exterior_facet_indices(domain.topology)
    for name in (inlet_tag, outlet_tag):
        group = groups.get(name)
        if group is None or group.dim != 1:
            raise ValueError(f"Missing exterior facet group {name}")
        facets = mesh_data.facet_tags.find(group.tag)
        if domain.comm.allreduce(len(facets), op=MPI.SUM) == 0:
            raise ValueError(f"Missing exterior facet group {name}")
        if domain.comm.allreduce(int(np.count_nonzero(~np.isin(facets, exterior))), op=MPI.SUM):
            raise ValueError(f"Darcy pressure group {name} includes an interior interface")

    space = fem.functionspace(domain, ("Lagrange", 1))
    inlet_group = groups[inlet_tag]
    outlet_group = groups[outlet_tag]
    inlet_facets = mesh_data.facet_tags.find(inlet_group.tag)
    outlet_facets = mesh_data.facet_tags.find(outlet_group.tag)
    inlet_dofs = fem.locate_dofs_topological(space, 1, inlet_facets)
    outlet_dofs = fem.locate_dofs_topological(space, 1, outlet_facets)
    if domain.comm.allreduce(len(inlet_dofs), op=MPI.SUM) == 0 or \
            domain.comm.allreduce(len(outlet_dofs), op=MPI.SUM) == 0:
        raise ValueError("Darcy pressure boundaries must have degrees of freedom")
    inlet_value = fem.Function(space)
    outlet_value = fem.Function(space)
    inlet_value.x.array[:] = float(inlet_pressure_pa)
    outlet_value.x.array[:] = float(outlet_pressure_pa)
    inlet_value.x.scatter_forward()
    outlet_value.x.scatter_forward()
    bcs = [
        fem.dirichletbc(inlet_value, inlet_dofs),
        fem.dirichletbc(outlet_value, outlet_dofs),
    ]

    pressure_trial = ufl.TrialFunction(space)
    test = ufl.TestFunction(space)
    mobility = float(permeability_m2) / float(viscosity_pa_s)
    bilinear = mobility * ufl.inner(ufl.grad(pressure_trial), ufl.grad(test)) * ufl.dx
    linear = fem.Constant(domain, PETSc.ScalarType(0.0)) * test * ufl.dx
    problem = LinearProblem(
        bilinear,
        linear,
        bcs=bcs,
        petsc_options_prefix=f"metrev_darcy_{len(mesh_data.cell_tags.values)}_",
        petsc_options={
            "ksp_type": "preonly",
            "pc_type": "lu",
            "ksp_error_if_not_converged": True,
        },
    )
    pressure = problem.solve()
    reason = int(problem.solver.getConvergedReason())
    if reason <= 0:
        raise RuntimeError("Darcy linear solve did not converge")
    pressure.x.scatter_forward()

    import basix.ufl

    velocity_space = fem.functionspace(
        domain,
        basix.ufl.element("Lagrange", domain.basix_cell(), 1, shape=(2,)),
    )
    velocity = fem.Function(velocity_space)
    darcy_expression = -mobility * ufl.grad(pressure)
    velocity.interpolate(
        fem.Expression(darcy_expression, velocity_space.element.interpolation_points())
    )
    velocity.x.scatter_forward()

    ds = ufl.Measure("ds", domain=domain, subdomain_data=mesh_data.facet_tags)
    normal = ufl.FacetNormal(domain)

    def integrated(form: Any) -> float:
        local = fem.assemble_scalar(fem.form(form))
        return domain.comm.allreduce(float(local), op=MPI.SUM)

    inlet_measure = integrated(1.0 * ds(inlet_group.tag))
    outlet_measure = integrated(1.0 * ds(outlet_group.tag))
    if inlet_measure <= 0.0 or outlet_measure <= 0.0:
        raise ValueError("Darcy inlet and outlet facets must have positive measure")
    inlet_flow = -integrated(ufl.dot(velocity, normal) * ds(inlet_group.tag))
    outlet_flow = integrated(ufl.dot(velocity, normal) * ds(outlet_group.tag))
    flow_scale = max(abs(inlet_flow), abs(outlet_flow), 1e-30)
    balance = abs(inlet_flow - outlet_flow) / flow_scale
    inlet_pressure = integrated(pressure * ds(inlet_group.tag)) / inlet_measure
    outlet_pressure = integrated(pressure * ds(outlet_group.tag)) / outlet_measure
    divergence_l2 = math.sqrt(max(0.0, integrated(ufl.div(velocity) ** 2 * ufl.dx)))
    return PlanarDarcyResult(
        velocity=velocity,
        pressure=pressure,
        inlet_flow_m2_s_per_depth=inlet_flow,
        outlet_flow_m2_s_per_depth=outlet_flow,
        relative_flow_balance=balance,
        mean_inlet_pressure_pa=inlet_pressure,
        mean_outlet_pressure_pa=outlet_pressure,
        divergence_l2_per_s=divergence_l2,
        linear_iterations=int(problem.solver.getIterationNumber()),
        linear_converged_reason=reason,
    )
