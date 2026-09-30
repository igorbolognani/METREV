"""One JSON request on stdin, one JSON response on stdout.

The caller owns authorization, persistence, the output directory and cancellation.
Mesh and restricted planar Stokes operations write files. Runtime logs go to stderr.
"""

from __future__ import annotations

import argparse
from contextlib import redirect_stdout
import hashlib
import importlib.metadata
import importlib
import json
import math
import os
from pathlib import Path
import platform
import re
import sys
import xml.etree.ElementTree as ET
import uuid

from . import PROTOCOL_VERSION, SIDECAR_VERSION

MAX_REQUEST_BYTES = 1_048_576
REGION_KINDS = {"bulk_liquid", "anode", "biofilm", "membrane", "separator", "cathode", "gas"}
BOUNDARY_ROLES = {"wall", "inlet", "outlet", "electrode"}


class RequestError(ValueError):
    pass


class SolverError(RuntimeError):
    pass


class DependencyError(RuntimeError):
    pass


def metadata() -> dict:
    def version(package: str) -> str | None:
        try:
            return importlib.metadata.version(package)
        except importlib.metadata.PackageNotFoundError:
            return None

    return {
        "sidecar_version": SIDECAR_VERSION,
        "protocol_version": PROTOCOL_VERSION,
        "python_version": platform.python_version(),
        "gmsh_version": version("gmsh"),
        "dolfinx_version": version("fenics-dolfinx") or version("dolfinx"),
        "petsc_version": version("petsc4py"),
    }


def load_gmsh():
    # The Gmsh Python loader can print linker diagnostics to stdout. Keep the
    # protocol's stdout exclusively JSON, including on dependency failures.
    with redirect_stdout(sys.stderr):
        return importlib.import_module("gmsh")


def exact_keys(obj: object, required: set[str], optional: set[str] = frozenset()) -> dict:
    if not isinstance(obj, dict) or not required.issubset(obj) or set(obj) - required - optional:
        raise RequestError(f"Expected keys {sorted(required)} and optional {sorted(optional)}")
    return obj


def sourced_length(obj: object) -> float:
    value = exact_keys(obj, {"value", "unit", "source_kind", "source_ref"},
                       {"source_locator", "conditions", "uncertainty", "uncertainty_unit"})
    number = value["value"]
    if (isinstance(number, bool) or not isinstance(number, (int, float)) or
            not math.isfinite(number) or number <= 0 or value["unit"] != "m"):
        raise RequestError("Length must be finite, positive and in m")
    if (value["source_kind"] not in {"measured", "literature", "default", "assumption", "test_fixture"}
            or not isinstance(value["source_ref"], str) or not value["source_ref"].strip()):
        raise RequestError("Each length needs an explicit scientific source")
    if ("uncertainty" in value) != ("uncertainty_unit" in value):
        raise RequestError("Uncertainty requires a matching unit")
    if "uncertainty" in value and (isinstance(value["uncertainty"], bool) or
            value["uncertainty_unit"] != "m" or
            not isinstance(value["uncertainty"], (int, float)) or value["uncertainty"] < 0):
        raise RequestError("Invalid length uncertainty")
    return float(number)


def validate_mesh(obj: object) -> dict:
    mesh = exact_keys(obj, {"geometry_version", "height_m", "layers", "boundaries",
                            "target_size_m", "refinement_factors"})
    if mesh["geometry_version"] != "planar-layers-v1":
        raise RequestError("Unsupported geometry version")
    height = sourced_length(mesh["height_m"])
    target = sourced_length(mesh["target_size_m"])
    layers = mesh["layers"]
    if not isinstance(layers, list) or not 1 <= len(layers) <= 16:
        raise RequestError("Expected 1–16 planar layers")
    tags: set[str] = set()
    width = 0.0
    for layer in layers:
        exact_keys(layer, {"tag", "kind", "width_m"}, {"component_id", "target_size_m"})
        tag = layer["tag"]
        if (not isinstance(tag, str) or not tag.isascii() or not tag or len(tag) > 64 or
                not tag[0].islower() or not all(c.islower() or c.isdigit() or c in "_-" for c in tag)
                or tag in tags or layer["kind"] not in REGION_KINDS):
            raise RequestError("Invalid or duplicate domain tag/kind")
        tags.add(tag)
        width += sourced_length(layer["width_m"])
        if "target_size_m" in layer and sourced_length(layer["target_size_m"]) > target:
            raise RequestError("Local refinement size must not exceed the global target size")
        if "component_id" in layer and (not isinstance(layer["component_id"], str) or
                                         not layer["component_id"].strip()):
            raise RequestError("Invalid component ID")
    boundaries = exact_keys(mesh["boundaries"], {"left", "right", "top", "bottom"})
    for boundary in boundaries.values():
        exact_keys(boundary, {"tag", "role"})
        tag = boundary["tag"]
        if not isinstance(tag, str) or not tag.strip() or tag in tags or boundary["role"] not in BOUNDARY_ROLES:
            raise RequestError("Invalid or duplicate boundary tag/role")
        tags.add(tag)
    factors = mesh["refinement_factors"]
    if (not isinstance(factors, list) or not 1 <= len(factors) <= 3 or
            any(isinstance(f, bool) or not isinstance(f, int) or not 1 <= f <= 16 for f in factors) or
            any(a >= b for a, b in zip(factors, factors[1:]))):
        raise RequestError("Refinement factors must be strictly increasing integers in [1,16]")
    estimate = 0.0
    for layer in layers:
        size = layer.get("target_size_m", mesh["target_size_m"])["value"] / factors[-1]
        if size == 0:
            raise RequestError("Refined mesh size is below numerical resolution")
        estimate += (height / size) * (layer["width_m"]["value"] / size)
    if estimate > 250_000:
        raise RequestError("Mesh estimate exceeds bounded development runtime")
    return mesh


