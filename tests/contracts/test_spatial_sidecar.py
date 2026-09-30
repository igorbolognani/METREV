"""Protocol and real Gmsh mesh checks; no scientific PDE is represented."""

import hashlib
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
SIDECAR = ROOT / "apps" / "spatial-sidecar"
sys.path.insert(0, str(SIDECAR))
FIXTURE = ROOT / "tests" / "fixtures" / "planar-mesh-request.json"
MESH_AREA_RELATIVE_TOLERANCE = 1e-10


class SidecarTest(unittest.TestCase):
    def call(self, request, directory=None):
        command = [sys.executable, "-m", "metrev_spatial"]
        if directory:
            command += ["--output-dir", str(directory)]
        raw = json.dumps(request, separators=(",", ":")).encode()
        output = subprocess.run(command, input=raw, cwd=SIDECAR, capture_output=True, check=True, timeout=30)
        return json.loads(output.stdout), raw

    def test_protocol_and_invalid_input(self):
        fixture = json.loads(FIXTURE.read_text())
        health, _ = self.call({"protocol_version": "spatial-sidecar-v1", "request_id": fixture["request_id"], "operation": "health"})
        self.assertEqual(health["status"], "ok")
        self.assertEqual(health["metadata"]["protocol_version"], "spatial-sidecar-v1")
        fixture["mesh"]["height_m"]["unit"] = "s"
        with tempfile.TemporaryDirectory() as directory:
            response, _ = self.call(fixture, directory)
        self.assertEqual(response["code"], "invalid_request")

    def test_source_traced_layer_refinement_is_bounded(self):
        fixture = json.loads(FIXTURE.read_text())
        layer = fixture["mesh"]["layers"][1]
        layer["target_size_m"] = {**fixture["mesh"]["target_size_m"], "value": 0.0005}
        from metrev_spatial.__main__ import validate_mesh
        self.assertEqual(validate_mesh(fixture["mesh"])["layers"][1], layer)
        for value, unit in ((0.003, "m"), (0.0005, "s"), (0, "m"), (0.000001, "m"), (1e-320, "m")):
            layer["target_size_m"].update(value=value, unit=unit)
            with self.assertRaises(ValueError):
                validate_mesh(fixture["mesh"])

    def stokes_request(self):
        fixture = json.loads(FIXTURE.read_text())
        mesh = fixture["mesh"]
        mesh["layers"] = [mesh["layers"][2]]
        mesh["boundaries"]["left"] = {"tag": "west", "role": "wall"}
        mesh["boundaries"]["right"] = {"tag": "east", "role": "wall"}
        mesh["refinement_factors"] = [1]
        source = {"value": 0.0, "unit": "Pa", "source_kind": "test_fixture",
                  "source_ref": "test-fixture://stokes"}
        return {
            "protocol_version": "spatial-sidecar-v1",
            "request_id": "1b3f2f7a-b7c8-4fbb-a8e3-0830db3e06d4",
            "operation": "planar_stokes",
            "mesh_request": {**fixture, "mesh": mesh},
            "mesh_sha256": "a" * 64,
            "refinement_factor": 1,
            "model_input_contract_version": "spatial-input-v2",
            "model_input_sha256": "b" * 64,
            "setup": {
                "regime": "steady_stokes",
                "equation_ref": "EQ-FL-002",
                "domain_tag": "liquid",
                "viscosity_parameter_id": "dynamic_viscosity_pa_s",
                "pressure_variable": "p",
                "velocity_variables": {"x": "ux", "y": "uy"},
                "wall_tags": ["west", "east"],
                "inlet": {"tag": "inlet", "traction_pa": [{**source}, {**source, "value": 1.0}]},
                "outlet": {"tag": "outlet", "traction_pa": [{**source}, {**source}]},
            },
            "viscosity": {"value": 1e-3, "unit": "Pa*s", "source_kind": "test_fixture",
                          "source_ref": "test-fixture://stokes"},
        }

    def test_stokes_request_is_source_and_geometry_bound(self):
        from metrev_spatial.__main__ import validate_planar_stokes_request

        request = self.stokes_request()
        self.assertIs(validate_planar_stokes_request(request), request)
        malformed = json.loads(json.dumps(request))
        malformed["mesh_sha256"] = "A" * 64
        with self.assertRaises(ValueError):
            validate_planar_stokes_request(malformed)
        malformed = json.loads(json.dumps(request))
        malformed["mesh_request"]["request_id"] = "not-a-uuid"
        with self.assertRaises(ValueError):
            validate_planar_stokes_request(malformed)
        malformed = json.loads(json.dumps(request))
        malformed["setup"]["velocity_variables"]["y"] = "ux"
        with self.assertRaises(ValueError):
            validate_planar_stokes_request(malformed)
        malformed = json.loads(json.dumps(request))
        malformed["refinement_factor"] = True
        with self.assertRaises(ValueError):
            validate_planar_stokes_request(malformed)
        malformed = json.loads(json.dumps(request))
        malformed["viscosity"]["uncertainty"] = True
        malformed["viscosity"]["uncertainty_unit"] = "Pa*s"
        with self.assertRaises(ValueError):
            validate_planar_stokes_request(malformed)

    @unittest.skipUnless(os.getenv("METREV_REQUIRE_GMSH") == "1", "Install pinned Gmsh for mesh gate")
    def test_single_liquid_channel_retains_all_exterior_physical_groups(self):
        fixture = json.loads(FIXTURE.read_text())
        fixture["mesh"]["layers"] = [fixture["mesh"]["layers"][2]]
        fixture["mesh"]["boundaries"]["left"] = {"tag": "west", "role": "wall"}
        fixture["mesh"]["boundaries"]["right"] = {"tag": "east", "role": "wall"}
        fixture["mesh"]["refinement_factors"] = [1]
        with tempfile.TemporaryDirectory() as directory:
            response, _ = self.call(fixture, directory)
            self.assertEqual(response["status"], "ok", response)
            self.assertEqual(response["interfaces"], [])
            self.assertEqual(set(response["physical_groups"]), {
                "region:liquid", "boundary:west", "boundary:east",
                "boundary:inlet", "boundary:outlet",
            })
            self.assertGreater(response["artifacts"][0]["cell_count"], 0)

    @unittest.skipUnless(os.getenv("METREV_REQUIRE_GMSH") == "1", "Install pinned Gmsh for mesh gate")
    def test_local_refinement_increases_biofilm_resolution_without_changing_tags(self):
        from metrev_spatial.__main__ import create_planar_mesh
        fixture = json.loads(FIXTURE.read_text())["mesh"]
        fixture["refinement_factors"] = [1]
        with tempfile.TemporaryDirectory() as directory:
            baseline_groups, baseline = create_planar_mesh(fixture, Path(directory) / "uniform")
            fixture["layers"][1]["target_size_m"] = {**fixture["target_size_m"], "value": 0.0004}
            groups, local = create_planar_mesh(fixture, Path(directory) / "local")
            self.assertEqual(groups, baseline_groups)
            import gmsh
            def region_cells(path):
                gmsh.initialize()
                try:
                    gmsh.option.setNumber("General.Terminal", 0)
                    gmsh.open(str(path))
                    tagged = {}
                    for _, tag in gmsh.model.getPhysicalGroups(2):
                        name = gmsh.model.getPhysicalName(2, tag)
                        tagged[name] = sum(len(elements) for surface in gmsh.model.getEntitiesForPhysicalGroup(2, tag)
                                           for elements in gmsh.model.mesh.getElements(2, surface)[1])
                    return tagged
                finally:
                    gmsh.finalize()
            uniform = region_cells(Path(directory) / "uniform" / baseline[0]["path"])
            refined = region_cells(Path(directory) / "local" / local[0]["path"])
            self.assertEqual(set(refined), set(uniform))
            self.assertGreater(refined["region:biofilm"], uniform["region:biofilm"])

    @unittest.skipUnless(os.getenv("METREV_REQUIRE_GMSH") == "1", "Install pinned Gmsh for mesh gate")
    def test_three_real_meshes_and_physical_groups(self):
        fixture = json.loads(FIXTURE.read_text())
        with tempfile.TemporaryDirectory() as directory:
            response, raw = self.call(fixture, directory)
            self.assertEqual(response["status"], "ok", response)
            self.assertEqual(response["input_sha256"], hashlib.sha256(raw).hexdigest())
            self.assertEqual(len(response["artifacts"]), 3)
            self.assertEqual(response["interfaces"][0]["normal"], [1, 0])
            self.assertEqual(response["physical_groups"]["region:anode"], 1)
            self.assertIn("boundary:inlet", response["physical_groups"])
            self.assertIn("interface:anode:biofilm", response["physical_groups"])
            cells = []
            mesh = fixture["mesh"]
            expected_region_areas = {
                f"region:{layer['tag']}": layer["width_m"]["value"]
                * mesh["height_m"]["value"]
                for layer in mesh["layers"]
            }
            height = mesh["height_m"]["value"]
            total_width = sum(layer["width_m"]["value"] for layer in mesh["layers"])
            expected_curve_lengths = {
                f"boundary:{mesh['boundaries'][side]['tag']}": (
                    height if side in ("left", "right") else total_width
                )
                for side in ("left", "right", "top", "bottom")
            }
            interface_positions = {}
            boundary_positions = {
                f"boundary:{mesh['boundaries']['left']['tag']}": (0, None),
                f"boundary:{mesh['boundaries']['right']['tag']}": (total_width, None),
                f"boundary:{mesh['boundaries']['bottom']['tag']}": (None, 0),
                f"boundary:{mesh['boundaries']['top']['tag']}": (None, height),
            }
            position = 0.0
            for left, right in zip(mesh["layers"], mesh["layers"][1:]):
                position += left["width_m"]["value"]
                name = f"interface:{left['tag']}:{right['tag']}"
                expected_curve_lengths[name] = height
                interface_positions[name] = position
            import gmsh

            for artifact in response["artifacts"]:
                mesh_file = Path(directory) / artifact["path"]
                self.assertEqual(
                    hashlib.sha256(mesh_file.read_bytes()).hexdigest(),
                    artifact["sha256"],
                )
                self.assertGreater(artifact["min_quality"], 0)
                cells.append(artifact["cell_count"])
                gmsh.initialize()
                try:
                    gmsh.option.setNumber("General.Terminal", 0)
                    gmsh.open(str(mesh_file))
                    node_tags, coordinates, _ = gmsh.model.mesh.getNodes()
                    points = {
                        int(tag): (coordinates[3 * index], coordinates[3 * index + 1])
                        for index, tag in enumerate(node_tags)
                    }
                    region_areas = {}
                    for _, physical_tag in gmsh.model.getPhysicalGroups(2):
                        name = gmsh.model.getPhysicalName(2, physical_tag)
                        area_terms = []
                        for entity_tag in gmsh.model.getEntitiesForPhysicalGroup(
                            2, physical_tag
                        ):
                            element_types, _, connectivity = gmsh.model.mesh.getElements(
                                2, entity_tag
                            )
                            for element_type, node_ids in zip(
                                element_types, connectivity
                            ):
                                (
                                    element_name,
                                    dimension,
                                    _,
                                    node_count,
                                    _,
                                    _,
                                ) = gmsh.model.mesh.getElementProperties(element_type)
                                self.assertEqual(
                                    (element_name, dimension, node_count),
                                    ("Triangle 3", 2, 3),
                                )
                                for offset in range(0, len(node_ids), node_count):
                                    first, second, third = (
                                        points[int(node_id)]
                                        for node_id in node_ids[
                                            offset : offset + node_count
                                        ]
                                    )
                                    area_terms.append(
                                        abs(
                                            (second[0] - first[0])
                                            * (third[1] - first[1])
                                            - (third[0] - first[0])
                                            * (second[1] - first[1])
                                        )
                                        / 2
                                    )
                        region_areas[name] = math.fsum(area_terms)
                    self.assertEqual(set(region_areas), set(expected_region_areas))
                    for region, expected_area in expected_region_areas.items():
                        relative_error = (
                            abs(region_areas[region] - expected_area) / expected_area
                        )
                        self.assertLessEqual(
                            relative_error,
                            MESH_AREA_RELATIVE_TOLERANCE,
                            f"{region} area error {relative_error:.3g} exceeds "
                            f"{MESH_AREA_RELATIVE_TOLERANCE:g}",
                        )
                    curve_lengths = {}
                    for _, physical_tag in gmsh.model.getPhysicalGroups(1):
                        name = gmsh.model.getPhysicalName(1, physical_tag)
                        lengths = []
                        for entity_tag in gmsh.model.getEntitiesForPhysicalGroup(
                            1, physical_tag
                        ):
                            element_types, _, connectivity = gmsh.model.mesh.getElements(
                                1, entity_tag
                            )
                            for element_type, node_ids in zip(
                                element_types, connectivity
                            ):
                                properties = gmsh.model.mesh.getElementProperties(
                                    element_type
                                )
                                self.assertEqual(
                                    (properties[0], properties[1], properties[3]),
                                    ("Line 2", 1, 2),
                                )
                                for offset in range(0, len(node_ids), 2):
                                    first, second = (
                                        points[int(node_id)]
                                        for node_id in node_ids[offset : offset + 2]
                                    )
                                    if name in interface_positions:
                                        for node in (first, second):
                                            self.assertLessEqual(
                                                abs(node[0] - interface_positions[name]),
                                                total_width * MESH_AREA_RELATIVE_TOLERANCE,
                                            )
                                    if name in boundary_positions:
                                        for node in (first, second):
                                            for coordinate, expected in zip(
                                                node, boundary_positions[name]
                                            ):
                                                if expected is not None:
                                                    self.assertLessEqual(
                                                        abs(coordinate - expected),
                                                        max(height, total_width)
                                                        * MESH_AREA_RELATIVE_TOLERANCE,
                                                    )
                                    lengths.append(math.dist(first, second))
                        curve_lengths[name] = math.fsum(lengths)
                    self.assertEqual(set(curve_lengths), set(expected_curve_lengths))
                    for name, expected_length in expected_curve_lengths.items():
                        self.assertLessEqual(
                            abs(curve_lengths[name] - expected_length)
                            / expected_length,
                            MESH_AREA_RELATIVE_TOLERANCE,
                            f"{name} does not preserve its analytic length",
                        )
                finally:
                    gmsh.finalize()
            self.assertLess(cells[0], cells[1])
            self.assertLess(cells[1], cells[2])
            self.assertEqual(cells, sorted(cells))
            self.assertEqual(len(set(cells)), 3)


if __name__ == "__main__":
    unittest.main()
