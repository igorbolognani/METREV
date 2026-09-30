"""Pinned-container Gmsh -> DOLFINx/PETSc numerical verification gate.

The affine Poisson, layered diffusion and Stokes channel cases are synthetic
fixtures, not a METREV cell solver. Run this only inside
apps/spatial-sidecar/Dockerfile; the ordinary Python suite stays lean.
"""

import hashlib
import json
import math
from pathlib import Path
import tempfile
import uuid
import xml.etree.ElementTree as ET

from mpi4py import MPI
import numpy as np
from petsc4py import PETSc
import ufl
from dolfinx import fem, mesh
from dolfinx.fem.petsc import LinearProblem
from dolfinx.io import gmsh as gmshio

from metrev_spatial.__main__ import run
from metrev_spatial.darcy import solve_planar_darcy
from metrev_spatial.darcy_transport import solve_planar_darcy_transport
from metrev_spatial.stokes import solve_planar_stokes


def solve_affine(mesh_data, gradient: tuple[float, ...]) -> tuple[float, int]:
    domain = mesh_data.mesh
    dimension = domain.topology.dim
    space = fem.functionspace(domain, ("Lagrange", 1))
    boundary = fem.Function(space)
    boundary.interpolate(lambda x: np.asarray(gradient) @ x[:dimension])
    exterior = mesh.locate_entities_boundary(
        domain, dimension - 1, lambda x: np.full(x.shape[1], True)
    )
    dofs = fem.locate_dofs_topological(space, dimension - 1, exterior)
    assert len(dofs) > 0
    bc = fem.dirichletbc(boundary, dofs)
    trial = ufl.TrialFunction(space)
    test = ufl.TestFunction(space)
    bilinear = ufl.inner(ufl.grad(trial), ufl.grad(test)) * ufl.dx
    linear = fem.Constant(domain, PETSc.ScalarType(0)) * test * ufl.dx
    problem = LinearProblem(
        bilinear,
        linear,
        bcs=[bc],
        petsc_options_prefix=f"metrev_toolchain_smoke_{dimension}d_",
        petsc_options={"ksp_type": "preonly", "pc_type": "lu", "ksp_error_if_not_converged": True},
    )
    solved = problem.solve()
    error = float(np.max(np.abs(solved.x.array - boundary.x.array)))
    assert np.isfinite(error) and error < 1e-10, error
    return error, len(mesh_data.cell_tags.values)


def solve_layered_diffusion(mesh_data, layers: list[dict], height: float) -> dict:
    """Check exact flux continuity for synthetic diffusion across tagged layers."""
    domain = mesh_data.mesh
    dimension = domain.topology.dim
    assert dimension == 2

    # Synthetic coefficients exercise the tagged-material assembly path; they
    # are numerical fixtures and do not represent measured METREV parameters.
    diffusivity_by_tag = {"anode": 1.0, "biofilm": 0.25, "liquid": 2.0}
    assert set(diffusivity_by_tag) == {layer["tag"] for layer in layers}
    widths = [float(layer["width_m"]["value"]) for layer in layers]
    coefficients = [diffusivity_by_tag[layer["tag"]] for layer in layers]
    resistance = [width / coefficient for width, coefficient in zip(widths, coefficients)]
    expected_flux = 1.0 / sum(resistance)

    coefficient_space = fem.functionspace(domain, ("DG", 0))
    diffusivity = fem.Function(coefficient_space)
    diffusivity.x.array[:] = np.nan
    for layer, value in zip(layers, coefficients):
        physical_group = mesh_data.physical_groups[f"region:{layer['tag']}"]
        cells = mesh_data.cell_tags.find(physical_group.tag)
        assert len(cells) > 0, layer["tag"]
        for cell in cells:
            dofs = coefficient_space.dofmap.cell_dofs(int(cell))
            diffusivity.x.array[dofs] = value
    diffusivity.x.scatter_forward()
    assert np.all(np.isfinite(diffusivity.x.array))

    def exact_solution(x):
        position = np.asarray(x[0])
        accumulated_resistance = np.zeros_like(position, dtype=np.float64)
        start = 0.0
        for width, coefficient in zip(widths, coefficients):
            accumulated_resistance += np.clip(position - start, 0.0, width) / coefficient
            start += width
        return expected_flux * accumulated_resistance

    solution_space = fem.functionspace(domain, ("Lagrange", 1))
    exact_values = fem.Function(solution_space)
    exact_values.interpolate(exact_solution)
    x_end = sum(widths)
    tolerance = max(1e-12, x_end * 1e-10)
    left_facets = mesh.locate_entities_boundary(
        domain,
        dimension - 1,
        lambda x: np.isclose(x[0], 0.0, atol=tolerance, rtol=0.0),
    )
    right_facets = mesh.locate_entities_boundary(
        domain,
        dimension - 1,
        lambda x: np.isclose(x[0], x_end, atol=tolerance, rtol=0.0),
    )
    left_dofs = fem.locate_dofs_topological(
        solution_space, dimension - 1, left_facets
    )
    right_dofs = fem.locate_dofs_topological(
        solution_space, dimension - 1, right_facets
    )
    assert len(left_dofs) > 0 and len(right_dofs) > 0
    bcs = [
        fem.dirichletbc(exact_values, left_dofs),
        fem.dirichletbc(exact_values, right_dofs),
    ]

    trial = ufl.TrialFunction(solution_space)
    test = ufl.TestFunction(solution_space)
    bilinear = diffusivity * ufl.inner(ufl.grad(trial), ufl.grad(test)) * ufl.dx
    linear = fem.Constant(domain, PETSc.ScalarType(0)) * test * ufl.dx
    problem = LinearProblem(
        bilinear,
        linear,
        bcs=bcs,
        petsc_options_prefix=(
            f"metrev_layered_diffusion_{len(mesh_data.cell_tags.values)}_"
        ),
        petsc_options={
            "ksp_type": "preonly",
            "pc_type": "lu",
            "ksp_error_if_not_converged": True,
        },
    )
    solved = problem.solve()
    local_error = float(np.max(np.abs(solved.x.array - exact_values.x.array), initial=0.0))
    max_nodal_error = domain.comm.allreduce(local_error, op=MPI.MAX)

    measure_ds = ufl.Measure("ds", domain=domain, subdomain_data=mesh_data.facet_tags)

    def integrated_x_flux(boundary_name: str) -> float:
        physical_group = mesh_data.physical_groups[boundary_name]
        local_flux = fem.assemble_scalar(
            fem.form(diffusivity * ufl.grad(solved)[0] * measure_ds(physical_group.tag))
        )
        return domain.comm.allreduce(float(local_flux), op=MPI.SUM)

    left_flux = integrated_x_flux("boundary:anode_contact")
    right_flux = integrated_x_flux("boundary:outer_wall")
    relative_error = max(
        abs(left_flux - expected_flux * height),
        abs(right_flux - expected_flux * height),
    ) / (expected_flux * height)
    interface_measure = ufl.Measure(
        "dS", domain=domain, subdomain_data=mesh_data.facet_tags
    )
    normal = ufl.FacetNormal(domain)
    interface_flux_jumps = []
    for left_layer, right_layer in zip(layers, layers[1:]):
        interface_name = (
            f"interface:{left_layer['tag']}:{right_layer['tag']}"
        )
        physical_group = mesh_data.physical_groups[interface_name]
        local_jump = fem.assemble_scalar(
            fem.form(
                abs(ufl.jump(diffusivity * ufl.grad(solved), normal))
                * interface_measure(physical_group.tag)
            )
        )
        global_jump = domain.comm.allreduce(float(local_jump), op=MPI.SUM)
        interface_flux_jumps.append(global_jump / (expected_flux * height))
    interface_flux_jump = max(interface_flux_jumps)
    assert max_nodal_error < 1e-9, max_nodal_error
    assert relative_error < 1e-8, relative_error
    assert interface_flux_jump < 1e-8, interface_flux_jump
    return {
        "cell_count": len(mesh_data.cell_tags.values),
        "max_nodal_error": max_nodal_error,
        "boundary_flux_relative_error": relative_error,
        "interface_flux_relative_jump": interface_flux_jump,
    }


