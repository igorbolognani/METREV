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

    domain = imported.mesh
    space = fem.functionspace(domain, ("Lagrange", 1))
    boundary = fem.Function(space)
    boundary.interpolate(lambda x: x[0])
    exterior = mesh.locate_entities_boundary(domain, 1, lambda x: np.full(x.shape[1], True))
    dofs = fem.locate_dofs_topological(space, 1, exterior)
    assert len(dofs) > 0
    bc = fem.dirichletbc(boundary, dofs)
    trial = ufl.TrialFunction(space)
    test = ufl.TestFunction(space)
    bilinear = ufl.inner(ufl.grad(trial), ufl.grad(test)) * ufl.dx
    linear = fem.Constant(domain, PETSc.ScalarType(0)) * test * ufl.dx
    problem = LinearProblem(
        bilinear, linear, bcs=[bc], petsc_options_prefix="metrev_toolchain_smoke_",
        petsc_options={"ksp_type": "preonly", "pc_type": "lu", "ksp_error_if_not_converged": True},
    )
    solved = problem.solve()
    error = np.max(np.abs(solved.x.array - boundary.x.array))
    assert np.isfinite(error) and error < 1e-10, error
    print(json.dumps({"status": "ok", "affine_max_error": float(error),
                      "cell_count": len(imported.cell_tags.values)}))


if __name__ == "__main__":
    main()