def create_planar_mesh(mesh: dict, output_dir: Path) -> tuple[dict, list[dict]]:
    gmsh = load_gmsh()

    layers = mesh["layers"]
    height = mesh["height_m"]["value"]
    physical_groups: dict[str, int] = {}
    artifacts: list[dict] = []
    output_dir.mkdir(parents=True, exist_ok=True)
    for factor in mesh["refinement_factors"]:
        gmsh.initialize()
        try:
            gmsh.option.setNumber("General.Terminal", 0)
            gmsh.option.setNumber("Mesh.MshFileVersion", 4.1)
            gmsh.option.setNumber("Mesh.Binary", 0)
            gmsh.option.setNumber("Mesh.Algorithm", 6)
            gmsh.option.setNumber("Mesh.RandomFactor", 0)
            gmsh.model.add("metrev-planar-v1")
            sizes = [layer.get("target_size_m", mesh["target_size_m"])["value"] / factor
                     for layer in layers]
            xs = [0.0]
            for layer in layers:
                xs.append(xs[-1] + layer["width_m"]["value"])
            # Shared interface points use the smaller adjacent target. The
            # same points are shared by both regions, preserving conforming facets.
            point_sizes = [sizes[0], *(min(a, b) for a, b in zip(sizes, sizes[1:])), sizes[-1]]
            bottom = [gmsh.model.geo.addPoint(x, 0, 0, h) for x, h in zip(xs, point_sizes)]
            top = [gmsh.model.geo.addPoint(x, height, 0, h) for x, h in zip(xs, point_sizes)]
            vertical = [gmsh.model.geo.addLine(b, t) for b, t in zip(bottom, top)]
            floor = [gmsh.model.geo.addLine(bottom[i], bottom[i + 1]) for i in range(len(layers))]
            ceiling = [gmsh.model.geo.addLine(top[i], top[i + 1]) for i in range(len(layers))]
            surfaces = []
            for i in range(len(layers)):
                loop = gmsh.model.geo.addCurveLoop([floor[i], vertical[i + 1], -ceiling[i], -vertical[i]])
                surfaces.append(gmsh.model.geo.addPlaneSurface([loop]))
            gmsh.model.geo.synchronize()
            groups: dict[str, int] = {}

            def group(dim: int, entities: list[int], tag: int, name: str) -> None:
                gmsh.model.addPhysicalGroup(dim, entities, tag)
                gmsh.model.setPhysicalName(dim, tag, name)
                groups[name] = tag

            for i, layer in enumerate(layers):
                group(2, [surfaces[i]], i + 1, f"region:{layer['tag']}")
            for i, side in enumerate(("left", "right", "bottom", "top")):
                curves = {"left": [vertical[0]], "right": [vertical[-1]],
                          "bottom": floor, "top": ceiling}[side]
                group(1, curves, 101 + i, f"boundary:{mesh['boundaries'][side]['tag']}")
            for i in range(1, len(layers)):
                group(1, [vertical[i]], 201 + i, f"interface:{layers[i-1]['tag']}:{layers[i]['tag']}")
            gmsh.model.mesh.generate(2)
            node_tags, _, _ = gmsh.model.mesh.getNodes()
            _, element_tags, _ = gmsh.model.mesh.getElements(2)
            cells = [int(tag) for element_type in element_tags for tag in element_type]
            if not cells or not len(node_tags):
                raise RuntimeError("Generated mesh is empty")
            qualities = gmsh.model.mesh.getElementQualities(cells, "minSICN")
            minimum = min(float(q) for q in qualities)
            if not 0 < minimum <= 1:
                raise RuntimeError("Mesh has nonpositive or invalid scaled Jacobian quality")
            path = output_dir / f"mesh-{factor}.msh"
            gmsh.write(str(path))
            data = path.read_bytes()
            artifacts.append({"refinement_factor": factor, "format": "msh4", "path": path.name,
                              "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data),
                              "node_count": len(node_tags), "cell_count": len(cells), "min_quality": minimum})
            physical_groups = groups
        finally:
            gmsh.finalize()
    return physical_groups, artifacts


def validate_source_value(obj: object, unit: str, *, positive: bool = False) -> dict:
    value = exact_keys(obj, {"value", "unit", "source_kind", "source_ref"},
                       {"source_locator", "conditions", "uncertainty", "uncertainty_unit"})
    number = value["value"]
    if (isinstance(number, bool) or not isinstance(number, (int, float)) or
            not math.isfinite(number) or value["unit"] != unit or (positive and number <= 0)):
        raise RequestError(f"Expected {'positive ' if positive else ''}finite value in {unit}")
    if value["source_kind"] not in {"measured", "literature", "default", "assumption", "test_fixture"} or \
            not isinstance(value["source_ref"], str) or not value["source_ref"].strip():
        raise RequestError("Scientific values require an allowed source kind and non-empty source reference")
    if ("uncertainty" in value) != ("uncertainty_unit" in value):
        raise RequestError("Uncertainty requires a matching unit")
    if "uncertainty" in value and (isinstance(value["uncertainty"], bool) or
            not isinstance(value["uncertainty"], (int, float)) or
            not math.isfinite(value["uncertainty"]) or value["uncertainty"] < 0 or value["uncertainty_unit"] != unit):
        raise RequestError("Invalid uncertainty for scientific value")
    return value


