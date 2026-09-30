"""One JSON request on stdin, one JSON response on stdout.

The caller owns authorization, persistence, the output directory and cancellation.
Only the planar mesh operation writes files. Runtime logs go to stderr.
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
import sys

from . import PROTOCOL_VERSION, SIDECAR_VERSION

MAX_REQUEST_BYTES = 1_048_576
REGION_KINDS = {"bulk_liquid", "anode", "biofilm", "membrane", "separator", "cathode", "gas"}
BOUNDARY_ROLES = {"wall", "inlet", "outlet", "electrode"}


class RequestError(ValueError):
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
    if "uncertainty" in value and (value["uncertainty_unit"] != "m" or
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


def run(raw: bytes, output_dir: Path | None) -> dict:
    request_id = "00000000-0000-4000-8000-000000000000"
    meta = metadata()
    try:
        if len(raw) > MAX_REQUEST_BYTES:
            raise RequestError("Request exceeds 1 MiB")
        request = json.loads(raw)
        exact_keys(request, {"protocol_version", "request_id", "operation"}, {"mesh"})
        if (not isinstance(request["request_id"], str) or len(request["request_id"]) != 36):
            raise RequestError("Invalid request ID")
        request_id = request["request_id"]
        if request["protocol_version"] != PROTOCOL_VERSION:
            raise RequestError("Unsupported protocol version")
        operation = request["operation"]
        if operation == "health":
            if "mesh" in request:
                raise RequestError("Health request cannot contain a mesh")
            try:
                gmsh_ready = bool(meta["gmsh_version"] and load_gmsh())
            except Exception:
                gmsh_ready = False
            return {"protocol_version": PROTOCOL_VERSION, "request_id": request_id, "status": "ok",
                    "operation": "health", "metadata": meta,
                    "capabilities": ["planar_mesh"] if gmsh_ready else []}
        if operation != "planar_mesh":
            return failure(request_id, "unsupported_operation", "No solver for this operation", meta)
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