def create_stokes_channel_mesh(path: Path, characteristic_length: float) -> None:
    """Create a synthetic bulk-liquid channel with named no-slip/pressure boundaries."""
    import gmsh

    width_m = 0.01
    length_m = 0.01
    gmsh.initialize()
    try:
        gmsh.option.setNumber("General.Terminal", 0)
        gmsh.option.setNumber("Mesh.MshFileVersion", 4.1)
        gmsh.option.setNumber("Mesh.Binary", 0)
        gmsh.option.setNumber("Mesh.Algorithm", 6)
        gmsh.model.add("metrev-stokes-channel-fixture")
        corners = [
            gmsh.model.geo.addPoint(0.0, 0.0, 0.0, characteristic_length),
            gmsh.model.geo.addPoint(width_m, 0.0, 0.0, characteristic_length),
            gmsh.model.geo.addPoint(width_m, length_m, 0.0, characteristic_length),
            gmsh.model.geo.addPoint(0.0, length_m, 0.0, characteristic_length),
        ]
        bottom, right, top, left = [
            gmsh.model.geo.addLine(corners[index], corners[(index + 1) % 4])
            for index in range(4)
        ]
        loop = gmsh.model.geo.addCurveLoop([bottom, right, top, left])
        surface = gmsh.model.geo.addPlaneSurface([loop])
        gmsh.model.geo.synchronize()

        gmsh.model.addPhysicalGroup(2, [surface], 1)
        gmsh.model.setPhysicalName(2, 1, "region:bulk_liquid")
        gmsh.model.addPhysicalGroup(1, [left, right], 11)
        gmsh.model.setPhysicalName(1, 11, "boundary:wall")
        gmsh.model.addPhysicalGroup(1, [bottom], 12)
        gmsh.model.setPhysicalName(1, 12, "boundary:inlet")
        gmsh.model.addPhysicalGroup(1, [top], 13)
        gmsh.model.setPhysicalName(1, 13, "boundary:outlet")
        gmsh.model.mesh.generate(2)
        gmsh.write(str(path))
    finally:
        gmsh.finalize()


