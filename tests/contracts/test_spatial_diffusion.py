"""Numerical verification fixtures, not experimental cell validation."""

import math
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "apps" / "spatial-sidecar"))

from metrev_spatial.diffusion import (  # noqa: E402
    DiffusionConvergenceError,
    NegativeConcentrationError,
    solve_stationary_diffusion,
)


class DiffusionKernelTest(unittest.TestCase):
    def test_affine_solution_and_global_balance_in_one_two_three_dimensions(self):
        for dimension in (1, 2, 3):
            with self.subTest(dimension=dimension):
                shape = (7,) * dimension
                result = solve_stationary_diffusion(
                    lengths_m=(1.0,) * dimension,
                    cells=shape,
                    diffusivity_m2_s=1e-9,
                    source_mol_m3_s=0.0,
                    boundary_mol_m3=lambda point: 1.0
                    + sum((axis + 1) * position for axis, position in enumerate(point)),
                )
                self.assertEqual(result.shape, shape)
                self.assertGreater(result.iterations, 0)
                self.assertLess(result.relative_residual, 1e-10)
                self.assertLess(abs(result.global_balance_mol_s), 1e-16)
                strides = tuple(math.prod(shape[axis + 1 :]) for axis in range(dimension))
                for index, actual in enumerate(result.concentrations_mol_m3):
                    expected = 1.0 + sum(
                        (axis + 1) * ((index // stride % shape[axis] + 0.5) / shape[axis])
                        for axis, stride in enumerate(strides)
                    )
                    self.assertAlmostEqual(actual, expected, delta=1e-8)

    def test_multidimensional_manufactured_source_refines_and_conserves(self):
        diffusivity = 1e-9
        for dimension, levels in ((2, (8, 16, 32)), (3, (4, 8, 12))):
            errors = []
            for n in levels:
                with self.subTest(dimension=dimension, cells_per_axis=n):
                    result = solve_stationary_diffusion(
                        lengths_m=(1.0,) * dimension,
                        cells=(n,) * dimension,
                        diffusivity_m2_s=diffusivity,
                        source_mol_m3_s=2 * diffusivity,
                        boundary_mol_m3=lambda point: point[0] * (1 - point[0]),
                    )
                    stride = n ** (dimension - 1)
                    error = max(
                        abs(value - ((index // stride + 0.5) / n)
                            * (1 - (index // stride + 0.5) / n))
                        for index, value in enumerate(result.concentrations_mol_m3)
                    )
                    errors.append(error)
                    self.assertLess(abs(result.global_balance_mol_s), 1e-16)
                    self.assertLess(result.relative_residual, 1e-10)
            for coarse, fine in zip(errors, errors[1:]):
                # The 3D coarse grids are not yet in the asymptotic regime.
                self.assertLess(fine, coarse / (3 if dimension == 2 else 2))

    def test_rejects_missing_physical_inputs_and_unresolved_or_negative_states(self):
        base = dict(
            lengths_m=(1.0, 1.0),
            cells=(4, 4),
            diffusivity_m2_s=1e-9,
            source_mol_m3_s=0.0,
            boundary_mol_m3=lambda _: 0.0,
        )
        for changed in (
            {"diffusivity_m2_s": 0},
            {"lengths_m": (1.0, float("nan"))},
            {"cells": (4, 0)},
            {"cells": (65, 4)},
            {"boundary_mol_m3": lambda _: float("inf")},
        ):
            with self.subTest(changed=changed):
                with self.assertRaises(ValueError):
                    solve_stationary_diffusion(**(base | changed))
        with self.assertRaises(DiffusionConvergenceError):
            solve_stationary_diffusion(**(base | {
                "source_mol_m3_s": 1e-9,
                "max_iterations": 1,
            }))
        with self.assertRaises(NegativeConcentrationError):
            solve_stationary_diffusion(**(base | {
                "source_mol_m3_s": -1e-9,
            }))


if __name__ == "__main__":
    unittest.main()