def validate_planar_stokes_request(obj: object) -> dict:
    request = exact_keys(obj, {"protocol_version", "request_id", "operation", "mesh_request",
                               "mesh_sha256", "refinement_factor", "model_input_contract_version",
                               "model_input_sha256",
                               "setup", "viscosity"})
    if request["protocol_version"] != PROTOCOL_VERSION or request["operation"] != "planar_stokes":
        raise RequestError("Unsupported planar Stokes request")
    digest_pattern = re.compile(r"^[a-f0-9]{64}$")
    try:
        if str(uuid.UUID(request["request_id"])) != request["request_id"].lower():
            raise ValueError
    except (ValueError, AttributeError, TypeError) as exc:
        raise RequestError("Stokes request ID is malformed") from exc
    if (not isinstance(request["mesh_sha256"], str) or not digest_pattern.fullmatch(request["mesh_sha256"]) or
            not isinstance(request["model_input_sha256"], str) or not digest_pattern.fullmatch(request["model_input_sha256"])):
        raise RequestError("Stokes request IDs and input/mesh hashes are malformed")
    mesh_request = exact_keys(request["mesh_request"],
                              {"protocol_version", "request_id", "operation", "mesh"})
    try:
        if str(uuid.UUID(mesh_request["request_id"])) != mesh_request["request_id"].lower():
            raise ValueError
    except (ValueError, AttributeError, TypeError) as exc:
        raise RequestError("Nested mesh request ID is malformed") from exc
    if mesh_request["protocol_version"] != PROTOCOL_VERSION or mesh_request["operation"] != "planar_mesh":
        raise RequestError("Stokes requires the admitted planar mesh request")
    if request["model_input_contract_version"] != "spatial-input-v2":
        raise RequestError("Unsupported spatial model input contract version")
    mesh = validate_mesh(mesh_request["mesh"])
    setup = exact_keys(request["setup"], {"regime", "equation_ref", "domain_tag", "viscosity_parameter_id",
                                         "pressure_variable", "velocity_variables", "wall_tags", "inlet", "outlet"})
    if (setup["regime"] != "steady_stokes" or setup["equation_ref"] != "EQ-FL-002" or
            setup["viscosity_parameter_id"] != "dynamic_viscosity_pa_s"):
        raise RequestError("Unsupported or unbound Stokes equation setup")
    if len(mesh["layers"]) != 1 or mesh["layers"][0]["kind"] != "bulk_liquid" or \
            mesh["layers"][0]["tag"] != setup["domain_tag"]:
        raise RequestError("Stokes sidecar accepts exactly one matching bulk-liquid layer")
    refinement_factor = request["refinement_factor"]
    if (isinstance(refinement_factor, bool) or not isinstance(refinement_factor, int) or
            refinement_factor not in mesh["refinement_factors"]):
        raise RequestError("Requested mesh refinement is absent from the admitted recipe")
    validate_source_value(request["viscosity"], "Pa*s", positive=True)
    velocity = exact_keys(setup["velocity_variables"], {"x", "y"})
    if not all(isinstance(value, str) and value.strip() for value in
               (setup["domain_tag"], setup["pressure_variable"], velocity["x"], velocity["y"])):
        raise RequestError("Stokes state and domain identifiers must be non-empty")
    if len({setup["pressure_variable"], velocity["x"], velocity["y"]}) != 3:
        raise RequestError("Pressure and velocity states must have distinct identifiers")
    inlet = exact_keys(setup["inlet"], {"tag", "traction_pa"})
    outlet = exact_keys(setup["outlet"], {"tag", "traction_pa"})
    for port in (inlet, outlet):
        values = port["traction_pa"]
        if not isinstance(values, list) or len(values) != 2:
            raise RequestError("Both port tractions require explicit x and y components")
        for value in values:
            validate_source_value(value, "Pa")
    boundaries = mesh["boundaries"]
    walls = [item["tag"] for item in boundaries.values() if item["role"] == "wall"]
    declared_walls = setup["wall_tags"]
    if (not isinstance(declared_walls, list) or len(set(declared_walls)) != 2 or
            set(declared_walls) != set(walls)):
        raise RequestError("No-slip wall tags must match the two declared wall facets")
    if (inlet["tag"] == outlet["tag"] or
            not any(item["role"] == "inlet" and item["tag"] == inlet["tag"] for item in boundaries.values()) or
            not any(item["role"] == "outlet" and item["tag"] == outlet["tag"] for item in boundaries.values())):
        raise RequestError("Stokes inlet and outlet tags must match the geometry roles")
    return request


def validate_planar_darcy_request(obj: object) -> dict:
    request = exact_keys(obj, {"protocol_version", "request_id", "operation", "mesh_request",
                               "mesh_sha256", "refinement_factor", "model_input_contract_version",
                               "model_input_sha256", "setup", "viscosity", "permeability"})
    if request["protocol_version"] != PROTOCOL_VERSION or request["operation"] != "planar_darcy":
        raise RequestError("Unsupported planar Darcy request")
    digest_pattern = re.compile(r"^[a-f0-9]{64}$")
    try:
        if str(uuid.UUID(request["request_id"])) != request["request_id"].lower():
            raise ValueError
    except (ValueError, AttributeError, TypeError) as exc:
        raise RequestError("Darcy request ID is malformed") from exc
    if any(not isinstance(request[key], str) or not digest_pattern.fullmatch(request[key])
           for key in ("mesh_sha256", "model_input_sha256")):
        raise RequestError("Darcy input and mesh hashes are malformed")
    mesh_request = exact_keys(request["mesh_request"],
                              {"protocol_version", "request_id", "operation", "mesh"})
    try:
        if str(uuid.UUID(mesh_request["request_id"])) != mesh_request["request_id"].lower():
            raise ValueError
    except (ValueError, AttributeError, TypeError) as exc:
        raise RequestError("Nested mesh request ID is malformed") from exc
    if mesh_request["protocol_version"] != PROTOCOL_VERSION or mesh_request["operation"] != "planar_mesh":
        raise RequestError("Darcy requires the admitted planar mesh request")
    if request["model_input_contract_version"] != "spatial-input-v2":
        raise RequestError("Unsupported spatial model input contract version")
    mesh = validate_mesh(mesh_request["mesh"])
    setup = exact_keys(request["setup"], {"regime", "equation_ref", "domain_tag",
                                          "viscosity_parameter_id", "permeability_parameter_id",
                                          "pressure_variable", "velocity_variables", "inlet", "outlet"})
    if (setup["regime"] != "steady_darcy" or setup["equation_ref"] != "EQ-FL-003" or
            setup["viscosity_parameter_id"] != "dynamic_viscosity_pa_s" or
            setup["permeability_parameter_id"] != "hydraulic_permeability_m2"):
        raise RequestError("Unsupported or unbound Darcy equation setup")
    if (len(mesh["layers"]) != 1 or mesh["layers"][0]["kind"] not in
            {"anode", "biofilm", "separator"} or mesh["layers"][0]["tag"] != setup["domain_tag"]):
        raise RequestError("Darcy sidecar accepts one matching porous anode, biofilm or separator layer")
    refinement_factor = request["refinement_factor"]
    if (isinstance(refinement_factor, bool) or not isinstance(refinement_factor, int) or
            refinement_factor not in mesh["refinement_factors"]):
        raise RequestError("Requested mesh refinement is absent from the admitted recipe")
    validate_source_value(request["viscosity"], "Pa*s", positive=True)
    validate_source_value(request["permeability"], "m2", positive=True)
    velocity = exact_keys(setup["velocity_variables"], {"x", "y"})
    if not all(isinstance(value, str) and value.strip() for value in
               (setup["domain_tag"], setup["pressure_variable"], velocity["x"], velocity["y"])):
        raise RequestError("Darcy state and domain identifiers must be non-empty")
    if len({setup["pressure_variable"], velocity["x"], velocity["y"]}) != 3:
        raise RequestError("Pressure and velocity states must have distinct identifiers")
    sides = [(side, boundary) for side, boundary in mesh["boundaries"].items()]
    inlet = exact_keys(setup["inlet"], {"tag", "pressure_pa"})
    outlet = exact_keys(setup["outlet"], {"tag", "pressure_pa"})
    for port in (inlet, outlet):
        validate_source_value(port["pressure_pa"], "Pa")
    inlet_side = next((side for side, boundary in sides
                       if boundary["tag"] == inlet["tag"] and boundary["role"] == "inlet"), None)
    outlet_side = next((side for side, boundary in sides
                        if boundary["tag"] == outlet["tag"] and boundary["role"] == "outlet"), None)
    opposing = {inlet_side, outlet_side} in ({"left", "right"}, {"top", "bottom"})
    if (inlet_side is None or outlet_side is None or inlet_side == outlet_side or not opposing or
            len([1 for _, boundary in sides if boundary["role"] == "wall"]) != 2):
        raise RequestError("Darcy requires opposing pressure ports and exactly two no-flow walls")
    return request