def solve_stokes_poiseuille(mesh_data, width_m: float, length_m: float,
                           viscosity_pa_s: float, pressure_drop_pa: float) -> dict:
    """Solve a pressure-driven Taylor-Hood Stokes channel verification fixture."""
    domain = mesh_data.mesh
    assert domain.topology.dim == 2
    normal = ufl.FacetNormal(domain)
    dx = ufl.Measure("dx", domain=domain)
    viscosity = fem.Constant(domain, PETSc.ScalarType(viscosity_pa_s))
    inlet_pressure = fem.Constant(domain, PETSc.ScalarType(pressure_drop_pa))
    cross_channel_coordinate = ufl.SpatialCoordinate(domain)[0]
    exact_shear_rate = (
        inlet_pressure
        * (width_m - 2.0 * cross_channel_coordinate)
        / (2.0 * viscosity * length_m)
    )

    def exact_traction(boundary_pressure):
        return ufl.as_vector(
            (
                -boundary_pressure * normal[0]
                + viscosity * exact_shear_rate * normal[1],
                -boundary_pressure * normal[1]
                + viscosity * exact_shear_rate * normal[0],
            )
        )

    solved = solve_planar_stokes(
        mesh_data, liquid_region_tag="region:bulk_liquid", viscosity_pa_s=viscosity_pa_s,
        wall_tags=("boundary:wall",), inlet_tag="boundary:inlet", outlet_tag="boundary:outlet",
        traction_by_tag={
            "boundary:inlet": exact_traction(inlet_pressure),
            "boundary:outlet": exact_traction(fem.Constant(domain, PETSc.ScalarType(0.0))),
        },
    )
    solved_velocity, solved_pressure = solved.velocity, solved.pressure
    velocity_space = solved_velocity.function_space

    exact_velocity = fem.Function(velocity_space)
    exact_velocity.interpolate(
        lambda x: np.asarray(
            [
                np.zeros_like(x[0]),
                pressure_drop_pa
                * x[0]
                * (width_m - x[0])
                / (2.0 * viscosity_pa_s * length_m),
            ]
        )
    )
    exact_pressure_space = solved_pressure.function_space
    exact_pressure = fem.Function(exact_pressure_space)
    exact_pressure.interpolate(
        lambda x: pressure_drop_pa * (1.0 - x[1] / length_m)
    )
    exact_velocity.x.scatter_forward()
    exact_pressure.x.scatter_forward()

    def global_integral(form) -> float:
        local = fem.assemble_scalar(fem.form(form))
        return domain.comm.allreduce(float(local), op=MPI.SUM)

    velocity_error = np.sqrt(
        max(
            0.0,
            global_integral(
                ufl.inner(solved_velocity - exact_velocity, solved_velocity - exact_velocity)
                * dx
            ),
        )
    )
    velocity_norm = np.sqrt(
        global_integral(ufl.inner(exact_velocity, exact_velocity) * dx)
    )
    pressure_error = np.sqrt(
        max(
            0.0,
            global_integral((solved_pressure - exact_pressure) ** 2 * dx),
        )
    )
    pressure_norm = np.sqrt(global_integral(exact_pressure**2 * dx))

    mean_inlet_pressure = solved.mean_inlet_pressure_pa
    mean_outlet_pressure = solved.mean_outlet_pressure_pa
    inlet_flow = solved.inlet_flow_m2_s_per_depth
    outlet_flow = solved.outlet_flow_m2_s_per_depth
    expected_flow = pressure_drop_pa * width_m**3 / (
        12.0 * viscosity_pa_s * length_m
    )
    flow_balance_error = abs(inlet_flow - outlet_flow) / expected_flow
    pressure_drop_error = abs(
        (mean_inlet_pressure - mean_outlet_pressure) - pressure_drop_pa
    ) / pressure_drop_pa
    relative_velocity_error = velocity_error / velocity_norm
    relative_pressure_error = pressure_error / pressure_norm

    assert relative_velocity_error < 1e-7, relative_velocity_error
    assert relative_pressure_error < 1e-7, relative_pressure_error
    assert flow_balance_error < 1e-8, flow_balance_error
    assert pressure_drop_error < 1e-7, pressure_drop_error
    assert inlet_flow > 0.0 and outlet_flow > 0.0
    assert solved.linear_converged_reason > 0
    assert solved.divergence_l2_per_s < 1e-8
    return {
        "cell_count": len(mesh_data.cell_tags.values),
        "relative_velocity_l2_error": relative_velocity_error,
        "relative_pressure_l2_error": relative_pressure_error,
        "relative_flow_balance_error": flow_balance_error,
        "relative_pressure_drop_error": pressure_drop_error,
        "inlet_flow_m2_s_per_depth": inlet_flow,
        "outlet_flow_m2_s_per_depth": outlet_flow,
        "expected_flow_m2_s_per_depth": expected_flow,
        "divergence_l2_per_s": solved.divergence_l2_per_s,
        "linear_iterations": solved.linear_iterations,
    }


def create_tetrahedral_mesh(path: Path) -> None:
    import gmsh

    gmsh.initialize()
    try:
        gmsh.option.setNumber("General.Terminal", 0)
        gmsh.option.setNumber("Mesh.MshFileVersion", 4.1)
        gmsh.option.setNumber("Mesh.Binary", 0)
        gmsh.model.add("metrev-affine-cube")
        volume = gmsh.model.occ.addBox(0, 0, 0, 1, 1, 1)
        gmsh.model.occ.synchronize()
        boundary_surfaces = [
            tag for dimension, tag in gmsh.model.getBoundary(
                [(3, volume)], oriented=False, recursive=False
            ) if dimension == 2
        ]
        gmsh.model.addPhysicalGroup(3, [volume], 1)
        gmsh.model.setPhysicalName(3, 1, "region:verification_cube")
        gmsh.model.addPhysicalGroup(2, boundary_surfaces, 11)
        gmsh.model.setPhysicalName(2, 11, "boundary:all_exterior")
        gmsh.model.mesh.generate(3)
        gmsh.write(str(path))
    finally:
        gmsh.finalize()


