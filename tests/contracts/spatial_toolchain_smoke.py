"""Pinned-container Gmsh -> DOLFINx/PETSc compatibility gate.

This is a synthetic affine Poisson solve, not a METREV cell solver. Run only
inside apps/spatial-sidecar/Dockerfile; the ordinary Python suite stays lean.
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
    with tempfile.TemporaryDirectory() as directory:
        response = run(fixture.read_bytes(), Path(directory))
        assert response["status"] == "ok", response
        mesh_file = Path(directory) / response["artifacts"][0]["path"]
        imported = gmshio.read_from_msh(mesh_file, MPI.COMM_WORLD, gdim=2)

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

    print(json.dumps({
        "status": "ok",
        "affine_max_error_2d": error_2d,
        "triangle_count": cells_2d,
        "affine_max_error_3d": error_3d,
        "tetrahedron_count": cells_3d,
    }))


if __name__ == "__main__":
    main()