def validate_planar_darcy_transport_request(obj: object) -> dict:
    keys = {"protocol_version", "request_id", "operation", "mesh_request", "mesh_sha256",
            "refinement_factor", "model_input_contract_version", "model_input_sha256", "setup",
            "transport_setup", "viscosity", "permeability", "effective_diffusivity"}
    request = exact_keys(obj, keys)
    flow_request = {key: request[key] for key in keys if key not in
                    {"transport_setup", "effective_diffusivity"}}
    flow_request["operation"] = "planar_darcy"
    validate_planar_darcy_request(flow_request)
    if request["operation"] != "planar_darcy_transport":
        raise RequestError("Unsupported Darcy transport operation")
    transport = exact_keys(request["transport_setup"],
                           {"regime", "equation_ref", "domain_tag", "species_id",
                            "concentration_variable", "velocity_variables", "inlet", "outlet"})
    if transport["regime"] != "steady_advection_diffusion" or transport["equation_ref"] != "EQ-SP-001":
        raise RequestError("Unsupported or unbound passive species transport setup")
    flow = request["setup"]
    if transport["domain_tag"] != flow["domain_tag"]:
        raise RequestError("Darcy and species transport must share one porous domain")
    velocity = exact_keys(transport["velocity_variables"], {"x", "y"})
    if velocity != flow["velocity_variables"]:
        raise RequestError("Species transport must consume the solved Darcy velocity states")
    if transport["inlet"]["tag"] != flow["inlet"]["tag"] or \
            transport["outlet"]["tag"] != flow["outlet"]["tag"]:
        raise RequestError("Species concentration ports must match Darcy pressure ports")
    if flow["inlet"]["pressure_pa"]["value"] <= flow["outlet"]["pressure_pa"]["value"]:
        raise RequestError("Darcy transport requires positive inlet-to-outlet pressure drop")
    if len({flow["pressure_variable"], velocity["x"], velocity["y"],
            transport["concentration_variable"]}) != 4:
        raise RequestError("Darcy and species transport state identifiers must be distinct")
    for port in (transport["inlet"], transport["outlet"]):
        validate_source_value(port["concentration_mol_m3"], "mol/m3")
        if port["concentration_mol_m3"]["value"] < 0:
            raise RequestError("Passive species concentration cannot be negative")
    validate_source_value(request["effective_diffusivity"], "m2/s", positive=True)
    return request


