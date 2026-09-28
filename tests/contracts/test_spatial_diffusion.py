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
    solve_transient_diffusion,
)


class DiffusionKernelTest(unittest.TestCase):
    def test_layered_material_interface_flux_in_one_two_three_dimensions(self):
        for dimension in (1, 2, 3):
            with self.subTest(dimension=dimension):
                n = 12
                low, high = 1e-9, 4e-9
                expected_flux = 1 / (0.5 / low + 0.5 / high)

                def exact(point):
                    x = point[0]
                    resistance = min(x, 0.5) / low + max(x - 0.5, 0) / high
                    return 1 - expected_flux * resistance

                diffusivities = tuple(
                    low if index // n ** (dimension - 1) < n // 2 else high
                    for index in range(n ** dimension)
                )
                result = solve_stationary_diffusion(
                    lengths_m=(1.0,) * dimension,
                    cells=(n,) * dimension,
                    diffusivity_m2_s=diffusivities,
                    source_mol_m3_s=0.0,
                    boundary_mol_m3=exact,
                )
                self.assertLess(result.relative_residual, 1e-10)
                self.assertLess(abs(result.global_balance_mol_s), 1e-16)
                stride = n ** (dimension - 1)
                for index, concentration in enumerate(result.concentrations_mol_m3):
                    x = ((index // stride) + 0.5) / n
                    self.assertAlmostEqual(concentration, exact((x,)), delta=1e-8)
                for transverse in range(stride):
                    left = result.concentrations_mol_m3[(n // 2 - 1) * stride + transverse]
                    right = result.concentrations_mol_m3[(n // 2) * stride + transverse]
                    harmonic = 2 * low * high / (low + high)
                    interface_flux = harmonic * (left - right) * n
                    self.assertAlmostEqual(interface_flux, expected_flux, delta=1e-16)

    def test_upwind_advection_diffusion_conserves_and_refines_in_one_two_three_dimensions(self):
        for dimension, levels in ((1, (8, 16, 32)), (2, (8, 16, 32)), (3, (4, 8, 12))):
            with self.subTest(dimension=dimension):
                gradient = tuple(0.5 + 0.25 * axis for axis in range(dimension))
                velocity = tuple(0.2 + 0.1 * axis for axis in range(dimension))
                source = sum(a * b for a, b in zip(gradient, velocity))
                exact = lambda point: 1 + sum(a * x for a, x in zip(gradient, point))
                errors = []
                for n in levels:
                    shape = (n,) * dimension
                    result = solve_stationary_diffusion(
                        lengths_m=(1.0,) * dimension,
                        cells=shape,
                        diffusivity_m2_s=0.05,
                        source_mol_m3_s=source,
                        boundary_mol_m3=exact,
                        advection_velocity_m_s=velocity,
                    )
                    strides = tuple(math.prod(shape[axis + 1 :]) for axis in range(dimension))
                    error = max(
                        abs(value - exact(tuple(
                            (index // stride % n + 0.5) / n
                            for stride in strides
                        )))
                        for index, value in enumerate(result.concentrations_mol_m3)
                    )
                    errors.append(error)
                    self.assertLess(result.relative_residual, 1e-9)
                    self.assertLess(abs(result.global_balance_mol_s), 1e-8)
                    self.assertGreater(min(result.concentrations_mol_m3), 0)
                self.assertLess(errors[1], errors[0] / 1.5)
                self.assertLess(errors[2], errors[1] / 1.5)

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

    def test_first_order_reaction_source_balance_and_constant_state_in_all_dimensions(self):
        for dimension in (1, 2, 3):
            with self.subTest(dimension=dimension):
                count = 5**dimension
                result = solve_stationary_diffusion(
                    lengths_m=(1.0,) * dimension,
                    cells=(5,) * dimension,
                    diffusivity_m2_s=1e-9,
                    source_mol_m3_s=0.8,
                    reaction_rate_s1=0.4,
                    boundary_mol_m3=lambda _point: 2.0,
                )
                self.assertEqual(len(result.concentrations_mol_m3), count)
                for concentration in result.concentrations_mol_m3:
                    self.assertAlmostEqual(concentration, 2.0, delta=1e-9)
                self.assertLess(abs(result.global_balance_mol_s), 1e-15)

                rates = tuple(0.2 + 0.001 * index for index in range(count))
                sources = tuple(3.0 * rate for rate in rates)
                heterogeneous = solve_stationary_diffusion(
                    lengths_m=(1.0,) * dimension,
                    cells=(5,) * dimension,
                    diffusivity_m2_s=1e-9,
                    source_mol_m3_s=sources,
                    reaction_rate_s1=rates,
                    boundary_mol_m3=lambda _point: 3.0,
                )
                self.assertTrue(all(abs(value - 3.0) < 1e-9 for value in heterogeneous.concentrations_mol_m3))
                self.assertLess(abs(heterogeneous.global_balance_mol_s), 1e-15)

    def test_first_order_reaction_matches_manufactured_one_dimensional_profile(self):
        diffusivity = 1e-9
        reaction_rate = 4e-9
        decay_length = math.sqrt(reaction_rate / diffusivity)
        errors = []
        for n in (8, 16, 32):
            result = solve_stationary_diffusion(
                lengths_m=(1.0,),
                cells=(n,),
                diffusivity_m2_s=diffusivity,
                source_mol_m3_s=0.0,
                reaction_rate_s1=reaction_rate,
                boundary_mol_m3=lambda _point: 1.0,
            )
            errors.append(max(
                abs(value - math.cosh(decay_length * ((index + 0.5) / n - 0.5))
                    / math.cosh(decay_length / 2))
                for index, value in enumerate(result.concentrations_mol_m3)
            ))
            self.assertLess(abs(result.global_balance_mol_s), 1e-15)
        self.assertGreater(errors[0], errors[1] * 3)
        self.assertGreater(errors[1], errors[2] * 3)

    def test_transient_first_order_reaction_is_conservative_and_reduces_mass(self):
        for dimension, n in ((1, 8), (2, 4), (3, 3)):
            common = dict(
                lengths_m=(1.0,) * dimension,
                cells=(n,) * dimension,
                diffusivity_m2_s=0.01,
                source_mol_m3_s=0.0,
                initial_mol_m3=(1.0,) * n**dimension,
                boundary_mol_m3=lambda _time, _point: 0.0,
                time_step_s=0.1,
                steps=3,
            )
            without_reaction = solve_transient_diffusion(**common)
            rates = tuple(0.3 + 0.1 * (index % 3) for index in range(n**dimension))
            with_reaction = solve_transient_diffusion(**common, reaction_rate_s1=rates)
            self.assertLess(math.fsum(with_reaction.final.concentrations_mol_m3),
                            math.fsum(without_reaction.final.concentrations_mol_m3))
            self.assertLess(max(abs(value) for value in with_reaction.step_balances_mol_s), 1e-9)
            self.assertGreaterEqual(min(with_reaction.final.concentrations_mol_m3), 0)

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
            {"diffusivity_m2_s": (1e-9,) * 15},
            {"diffusivity_m2_s": (1e-9,) * 15 + (-1e-9,)},
            {"advection_velocity_m_s": (1.0,)},
            {"advection_velocity_m_s": (1.0, float("nan"))},
            {"reaction_rate_s1": -1.0},
            {"reaction_rate_s1": float("nan")},
            {"reaction_rate_s1": (0.1,) * 15},
            {"reaction_rate_s1": (0.1,) * 15 + (-0.1,)},
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

    def test_transient_implicit_diffusion_conserves_and_refines_in_2d_and_3d(self):
        for dimension in (2, 3):
            n = 8 if dimension == 2 else 5
            count = n ** dimension
            common = dict(
                lengths_m=(1.0,) * dimension,
                cells=(n,) * dimension,
                diffusivity_m2_s=0.05,
                source_mol_m3_s=0.0,
                initial_mol_m3=(1.0,) * count,
                boundary_mol_m3=lambda _time, _point: 0.0,
            )
            reference = solve_transient_diffusion(**common, time_step_s=0.01, steps=40)
            errors = []
            masses = []
            for dt, steps in ((0.2, 2), (0.1, 4), (0.05, 8)):
                with self.subTest(dimension=dimension, dt=dt):
                    result = solve_transient_diffusion(**common, time_step_s=dt, steps=steps)
                    self.assertAlmostEqual(result.time_s, 0.4)
                    self.assertLess(max(abs(b) for b in result.step_balances_mol_s), 1e-9)
                    self.assertGreater(min(result.final.concentrations_mol_m3), 0)
                    mass = math.fsum(result.final.concentrations_mol_m3) / count
                    self.assertLess(mass, 1)
                    masses.append(mass)
                    errors.append(abs(mass - math.fsum(reference.final.concentrations_mol_m3) / count))
            self.assertGreater(errors[0], errors[1] * 1.5)
            self.assertGreater(errors[1], errors[2] * 1.5)
            self.assertGreater(masses[0], masses[1])
            self.assertGreater(masses[1], masses[2])

    def test_transient_rejects_bad_time_and_initial_states(self):
        base = dict(
            lengths_m=(1.0,), cells=(4,), diffusivity_m2_s=1e-9,
            source_mol_m3_s=0.0, initial_mol_m3=(0.0,) * 4,
            boundary_mol_m3=lambda _time, _point: 0.0,
            time_step_s=1.0, steps=2,
        )
        for changed in (
            {"time_step_s": 0}, {"steps": 0},
            {"initial_mol_m3": (0.0, -1.0, 0.0, 0.0)},
            {"initial_mol_m3": (0.0,)},
        ):
            with self.subTest(changed=changed):
                with self.assertRaises(ValueError):
                    solve_transient_diffusion(**(base | changed))

    def test_transient_upwind_transport_conserves_and_preserves_bounds_in_2d_and_3d(self):
        for dimension, n in ((2, 5), (3, 4)):
            with self.subTest(dimension=dimension):
                result = solve_transient_diffusion(
                    lengths_m=(1.0,) * dimension,
                    cells=(n,) * dimension,
                    diffusivity_m2_s=0.05,
                    source_mol_m3_s=0.0,
                    initial_mol_m3=(1.0,) * n**dimension,
                    boundary_mol_m3=lambda _time, _point: 0.0,
                    time_step_s=0.05,
                    steps=4,
                    advection_velocity_m_s=(0.5,) + (0.0,) * (dimension - 1),
                )
                self.assertLess(max(abs(value) for value in result.step_balances_mol_s), 1e-8)
                self.assertGreaterEqual(min(result.final.concentrations_mol_m3), 0)
                self.assertLessEqual(max(result.final.concentrations_mol_m3), 1)


if __name__ == "__main__":
    unittest.main()