def run_planar_stokes_sidecar(fixture_mesh: dict) -> dict:
    """Exercise request admission, mesh identity and XDMF/HDF5 output binding."""
    mesh_recipe = json.loads(json.dumps(fixture_mesh))
    mesh_recipe["layers"] = [mesh_recipe["layers"][2]]
    mesh_recipe["boundaries"]["left"] = {"tag": "west", "role": "wall"}
    mesh_recipe["boundaries"]["right"] = {"tag": "east", "role": "wall"}
    mesh_recipe["refinement_factors"] = [1]
    mesh_request = {
        "protocol_version": "spatial-sidecar-v1",
        "request_id": str(uuid.uuid4()),
        "operation": "planar_mesh",
        "mesh": mesh_recipe,
    }
    source = {"value": 0.0, "unit": "Pa", "source_kind": "test_fixture",
              "source_ref": "tests/contracts/spatial_toolchain_smoke.py"}
    stokes_request = {
        "protocol_version": "spatial-sidecar-v1",
        "request_id": str(uuid.uuid4()),
        "operation": "planar_stokes",
        "mesh_request": mesh_request,
        "mesh_sha256": "0" * 64,
        "refinement_factor": 1,
        "model_input_contract_version": "spatial-input-v2",
        "model_input_sha256": "1" * 64,
        "setup": {
            "regime": "steady_stokes",
            "equation_ref": "EQ-FL-002",
            "domain_tag": "liquid",
            "viscosity_parameter_id": "dynamic_viscosity_pa_s",
            "pressure_variable": "pressure",
            "velocity_variables": {"x": "velocity_x", "y": "velocity_y"},
            "wall_tags": ["west", "east"],
            "inlet": {"tag": "inlet", "traction_pa": [{**source}, {**source, "value": 1e-7}]},
            "outlet": {"tag": "outlet", "traction_pa": [{**source}, {**source}]},
        },
        "viscosity": {"value": 1e-3, "unit": "Pa*s", "source_kind": "test_fixture",
                      "source_ref": "tests/contracts/spatial_toolchain_smoke.py"},
    }
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        mesh_directory = root / "mesh"
        mesh_response = run(
            json.dumps(mesh_request, separators=(",", ":")).encode(), mesh_directory
        )
        assert mesh_response["status"] == "ok", mesh_response
        stokes_request["mesh_sha256"] = mesh_response["artifacts"][0]["sha256"]
        solution_directory = root / "solution"
        response = run(
            json.dumps(stokes_request, separators=(",", ":")).encode(), solution_directory
        )
        assert response["status"] == "ok", response
        assert response["model_input_contract_version"] == "spatial-input-v2"
        assert response["field_representation"] == "lagrange_p1_interpolation"
        assert response["model_input_sha256"] == stokes_request["model_input_sha256"]
        assert response["mesh"]["sha256"] == stokes_request["mesh_sha256"]
        assert response["diagnostics"]["linear_converged_reason"] > 0
        assert response["diagnostics"]["inlet_flow_m2_s_per_depth"] > 0
        assert response["diagnostics"]["outlet_flow_m2_s_per_depth"] > 0
        assert response["diagnostics"]["relative_flow_balance"] < 1e-8
        xdmf = solution_directory / "stokes-solution.xdmf"
        hdf5 = solution_directory / "stokes-solution.h5"
        assert xdmf.is_file() and hdf5.is_file() and hdf5.stat().st_size > 0
        data_paths = {
            item.attrib["Name"]: (item.findtext("DataItem") or "").strip().split(":", 1)[-1]
            for item in ET.parse(xdmf).getroot().findall(".//Attribute")
        }
        assert data_paths == {
            "velocity_x": "/Function/velocity_x/0",
            "velocity_y": "/Function/velocity_y/0",
            "pressure": "/Function/pressure/0",
        }, data_paths
        for artifact in (response["mesh"], *response["solution_artifacts"]):
            data = (solution_directory / artifact["path"]).read_bytes()
            assert len(data) == artifact["bytes"]
            assert hashlib.sha256(data).hexdigest() == artifact["sha256"]
        return {"cell_count": response["mesh"]["cell_count"],
                "relative_flow_balance": response["diagnostics"]["relative_flow_balance"],
                "field_dataset_names": [field["field_name"] for field in response["field_datasets"]]}