def solve_planar_stokes_request(request: dict, output_dir: Path, meta: dict) -> dict:
    try:
        from mpi4py import MPI
        import ufl
        from dolfinx import fem
        from dolfinx.io import XDMFFile, gmsh as gmshio
        from .stokes import solve_planar_stokes
    except Exception as exc:
        raise DependencyError(f"DOLFINx/PETSc Stokes dependencies are unavailable: {exc}") from exc
    mesh_request = request["mesh_request"]
    physical_groups, mesh_artifacts = create_planar_mesh(mesh_request["mesh"], output_dir)
    mesh_record = next((item for item in mesh_artifacts
                        if item["refinement_factor"] == request["refinement_factor"]), None)
    if mesh_record is None or mesh_record["sha256"] != request["mesh_sha256"]:
        raise RuntimeError("Rebuilt mesh hash differs from the admitted mesh artifact")
    mesh_path = output_dir / mesh_record["path"]
    try:
        mesh_data = gmshio.read_from_msh(mesh_path, MPI.COMM_WORLD, gdim=2)
        setup = request["setup"]
        inlet_values = [value["value"] for value in setup["inlet"]["traction_pa"]]
        outlet_values = [value["value"] for value in setup["outlet"]["traction_pa"]]
        result = solve_planar_stokes(
            mesh_data,
            liquid_region_tag=f"region:{setup['domain_tag']}",
            viscosity_pa_s=float(request["viscosity"]["value"]),
            wall_tags=tuple(f"boundary:{tag}" for tag in setup["wall_tags"]),
            inlet_tag=f"boundary:{setup['inlet']['tag']}",
            outlet_tag=f"boundary:{setup['outlet']['tag']}",
            traction_by_tag={
                f"boundary:{setup['inlet']['tag']}": ufl.as_vector(inlet_values),
                f"boundary:{setup['outlet']['tag']}": ufl.as_vector(outlet_values),
            },
        )
    except (ValueError, KeyError) as exc:
        raise RequestError(str(exc)) from exc
    except Exception as exc:
        raise SolverError(f"Stokes solve failed: {exc}") from exc

    xdmf_path = output_dir / "stokes-solution.xdmf"
    try:
        def scalar_component(index: int):
            collapsed = result.velocity.sub(index).collapse()
            return collapsed[0] if isinstance(collapsed, tuple) else collapsed

        velocity_x = scalar_component(0)
        velocity_y = scalar_component(1)
        output_space = fem.functionspace(mesh_data.mesh, ("Lagrange", 1))
        exported_velocity_x = fem.Function(output_space)
        exported_velocity_y = fem.Function(output_space)
        exported_pressure = fem.Function(output_space)
        exported_velocity_x.interpolate(velocity_x)
        exported_velocity_y.interpolate(velocity_y)
        exported_pressure.interpolate(result.pressure)
        for field in (exported_velocity_x, exported_velocity_y, exported_pressure):
            field.x.scatter_forward()
        exported_velocity_x.name = "velocity_x"
        exported_velocity_y.name = "velocity_y"
        exported_pressure.name = "pressure"
        with XDMFFile(mesh_data.mesh.comm, str(xdmf_path), "w") as xdmf:
            xdmf.write_mesh(mesh_data.mesh)
            xdmf.write_function(exported_velocity_x, 0.0)
            xdmf.write_function(exported_velocity_y, 0.0)
            xdmf.write_function(exported_pressure, 0.0)
    except Exception as exc:
        raise SolverError(f"Unable to write Stokes XDMF/HDF5 fields: {exc}") from exc
    expected_datasets = {
        "pressure": (request["setup"]["pressure_variable"], "Pa"),
        "velocity_x": (request["setup"]["velocity_variables"]["x"], "m/s"),
        "velocity_y": (request["setup"]["velocity_variables"]["y"], "m/s"),
    }
    try:
        root = ET.parse(xdmf_path).getroot()
        field_datasets = []
        for attribute in root.findall(".//Attribute"):
            field_name = attribute.attrib.get("Name")
            if field_name not in expected_datasets:
                continue
            data_item = attribute.find("DataItem")
            dataset_ref = (data_item.text or "").strip() if data_item is not None else ""
            dataset_path = dataset_ref.split(":", 1)[-1]
            expected_path = f"/Function/{field_name}/0"
            if dataset_path != expected_path:
                raise ValueError(f"Unexpected XDMF dataset path for {field_name}")
            variable_id, unit = expected_datasets[field_name]
            field_datasets.append({"variable_id": variable_id, "field_name": field_name,
                                   "dataset_path": dataset_path, "unit": unit,
                                   "domain_tag": request["setup"]["domain_tag"]})
        if {item["field_name"] for item in field_datasets} != set(expected_datasets):
            raise ValueError("XDMF output does not bind all requested Stokes states")
    except (ET.ParseError, OSError, ValueError) as exc:
        raise SolverError(f"Unable to verify Stokes XDMF field bindings: {exc}") from exc
    solution_files = []
    for path, artifact_format in ((xdmf_path, "xdmf"), (output_dir / "stokes-solution.h5", "hdf5")):
        try:
            content = path.read_bytes()
        except OSError as exc:
            raise SolverError(f"Stokes {artifact_format} output was not written") from exc
        if not content:
            raise SolverError(f"Stokes {artifact_format} output is empty")
        solution_files.append({"path": path.name, "format": artifact_format,
                               "sha256": hashlib.sha256(content).hexdigest(), "bytes": len(content)})
    for artifact in mesh_artifacts:
        if artifact["path"] != mesh_record["path"]:
            (output_dir / artifact["path"]).unlink(missing_ok=True)
    diagnostics = {
        "inlet_flow_m2_s_per_depth": result.inlet_flow_m2_s_per_depth,
        "outlet_flow_m2_s_per_depth": result.outlet_flow_m2_s_per_depth,
        "relative_flow_balance": result.relative_flow_balance,
        "mean_inlet_pressure_pa": result.mean_inlet_pressure_pa,
        "mean_outlet_pressure_pa": result.mean_outlet_pressure_pa,
        "pressure_drop_pa": result.mean_inlet_pressure_pa - result.mean_outlet_pressure_pa,
        "divergence_l2_per_s": result.divergence_l2_per_s,
        "linear_iterations": result.linear_iterations,
        "linear_converged_reason": result.linear_converged_reason,
    }
    return {"protocol_version": PROTOCOL_VERSION, "request_id": request["request_id"], "status": "ok",
            "operation": "planar_stokes", "metadata": meta,
            "model_input_contract_version": request["model_input_contract_version"],
            "model_input_sha256": request["model_input_sha256"],
            "field_representation": "lagrange_p1_interpolation",
            "mesh": mesh_record, "physical_groups": physical_groups,
            "diagnostics": diagnostics, "solution_artifacts": solution_files,
            "field_datasets": field_datasets}


