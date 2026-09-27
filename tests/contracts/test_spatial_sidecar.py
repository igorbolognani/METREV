"""Protocol and real Gmsh mesh checks; no scientific PDE is represented."""

import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
SIDECAR = ROOT / "apps" / "spatial-sidecar"
FIXTURE = ROOT / "tests" / "fixtures" / "planar-mesh-request.json"


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
            for artifact in response["artifacts"]:
                mesh = Path(directory) / artifact["path"]
                self.assertEqual(hashlib.sha256(mesh.read_bytes()).hexdigest(), artifact["sha256"])
                self.assertGreater(artifact["min_quality"], 0)
                cells.append(artifact["cell_count"])
            self.assertEqual(cells, sorted(cells))
            self.assertEqual(len(set(cells)), 3)


if __name__ == "__main__":
    unittest.main()