def run_planar_darcy_sidecar(fixture_mesh: dict) -> dict:
    """Verify Darcy pressure/flow against a homogeneous porous slab solution."""
    permeability_m2 = 1e-10
    viscosity_pa_s = 1e-3
    inlet_pressure_pa = 10.0
    outlet_pressure_pa = 0.0
    length_m = height_m = 0.01
    mesh_recipe = json.loads(json.dumps(fixture_mesh))
    mesh_recipe["height_m"]["value"] = height_m
    mesh_recipe["layers"] = [{
        **mesh_recipe["layers"][1],
        "tag": "porous",
        "kind": "biofilm",
        "width_m": {**mesh_recipe["layers"][1]["width_m"], "value": length_m},
    }]
    mesh_recipe["target_size_m"]["value"] = 0.002
    mesh_recipe["boundaries"] = {
        "left": {"tag": "west", "role": "inlet"},
        "right": {"tag": "east", "role": "outlet"},
        "top": {"tag": "north", "role": "wall"},
        "bottom": {"tag": "south", "role": "wall"},
    }
    mesh_recipe["refinement_factors"] = [1]
    mesh_request = {
        "protocol_version": "spatial-sidecar-v1",
        "request_id": str(uuid.uuid4()),
        "operation": "planar_mesh",
        "mesh": mesh_recipe,
    }
    source = {"source_kind": "test_fixture",
              "source_ref": "tests/contracts/spatial_toolchain_smoke.py"}
    darcy_request = {
        "protocol_version": "spatial-sidecar-v1",
        "request_id": str(uuid.uuid4()),
        "operation": "planar_darcy",
        "mesh_request": mesh_request,
        "mesh_sha256": "0" * 64,
        "refinement_factor": 1,
        "model_input_contract_version": "spatial-input-v2",
        "model_input_sha256": "1" * 64,
        "setup": {
            "regime": "steady_darcy",
            "equation_ref": "EQ-FL-003",
            "domain_tag": "porous",
            "viscosity_parameter_id": "dynamic_viscosity_pa_s",
            "permeability_parameter_id": "hydraulic_permeability_m2",
            "pressure_variable": "pressure",
            "velocity_variables": {"x": "velocity_x", "y": "velocity_y"},
            "inlet": {"tag": "west", "pressure_pa": {"value": inlet_pressure_pa, "unit": "Pa", **source}},
            "outlet": {"tag": "east", "pressure_pa": {"value": outlet_pressure_pa, "unit": "Pa", **source}},
        },
        "viscosity": {"value": viscosity_pa_s, "unit": "Pa*s", **source},
        "permeability": {"value": permeability_m2, "unit": "m2", **source},
    }
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        mesh_directory = root / "mesh"
        mesh_response = run(
            json.dumps(mesh_request, separators=(",", ":")).encode(), mesh_directory
        )
        assert mesh_response["status"] == "ok", mesh_response
        selected_mesh = mesh_response["artifacts"][0]
        darcy_request["mesh_sha256"] = selected_mesh["sha256"]

        mesh_data = gmshio.read_from_msh(
            mesh_directory / selected_mesh["path"], MPI.COMM_WORLD, gdim=2
        )
        solved = solve_planar_darcy(
            mesh_data,
            porous_region_tag="region:porous",
            permeability_m2=permeability_m2,
            viscosity_pa_s=viscosity_pa_s,
            inlet_tag="boundary:west",
            outlet_tag="boundary:east",
            inlet_pressure_pa=inlet_pressure_pa,
            outlet_pressure_pa=outlet_pressure_pa,
        )
        exact_pressure = fem.Function(solved.pressure.function_space)
        exact_pressure.interpolate(
            lambda x: inlet_pressure_pa + (outlet_pressure_pa - inlet_pressure_pa)
            * x[0] / length_m
        )
        exact_velocity = fem.Function(solved.velocity.function_space)
        exact_velocity.interpolate(
            lambda x: np.asarray([
                np.full_like(x[0], permeability_m2 / viscosity_pa_s
                             * (inlet_pressure_pa - outlet_pressure_pa) / length_m),
                np.zeros_like(x[0]),
            ])
        )
        exact_pressure.x.scatter_forward()
        exact_velocity.x.scatter_forward()

        def global_integral(form) -> float:
            local = fem.assemble_scalar(fem.form(form))
            return mesh_data.mesh.comm.allreduce(float(local), op=MPI.SUM)

        dx = ufl.Measure("dx", domain=mesh_data.mesh)
        pressure_norm = np.sqrt(global_integral(exact_pressure**2 * dx))
        pressure_error = np.sqrt(global_integral((solved.pressure - exact_pressure)**2 * dx))
        velocity_norm = np.sqrt(global_integral(ufl.inner(exact_velocity, exact_velocity) * dx))
        velocity_error = np.sqrt(global_integral(
            ufl.inner(solved.velocity - exact_velocity, solved.velocity - exact_velocity) * dx
        ))
        relative_pressure_error = pressure_error / pressure_norm
        relative_velocity_error = velocity_error / velocity_norm
        expected_flow = (
            permeability_m2 / viscosity_pa_s
            * (inlet_pressure_pa - outlet_pressure_pa) / length_m
            * height_m
        )
        assert relative_pressure_error < 1e-8, relative_pressure_error
        assert relative_velocity_error < 1e-8, relative_velocity_error
        assert abs(solved.inlet_flow_m2_s_per_depth - expected_flow) / expected_flow < 1e-8
        assert abs(solved.outlet_flow_m2_s_per_depth - expected_flow) / expected_flow < 1e-8
        assert solved.relative_flow_balance < 1e-8
        assert solved.divergence_l2_per_s < 1e-8
        assert solved.linear_converged_reason > 0

        solution_directory = root / "solution"
        response = run(
            json.dumps(darcy_request, separators=(",", ":")).encode(),
            solution_directory,
        )
        assert response["status"] == "ok", response
        assert response["model_input_sha256"] == darcy_request["model_input_sha256"]
        assert response["mesh"]["sha256"] == darcy_request["mesh_sha256"]
        assert response["diagnostics"]["linear_converged_reason"] > 0
        assert response["diagnostics"]["inlet_flow_m2_s_per_depth"] > 0
        assert response["diagnostics"]["outlet_flow_m2_s_per_depth"] > 0
        assert response["diagnostics"]["relative_flow_balance"] < 1e-8
        assert response["diagnostics"]["divergence_l2_per_s"] < 1e-8
        xdmf = solution_directory / "darcy-solution.xdmf"
        hdf5 = solution_directory / "darcy-solution.h5"
        assert xdmf.is_file() and hdf5.is_file() and hdf5.stat().st_size > 0
        data_paths = {
            item.attrib["Name"]: (item.findtext("DataItem") or "").strip().split(":", 1)[-1]
            for item in ET.parse(xdmf).getroot().findall(".//Attribute")
        }
        assert data_paths == {
            "velocity_x": "/Function/velocity_x/0",
            "velocity_y": "/Function/velocity_y/0",
            "pressure": "/Function/pressure/0",
        }, data_paths
        for artifact in (response["mesh"], *response["solution_artifacts"]):
            data = (solution_directory / artifact["path"]).read_bytes()
            assert len(data) == artifact["bytes"]
            assert hashlib.sha256(data).hexdigest() == artifact["sha256"]
        return {
            "cell_count": response["mesh"]["cell_count"],
            "relative_pressure_l2_error": relative_pressure_error,
            "relative_velocity_l2_error": relative_velocity_error,
            "relative_flow_balance": response["diagnostics"]["relative_flow_balance"],
        }