def solve_planar_darcy_request(request: dict, output_dir: Path, meta: dict) -> dict:
    try:
        from mpi4py import MPI
        import ufl
        from dolfinx import fem
        from dolfinx.io import XDMFFile, gmsh as gmshio
        from .darcy import solve_planar_darcy
    except Exception as exc:
        raise DependencyError(f"DOLFINx/PETSc Darcy dependencies are unavailable: {exc}") from exc
    mesh_request = request["mesh_request"]
    physical_groups, mesh_artifacts = create_planar_mesh(mesh_request["mesh"], output_dir)
    mesh_record = next((item for item in mesh_artifacts
                        if item["refinement_factor"] == request["refinement_factor"]), None)
    if mesh_record is None or mesh_record["sha256"] != request["mesh_sha256"]:
        raise RuntimeError("Rebuilt Darcy mesh hash differs from the admitted mesh artifact")
    mesh_path = output_dir / mesh_record["path"]
    try:
        mesh_data = gmshio.read_from_msh(mesh_path, MPI.COMM_WORLD, gdim=2)
        setup = request["setup"]
        result = solve_planar_darcy(
            mesh_data,
            porous_region_tag=f"region:{setup['domain_tag']}",
            permeability_m2=float(request["permeability"]["value"]),
            viscosity_pa_s=float(request["viscosity"]["value"]),
            inlet_tag=f"boundary:{setup['inlet']['tag']}",
            outlet_tag=f"boundary:{setup['outlet']['tag']}",
            inlet_pressure_pa=float(setup["inlet"]["pressure_pa"]["value"]),
            outlet_pressure_pa=float(setup["outlet"]["pressure_pa"]["value"]),
        )
    except (ValueError, KeyError) as exc:
        raise RequestError(str(exc)) from exc
    except Exception as exc:
        raise SolverError(f"Darcy solve failed: {exc}") from exc

    xdmf_path = output_dir / "darcy-solution.xdmf"
    try:
        def scalar_component(index: int):
            collapsed = result.velocity.sub(index).collapse()
            return collapsed[0] if isinstance(collapsed, tuple) else collapsed

        output_space = fem.functionspace(mesh_data.mesh, ("Lagrange", 1))
        fields = {
            "pressure": fem.Function(output_space),
            "velocity_x": fem.Function(output_space),
            "velocity_y": fem.Function(output_space),
        }
        fields["pressure"].interpolate(result.pressure)
        fields["velocity_x"].interpolate(scalar_component(0))
        fields["velocity_y"].interpolate(scalar_component(1))
        for name, field in fields.items():
            field.x.scatter_forward()
            field.name = name
        with XDMFFile(mesh_data.mesh.comm, str(xdmf_path), "w") as xdmf:
            xdmf.write_mesh(mesh_data.mesh)
            for field in fields.values():
                xdmf.write_function(field, 0.0)
    except Exception as exc:
        raise SolverError(f"Unable to write Darcy XDMF/HDF5 fields: {exc}") from exc
    expected_datasets = {
        "pressure": (request["setup"]["pressure_variable"], "Pa"),
        "velocity_x": (request["setup"]["velocity_variables"]["x"], "m/s"),
        "velocity_y": (request["setup"]["velocity_variables"]["y"], "m/s"),
    }
    try:
        root = ET.parse(xdmf_path).getroot()
        field_datasets = []
        for attribute in root.findall(".//Attribute"):
            field_name = attribute.attrib.get("Name")
            if field_name not in expected_datasets:
                continue
            data_item = attribute.find("DataItem")
            dataset_ref = (data_item.text or "").strip() if data_item is not None else ""
            dataset_path = dataset_ref.split(":", 1)[-1]
            expected_path = f"/Function/{field_name}/0"
            if dataset_path != expected_path:
                raise ValueError(f"Unexpected XDMF dataset path for {field_name}")
            variable_id, unit = expected_datasets[field_name]
            field_datasets.append({"variable_id": variable_id, "field_name": field_name,
                                   "dataset_path": dataset_path, "unit": unit,
                                   "domain_tag": request["setup"]["domain_tag"]})
        if {item["field_name"] for item in field_datasets} != set(expected_datasets):
            raise ValueError("XDMF output does not bind all requested Darcy states")
    except (ET.ParseError, OSError, ValueError) as exc:
        raise SolverError(f"Unable to verify Darcy XDMF field bindings: {exc}") from exc
    solution_files = []
    for path, artifact_format in ((xdmf_path, "xdmf"), (output_dir / "darcy-solution.h5", "hdf5")):
        try:
            content = path.read_bytes()
        except OSError as exc:
            raise SolverError(f"Darcy {artifact_format} output was not written") from exc
        if not content:
            raise SolverError(f"Darcy {artifact_format} output is empty")
        solution_files.append({"path": path.name, "format": artifact_format,
                               "sha256": hashlib.sha256(content).hexdigest(), "bytes": len(content)})
    for artifact in mesh_artifacts:
        if artifact["path"] != mesh_record["path"]:
            (output_dir / artifact["path"]).unlink(missing_ok=True)
    diagnostics = {
        "inlet_flow_m2_s_per_depth": result.inlet_flow_m2_s_per_depth,
        "outlet_flow_m2_s_per_depth": result.outlet_flow_m2_s_per_depth,
        "relative_flow_balance": result.relative_flow_balance,
        "mean_inlet_pressure_pa": result.mean_inlet_pressure_pa,
        "mean_outlet_pressure_pa": result.mean_outlet_pressure_pa,
        "pressure_drop_pa": result.mean_inlet_pressure_pa - result.mean_outlet_pressure_pa,
        "divergence_l2_per_s": result.divergence_l2_per_s,
        "linear_iterations": result.linear_iterations,
        "linear_converged_reason": result.linear_converged_reason,
    }
    return {"protocol_version": PROTOCOL_VERSION, "request_id": request["request_id"], "status": "ok",
            "operation": "planar_darcy", "metadata": meta,
            "model_input_contract_version": request["model_input_contract_version"],
            "model_input_sha256": request["model_input_sha256"],
            "field_representation": "lagrange_p1_interpolation",
            "mesh": mesh_record, "physical_groups": physical_groups,
            "diagnostics": diagnostics, "solution_artifacts": solution_files,
            "field_datasets": field_datasets}


