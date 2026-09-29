"""Pinned-container Gmsh -> DOLFINx/PETSc numerical verification gate.

The affine Poisson, layered diffusion and Stokes channel cases are synthetic
fixtures, not a METREV cell solver. Run this only inside
apps/spatial-sidecar/Dockerfile; the ordinary Python suite stays lean.
"""

import json
from pathlib import Path
import tempfile

from mpi4py import MPI
import numpy as np
from petsc4py import PETSc
import ufl
from dolfinx import fem, mesh
from dolfinx.fem.petsc import LinearProblem
from dolfinx.io import gmsh as gmshio

from metrev_spatial.__main__ import run
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
        mesh_data, viscosity_pa_s=viscosity_pa_s,
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
            imported, viscosity_pa_s=1e-3,
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
                        viscosity_pa_s=1e-3, wall_tags=("boundary:wall",),
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

    print(
        json.dumps(
            {
                "status": "ok",
                "affine_max_error_2d": error_2d,
                "triangle_count": cells_2d,
                "layered_diffusion_refinements": layered_results,
                "stokes_poiseuille_refinements": stokes_results,
                "affine_max_error_3d": error_3d,
                "tetrahedron_count": cells_3d,
            }
        )
    )


if __name__ == "__main__":
    main()