def run_planar_darcy_transport_sidecar(fixture_mesh: dict) -> dict:
    """Verify solved Darcy velocity drives an analytic passive-scalar profile."""
    permeability_m2 = 1e-12
    viscosity_pa_s = 1e-3
    inlet_pressure_pa, outlet_pressure_pa = 1.0, 0.0
    inlet_concentration_mol_m3, outlet_concentration_mol_m3 = 2.0, 1.0
    effective_diffusivity_m2_s = 1e-9
    length_m = height_m = 0.01
    mesh_recipe = json.loads(json.dumps(fixture_mesh))
    mesh_recipe["height_m"]["value"] = height_m
    mesh_recipe["layers"] = [{
        **mesh_recipe["layers"][1],
        "tag": "porous",
        "kind": "biofilm",
        "width_m": {**mesh_recipe["layers"][1]["width_m"], "value": length_m},
    }]
    mesh_recipe["target_size_m"]["value"] = 0.00025
    mesh_recipe["boundaries"] = {
        "left": {"tag": "west", "role": "inlet"},
        "right": {"tag": "east", "role": "outlet"},
        "top": {"tag": "north", "role": "wall"},
        "bottom": {"tag": "south", "role": "wall"},
    }
    mesh_recipe["refinement_factors"] = [1]
    mesh_request = {
        "protocol_version": "spatial-sidecar-v1",
        "request_id": str(uuid.uuid4()),
        "operation": "planar_mesh",
        "mesh": mesh_recipe,
    }
    source = {"source_kind": "test_fixture",
              "source_ref": "tests/contracts/spatial_toolchain_smoke.py"}
    request = {
        "protocol_version": "spatial-sidecar-v1",
        "request_id": str(uuid.uuid4()),
        "operation": "planar_darcy_transport",
        "mesh_request": mesh_request,
        "mesh_sha256": "0" * 64,
        "refinement_factor": 1,
        "model_input_contract_version": "spatial-input-v2",
        "model_input_sha256": "1" * 64,
        "setup": {
            "regime": "steady_darcy",
            "equation_ref": "EQ-FL-003",
            "domain_tag": "porous",
            "viscosity_parameter_id": "dynamic_viscosity_pa_s",
            "permeability_parameter_id": "hydraulic_permeability_m2",
            "pressure_variable": "pressure",
            "velocity_variables": {"x": "velocity_x", "y": "velocity_y"},
            "inlet": {"tag": "west", "pressure_pa": {"value": inlet_pressure_pa, "unit": "Pa", **source}},
            "outlet": {"tag": "east", "pressure_pa": {"value": outlet_pressure_pa, "unit": "Pa", **source}},
        },
        "transport_setup": {
            "regime": "steady_advection_diffusion",
            "equation_ref": "EQ-SP-001",
            "domain_tag": "porous",
            "species_id": "neutral_tracer",
            "concentration_variable": "neutral_tracer_c",
            "velocity_variables": {"x": "velocity_x", "y": "velocity_y"},
            "inlet": {"tag": "west", "concentration_mol_m3": {
                "value": inlet_concentration_mol_m3, "unit": "mol/m3", **source}},
            "outlet": {"tag": "east", "concentration_mol_m3": {
                "value": outlet_concentration_mol_m3, "unit": "mol/m3", **source}},
        },
        "viscosity": {"value": viscosity_pa_s, "unit": "Pa*s", **source},
        "permeability": {"value": permeability_m2, "unit": "m2", **source},
        "effective_diffusivity": {"value": effective_diffusivity_m2_s, "unit": "m2/s", **source},
    }
    darcy_mobility = permeability_m2 / viscosity_pa_s
    darcy_speed = darcy_mobility * (inlet_pressure_pa - outlet_pressure_pa) / length_m
    peclet = darcy_speed * length_m / effective_diffusivity_m2_s

    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        mesh_directory = root / "mesh"
        mesh_response = run(
            json.dumps(mesh_request, separators=(",", ":")).encode(), mesh_directory
        )
        assert mesh_response["status"] == "ok", mesh_response
        mesh_record = mesh_response["artifacts"][0]
        request["mesh_sha256"] = mesh_record["sha256"]
        mesh_data = gmshio.read_from_msh(mesh_directory / mesh_record["path"], MPI.COMM_WORLD, gdim=2)
        solved_flow = solve_planar_darcy(
            mesh_data,
            porous_region_tag="region:porous",
            permeability_m2=permeability_m2,
            viscosity_pa_s=viscosity_pa_s,
            inlet_tag="boundary:west",
            outlet_tag="boundary:east",
            inlet_pressure_pa=inlet_pressure_pa,
            outlet_pressure_pa=outlet_pressure_pa,
        )
        solved_transport = solve_planar_darcy_transport(
            mesh_data,
            darcy_velocity=solved_flow.velocity,
            domain_tag="porous",
            inlet_tag="west",
            outlet_tag="east",
            wall_tags=("north", "south"),
            inlet_concentration_mol_m3=inlet_concentration_mol_m3,
            outlet_concentration_mol_m3=outlet_concentration_mol_m3,
            effective_diffusivity_m2_s=effective_diffusivity_m2_s,
            characteristic_length_m=length_m,
        )
        exact_concentration = fem.Function(solved_transport.concentration.function_space)
        exact_concentration.interpolate(
            lambda x: inlet_concentration_mol_m3
            + (outlet_concentration_mol_m3 - inlet_concentration_mol_m3)
            * (np.exp(peclet * x[0] / length_m) - 1.0)
            / (math.exp(peclet) - 1.0)
        )
        exact_concentration.x.scatter_forward()

        def global_integral(form) -> float:
            local = fem.assemble_scalar(fem.form(form))
            return mesh_data.mesh.comm.allreduce(float(local), op=MPI.SUM)

        dx = ufl.Measure("dx", domain=mesh_data.mesh)
        exact_norm = np.sqrt(global_integral(exact_concentration**2 * dx))
        concentration_error = np.sqrt(global_integral(
            (solved_transport.concentration - exact_concentration)**2 * dx
        ))
        relative_concentration_error = concentration_error / exact_norm
        expected_flux_density = darcy_speed * (
            inlet_concentration_mol_m3
            - (outlet_concentration_mol_m3 - inlet_concentration_mol_m3)
            / (math.exp(peclet) - 1.0)
        )
        expected_boundary_rate = expected_flux_density * height_m
        assert relative_concentration_error < 2e-3, relative_concentration_error
        assert math.isclose(solved_transport.peclet_number, peclet, rel_tol=1e-8)
        assert solved_transport.relative_species_balance < 2e-7
        assert solved_transport.inlet_species_rate_mol_m_s_per_depth < 0
        assert solved_transport.outlet_species_rate_mol_m_s_per_depth > 0
        assert abs(solved_transport.outlet_species_rate_mol_m_s_per_depth - expected_boundary_rate) \
            / abs(expected_boundary_rate) < 2e-3
        assert abs(solved_transport.inlet_species_rate_mol_m_s_per_depth + expected_boundary_rate) \
            / abs(expected_boundary_rate) < 2e-3
        assert abs(solved_transport.wall_species_rate_mol_m_s_per_depth) < 1e-10
        assert solved_transport.linear_converged_reason > 0

        solution_directory = root / "solution"
        response = run(
            json.dumps(request, separators=(",", ":")).encode(), solution_directory
        )
        assert response["status"] == "ok", response
        assert response["operation"] == "planar_darcy_transport"
        assert response["model_input_sha256"] == request["model_input_sha256"]
        assert response["mesh"]["sha256"] == request["mesh_sha256"]
        diagnostics = response["diagnostics"]
        assert diagnostics["darcy_linear_converged_reason"] > 0
        assert diagnostics["transport_linear_converged_reason"] > 0
        assert diagnostics["relative_flow_balance"] < 1e-8
        assert diagnostics["relative_species_balance"] < 2e-7
        assert math.isclose(diagnostics["peclet_number"], peclet, rel_tol=1e-8)
        xdmf = solution_directory / "darcy-transport-solution.xdmf"
        hdf5 = solution_directory / "darcy-transport-solution.h5"
        assert xdmf.is_file() and hdf5.is_file() and hdf5.stat().st_size > 0
        data_paths = {
            item.attrib["Name"]: (item.findtext("DataItem") or "").strip().split(":", 1)[-1]
            for item in ET.parse(xdmf).getroot().findall(".//Attribute")
        }
        assert data_paths == {
            "velocity_x": "/Function/velocity_x/0",
            "velocity_y": "/Function/velocity_y/0",
            "pressure": "/Function/pressure/0",
            "concentration": "/Function/concentration/0",
        }, data_paths
        for artifact in (response["mesh"], *response["solution_artifacts"]):
            data = (solution_directory / artifact["path"]).read_bytes()
            assert len(data) == artifact["bytes"]
            assert hashlib.sha256(data).hexdigest() == artifact["sha256"]
        return {
            "cell_count": response["mesh"]["cell_count"],
            "relative_concentration_l2_error": relative_concentration_error,
            "relative_species_balance": diagnostics["relative_species_balance"],
            "peclet_number": diagnostics["peclet_number"],
        }