def solve_planar_darcy_transport_request(request: dict, output_dir: Path, meta: dict) -> dict:
    try:
        from mpi4py import MPI
        import ufl
        from dolfinx import fem
        from dolfinx.io import XDMFFile, gmsh as gmshio
        from .darcy import solve_planar_darcy
        from .darcy_transport import solve_planar_darcy_transport
    except Exception as exc:
        raise DependencyError(f"DOLFINx/PETSc Darcy transport dependencies are unavailable: {exc}") from exc
    mesh_request = request["mesh_request"]
    physical_groups, mesh_artifacts = create_planar_mesh(mesh_request["mesh"], output_dir)
    mesh_record = next((item for item in mesh_artifacts
                        if item["refinement_factor"] == request["refinement_factor"]), None)
    if mesh_record is None or mesh_record["sha256"] != request["mesh_sha256"]:
        raise RuntimeError("Rebuilt Darcy transport mesh differs from the admitted mesh artifact")
    mesh_path = output_dir / mesh_record["path"]
    try:
        mesh_data = gmshio.read_from_msh(mesh_path, MPI.COMM_WORLD, gdim=2)
        setup = request["setup"]
        flow = solve_planar_darcy(
            mesh_data,
            porous_region_tag=f"region:{setup['domain_tag']}",
            permeability_m2=float(request["permeability"]["value"]),
            viscosity_pa_s=float(request["viscosity"]["value"]),
            inlet_tag=f"boundary:{setup['inlet']['tag']}",
            outlet_tag=f"boundary:{setup['outlet']['tag']}",
            inlet_pressure_pa=float(setup["inlet"]["pressure_pa"]["value"]),
            outlet_pressure_pa=float(setup["outlet"]["pressure_pa"]["value"]),
        )
        sides = mesh_request["mesh"]["boundaries"]
        inlet_side = next(side for side, boundary in sides.items()
                          if boundary["tag"] == setup["inlet"]["tag"])
        if inlet_side in ("left", "right"):
            characteristic_length_m = math.fsum(
                float(layer["width_m"]["value"]) for layer in mesh_request["mesh"]["layers"]
            )
        else:
            characteristic_length_m = float(mesh_request["mesh"]["height_m"]["value"])
        wall_tags = tuple(boundary["tag"] for boundary in sides.values()
                          if boundary["role"] == "wall")
        transport_setup = request["transport_setup"]
        transport = solve_planar_darcy_transport(
            mesh_data,
            darcy_velocity=flow.velocity,
            domain_tag=setup["domain_tag"],
            inlet_tag=transport_setup["inlet"]["tag"],
            outlet_tag=transport_setup["outlet"]["tag"],
            wall_tags=wall_tags,
            inlet_concentration_mol_m3=float(
                transport_setup["inlet"]["concentration_mol_m3"]["value"]
            ),
            outlet_concentration_mol_m3=float(
                transport_setup["outlet"]["concentration_mol_m3"]["value"]
            ),
            effective_diffusivity_m2_s=float(request["effective_diffusivity"]["value"]),
            characteristic_length_m=characteristic_length_m,
        )
    except (ValueError, KeyError, StopIteration) as exc:
        raise RequestError(str(exc)) from exc
    except Exception as exc:
        raise SolverError(f"Darcy transport solve failed: {exc}") from exc

    xdmf_path = output_dir / "darcy-transport-solution.xdmf"
    try:
        def scalar_component(index: int):
            collapsed = flow.velocity.sub(index).collapse()
            return collapsed[0] if isinstance(collapsed, tuple) else collapsed

        output_space = fem.functionspace(mesh_data.mesh, ("Lagrange", 1))
        fields = {
            "pressure": fem.Function(output_space),
            "velocity_x": fem.Function(output_space),
            "velocity_y": fem.Function(output_space),
            "concentration": fem.Function(output_space),
        }
        fields["pressure"].interpolate(flow.pressure)
        fields["velocity_x"].interpolate(scalar_component(0))
        fields["velocity_y"].interpolate(scalar_component(1))
        fields["concentration"].interpolate(transport.concentration)
        for name, field in fields.items():
            field.x.scatter_forward()
            field.name = name
        with XDMFFile(mesh_data.mesh.comm, str(xdmf_path), "w") as xdmf:
            xdmf.write_mesh(mesh_data.mesh)
            for field in fields.values():
                xdmf.write_function(field, 0.0)
    except Exception as exc:
        raise SolverError(f"Unable to write Darcy transport XDMF/HDF5 fields: {exc}") from exc

    expected_datasets = {
        "pressure": (setup["pressure_variable"], "Pa"),
        "velocity_x": (setup["velocity_variables"]["x"], "m/s"),
        "velocity_y": (setup["velocity_variables"]["y"], "m/s"),
        "concentration": (transport_setup["concentration_variable"], "mol/m3"),
    }
    try:
        root = ET.parse(xdmf_path).getroot()
        field_datasets = []
        for attribute in root.findall(".//Attribute"):
            field_name = attribute.attrib.get("Name")
            if field_name not in expected_datasets:
                continue
            data_item = attribute.find("DataItem")
            dataset_ref = (data_item.text or "").strip() if data_item is not None else ""
            dataset_path = dataset_ref.split(":", 1)[-1]
            expected_path = f"/Function/{field_name}/0"
            if dataset_path != expected_path:
                raise ValueError(f"Unexpected XDMF dataset path for {field_name}")
            variable_id, unit = expected_datasets[field_name]
            field_datasets.append({"variable_id": variable_id, "field_name": field_name,
                                   "dataset_path": dataset_path, "unit": unit,
                                   "domain_tag": setup["domain_tag"]})
        if {item["field_name"] for item in field_datasets} != set(expected_datasets):
            raise ValueError("XDMF output does not bind all Darcy transport states")
    except (ET.ParseError, OSError, ValueError) as exc:
        raise SolverError(f"Unable to verify Darcy transport XDMF field bindings: {exc}") from exc

    solution_files = []
    for path, artifact_format in ((xdmf_path, "xdmf"),
                                  (output_dir / "darcy-transport-solution.h5", "hdf5")):
        try:
            content = path.read_bytes()
        except OSError as exc:
            raise SolverError(f"Darcy transport {artifact_format} output was not written") from exc
        if not content:
            raise SolverError(f"Darcy transport {artifact_format} output is empty")
        solution_files.append({"path": path.name, "format": artifact_format,
                               "sha256": hashlib.sha256(content).hexdigest(), "bytes": len(content)})
    for artifact in mesh_artifacts:
        if artifact["path"] != mesh_record["path"]:
            (output_dir / artifact["path"]).unlink(missing_ok=True)
    diagnostics = {
        "inlet_flow_m2_s_per_depth": flow.inlet_flow_m2_s_per_depth,
        "outlet_flow_m2_s_per_depth": flow.outlet_flow_m2_s_per_depth,
        "relative_flow_balance": flow.relative_flow_balance,
        "mean_inlet_pressure_pa": flow.mean_inlet_pressure_pa,
        "mean_outlet_pressure_pa": flow.mean_outlet_pressure_pa,
        "pressure_drop_pa": flow.mean_inlet_pressure_pa - flow.mean_outlet_pressure_pa,
        "divergence_l2_per_s": flow.divergence_l2_per_s,
        "darcy_linear_iterations": flow.linear_iterations,
        "darcy_linear_converged_reason": flow.linear_converged_reason,
        "inlet_species_rate_mol_m_s_per_depth": transport.inlet_species_rate_mol_m_s_per_depth,
        "outlet_species_rate_mol_m_s_per_depth": transport.outlet_species_rate_mol_m_s_per_depth,
        "wall_species_rate_mol_m_s_per_depth": transport.wall_species_rate_mol_m_s_per_depth,
        "relative_species_balance": transport.relative_species_balance,
        "peclet_number": transport.peclet_number,
        "minimum_concentration_mol_m3": transport.minimum_concentration_mol_m3,
        "maximum_concentration_mol_m3": transport.maximum_concentration_mol_m3,
        "transport_linear_iterations": transport.linear_iterations,
        "transport_linear_converged_reason": transport.linear_converged_reason,
    }
    return {"protocol_version": PROTOCOL_VERSION, "request_id": request["request_id"],
            "status": "ok", "operation": "planar_darcy_transport", "metadata": meta,
            "model_input_contract_version": request["model_input_contract_version"],
            "model_input_sha256": request["model_input_sha256"],
            "field_representation": "lagrange_p1_interpolation", "mesh": mesh_record,
            "physical_groups": physical_groups, "diagnostics": diagnostics,
            "solution_artifacts": solution_files, "field_datasets": field_datasets}


def run(raw: bytes, output_dir: Path | None) -> dict:
    request_id = "00000000-0000-4000-8000-000000000000"
    meta = metadata()
    try:
        if len(raw) > MAX_REQUEST_BYTES:
            raise RequestError("Request exceeds 1 MiB")
        request = json.loads(raw)
        base_keys = {"protocol_version", "request_id", "operation"}
        exact_keys(request, base_keys, {"mesh", "mesh_request", "mesh_sha256",
                                       "refinement_factor", "model_input_contract_version",
                                       "model_input_sha256", "setup", "transport_setup", "viscosity",
                                       "permeability", "effective_diffusivity"})
        try:
            if str(uuid.UUID(request["request_id"])) != request["request_id"].lower():
                raise ValueError
        except (ValueError, AttributeError, TypeError) as exc:
            raise RequestError("Invalid request ID") from exc
        request_id = request["request_id"]
        if request["protocol_version"] != PROTOCOL_VERSION:
            raise RequestError("Unsupported protocol version")
        operation = request["operation"]
        if operation == "health":
            if set(request) != {"protocol_version", "request_id", "operation"}:
                raise RequestError("Health request cannot contain additional fields")
            try:
                gmsh_ready = bool(meta["gmsh_version"] and load_gmsh())
            except Exception:
                gmsh_ready = False
            try:
                importlib.import_module("dolfinx")
                importlib.import_module("petsc4py")
                stokes_ready = gmsh_ready
            except Exception:
                stokes_ready = False
            return {"protocol_version": PROTOCOL_VERSION, "request_id": request_id, "status": "ok",
                    "operation": "health", "metadata": meta,
                    "capabilities": (["planar_mesh"] if gmsh_ready else []) +
                    (["planar_stokes", "planar_darcy", "planar_darcy_transport"] if stokes_ready else [])}
        if operation == "planar_stokes":
            request = validate_planar_stokes_request(request)
            if output_dir is None:
                raise RequestError("Stokes operation requires a private output directory")
            return solve_planar_stokes_request(request, output_dir, meta)
        if operation == "planar_darcy":
            request = validate_planar_darcy_request(request)
            if output_dir is None:
                raise RequestError("Darcy operation requires a private output directory")
            return solve_planar_darcy_request(request, output_dir, meta)
        if operation == "planar_darcy_transport":
            request = validate_planar_darcy_transport_request(request)
            if output_dir is None:
                raise RequestError("Darcy transport operation requires a private output directory")
            return solve_planar_darcy_transport_request(request, output_dir, meta)
        if operation != "planar_mesh":
            return failure(request_id, "unsupported_operation", "No solver for this operation", meta)
        request = exact_keys(request, base_keys | {"mesh"})
        mesh = validate_mesh(request.get("mesh"))
        if output_dir is None:
            raise RequestError("Mesh operation requires an output directory")
        try:
            load_gmsh()
        except Exception:
            return failure(request_id, "dependency_unavailable", "Gmsh cannot load", meta)
        physical_groups, artifacts = create_planar_mesh(mesh, output_dir)
        layers = mesh["layers"]
        return {"protocol_version": PROTOCOL_VERSION, "request_id": request_id, "status": "ok",
                "operation": "planar_mesh", "metadata": meta, "geometry_version": "planar-layers-v1",
                "input_sha256": hashlib.sha256(raw).hexdigest(),
                "physical_groups": physical_groups,
                "component_map": {layer["tag"]: layer["component_id"] for layer in layers if "component_id" in layer},
                "interfaces": [{"tag": f"interface:{a['tag']}:{b['tag']}", "from_tag": a["tag"],
                                "to_tag": b["tag"], "normal": [1, 0]}
                               for a, b in zip(layers, layers[1:])], "artifacts": artifacts}
    except (RequestError, ValueError, TypeError, json.JSONDecodeError) as exc:
        return failure(request_id, "invalid_request", str(exc), meta)
    except DependencyError as exc:
        return failure(request_id, "dependency_unavailable", str(exc), meta)
    except SolverError as exc:
        return failure(request_id, "solver_failure", str(exc), meta)
    except RuntimeError as exc:
        return failure(request_id, "mesh_failure", str(exc), meta)
    except Exception as exc:
        print(f"Unexpected sidecar exception: {exc!r}", file=sys.stderr)
        return failure(request_id, "internal_error", "Sidecar failed without a numerical result", meta)


def failure(request_id: str, code: str, message: str, meta: dict) -> dict:
    return {"protocol_version": PROTOCOL_VERSION, "request_id": request_id,
            "status": "error", "code": code, "message": message, "metadata": meta}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path)
    args = parser.parse_args()
    raw = sys.stdin.buffer.read(MAX_REQUEST_BYTES + 1)
    response = run(raw, args.output_dir)
    sys.stdout.write(json.dumps(response, allow_nan=False, separators=(",", ":")) + "\n")


if __name__ == "__main__":
    main()