def main() -> None:
    fixture = Path(__file__).resolve().parents[1] / "fixtures" / "planar-mesh-request.json"
    fixture_data = json.loads(fixture.read_text())
    layers = fixture_data["mesh"]["layers"]
    height = float(fixture_data["mesh"]["height_m"]["value"])
    imported_meshes = []
    layered_results = []
    with tempfile.TemporaryDirectory() as directory:
        response = run(fixture.read_bytes(), Path(directory))
        assert response["status"] == "ok", response
        for artifact in response["artifacts"]:
            mesh_file = Path(directory) / artifact["path"]
            imported_mesh = gmshio.read_from_msh(mesh_file, MPI.COMM_WORLD, gdim=2)
            imported_meshes.append(imported_mesh)
            layered_result = solve_layered_diffusion(imported_mesh, layers, height)
            layered_result["refinement_factor"] = artifact["refinement_factor"]
            layered_results.append(layered_result)

    imported = imported_meshes[0]
    assert len(layered_results) == len(response["artifacts"])
    assert all(
        earlier["cell_count"] < later["cell_count"]
        for earlier, later in zip(layered_results, layered_results[1:])
    ), layered_results

    # A cell mesh with porous/solid layers cannot be solved as free liquid.
    try:
        solve_planar_stokes(
            imported, liquid_region_tag="region:liquid", viscosity_pa_s=1e-3,
            wall_tags=("boundary:outer_wall",),
            inlet_tag="boundary:inlet", outlet_tag="boundary:outlet",
            traction_by_tag={
                "boundary:inlet": ufl.as_vector((0.0, 0.0)),
                "boundary:outlet": ufl.as_vector((0.0, 0.0)),
            },
        )
    except ValueError as error:
        assert "bulk-liquid-only" in str(error), error
    else:
        raise AssertionError("Multi-region mesh entered the Stokes kernel")

    stokes_results = []
    with tempfile.TemporaryDirectory() as directory:
        for refinement_factor in (1, 2, 4):
            mesh_file = Path(directory) / f"stokes-channel-{refinement_factor}.msh"
            create_stokes_channel_mesh(
                mesh_file, characteristic_length=0.002 / refinement_factor
            )
            channel = gmshio.read_from_msh(mesh_file, MPI.COMM_WORLD, gdim=2)
            viscosity_pa_s = 2e-3 if refinement_factor == 2 else 1e-3
            pressure_drop_pa = 2e-7 if refinement_factor == 4 else 1e-7
            result = solve_stokes_poiseuille(
                channel, width_m=0.01, length_m=0.01,
                viscosity_pa_s=viscosity_pa_s, pressure_drop_pa=pressure_drop_pa,
            )
            result["refinement_factor"] = refinement_factor
            stokes_results.append(result)
            if refinement_factor == 1:
                for override in (
                    {"viscosity_pa_s": 0.0},
                    {"inlet_tag": "missing:inlet", "traction_by_tag": {
                        "missing:inlet": ufl.as_vector((0.0, 0.0)),
                        "boundary:outlet": ufl.as_vector((0.0, 0.0)),
                    }},
                ):
                    options = dict(
                        liquid_region_tag="region:bulk_liquid", viscosity_pa_s=1e-3, wall_tags=("boundary:wall",),
                        inlet_tag="boundary:inlet", outlet_tag="boundary:outlet",
                        traction_by_tag={"boundary:inlet": ufl.as_vector((0.0, 0.0)),
                                         "boundary:outlet": ufl.as_vector((0.0, 0.0))},
                    )
                    options.update(override)
                    try:
                        solve_planar_stokes(channel, **options)
                    except ValueError:
                        pass
                    else:
                        raise AssertionError(f"Invalid Stokes input accepted: {override}")
    assert all(
        earlier["cell_count"] < later["cell_count"]
        for earlier, later in zip(stokes_results, stokes_results[1:])
    ), stokes_results

    assert imported.cell_tags is not None
    assert imported.facet_tags is not None
    assert imported.mesh.topology.dim == 2
    for name, dimension, tags in (
        ("region:anode", 2, imported.cell_tags.values),
        ("interface:anode:biofilm", 1, imported.facet_tags.values),
        ("boundary:inlet", 1, imported.facet_tags.values),
    ):
        group = imported.physical_groups[name]
        assert group.dim == dimension
        assert group.tag in tags, name

    error_2d, cells_2d = solve_affine(imported, (1.0, 0.0))

    with tempfile.TemporaryDirectory() as directory:
        mesh_file_3d = Path(directory) / "verification-cube.msh"
        create_tetrahedral_mesh(mesh_file_3d)
        imported_3d = gmshio.read_from_msh(mesh_file_3d, MPI.COMM_WORLD, gdim=3)
    assert imported_3d.mesh.topology.dim == 3
    assert imported_3d.cell_tags is not None and imported_3d.facet_tags is not None
    volume_group = imported_3d.physical_groups["region:verification_cube"]
    boundary_group = imported_3d.physical_groups["boundary:all_exterior"]
    assert volume_group.dim == 3 and volume_group.tag in imported_3d.cell_tags.values
    assert boundary_group.dim == 2 and boundary_group.tag in imported_3d.facet_tags.values
    error_3d, cells_3d = solve_affine(imported_3d, (1.0, 2.0, 3.0))
    sidecar_stokes = run_planar_stokes_sidecar(fixture_data["mesh"])
    sidecar_darcy = run_planar_darcy_sidecar(fixture_data["mesh"])
    sidecar_darcy_transport = run_planar_darcy_transport_sidecar(fixture_data["mesh"])

    print(
        json.dumps(
            {
                "status": "ok",
                "affine_max_error_2d": error_2d,
                "triangle_count": cells_2d,
                "layered_diffusion_refinements": layered_results,
                "stokes_poiseuille_refinements": stokes_results,
                "stokes_sidecar_operation": sidecar_stokes,
                "darcy_sidecar_operation": sidecar_darcy,
                "darcy_transport_sidecar_operation": sidecar_darcy_transport,
                "affine_max_error_3d": error_3d,
                "tetrahedron_count": cells_3d,
            }
        )
    )


if __name__ == "__main__":
    main()
