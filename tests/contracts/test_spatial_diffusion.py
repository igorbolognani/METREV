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
    def test_mixed_nonzero_flux_affine_fields_all_axes_and_dimensions(self):
        for dimension in (1, 2, 3):
            n = 6
            lengths = tuple(1.0 + axis / 2 for axis in range(dimension))
            diffusion = tuple(0.2 + axis / 10 for axis in range(dimension))
            gradient = tuple(0.1 * (axis + 1) for axis in range(dimension))
            exact = lambda point: 2 + sum(g * x for g, x in zip(gradient, point))
            for anchor in range(dimension):
                for anchor_side in (0.0, lengths[anchor]):
                    def flux(point):
                        if point[anchor] == anchor_side:
                            return None
                        for axis in range(dimension):
                            if point[axis] == 0:
                                return diffusion[axis] * gradient[axis]
                            if point[axis] == lengths[axis]:
                                return -diffusion[axis] * gradient[axis]
                        raise AssertionError("Expected an exterior face")
                    result = solve_stationary_diffusion(
                        lengths_m=lengths, cells=(n,) * dimension,
                        diffusivity_m2_s=diffusion, source_mol_m3_s=0.0,
                        boundary_mol_m3=exact,
                        boundary_diffusive_flux_mol_m2_s=flux,
                    )
                    self.assertLess(abs(result.global_balance_mol_s), 1e-8)
                    for index, value in enumerate(result.concentrations_mol_m3):
                        point = tuple((index // n ** (dimension - axis - 1) % n + 0.5)
                                      * lengths[axis] / n for axis in range(dimension))
                        self.assertAlmostEqual(value, exact(point), delta=1e-8)

    def test_time_dependent_mixed_and_all_flux_manufactured_solution(self):
        for dimension in (1, 2, 3):
            n = 4
            points = [tuple((index // n ** (dimension - axis - 1) % n + 0.5) / n
                            for axis in range(dimension)) for index in range(n ** dimension)]
            for mixed in (False, True):
                def flux(time, point):
                    if mixed and point[0] == 0:
                        return None
                    return 0.2 if 0 in point else -0.2
                result = solve_transient_diffusion(
                    lengths_m=(1.0,) * dimension, cells=(n,) * dimension,
                    diffusivity_m2_s=0.2, source_mol_m3_s=1.0,
                    initial_mol_m3=tuple(2 + sum(p) for p in points),
                    boundary_mol_m3=lambda time, point: 2 + sum(point) + time,
                    boundary_diffusive_flux_mol_m2_s=flux,
                    time_step_s=0.1, steps=3,
                )
                for value, point in zip(result.final.concentrations_mol_m3, points):
                    self.assertAlmostEqual(value, 2.3 + sum(point), delta=1e-8)
                self.assertLess(max(map(abs, result.step_balances_mol_s)), 1e-8)

    def test_heterogeneous_porous_storage_and_cellwise_source_all_dimensions(self):
        for dimension in (1, 2, 3):
            count = 4 ** dimension
            epsilon = tuple(0.2 + 0.1 * (i % 4) for i in range(count))
            common = dict(
                lengths_m=(1.0,) * dimension, cells=(4,) * dimension,
                diffusivity_m2_s=0.1, porosity=epsilon,
                boundary_mol_m3=lambda time, point: 1.0,
                boundary_diffusive_flux_mol_m2_s=lambda time, point: 0.0,
                time_step_s=0.1, steps=4,
            )
            # ε dc/dt = ε with zero diffusion: c = 1 + t exactly.
            rising = solve_transient_diffusion(
                **common, initial_mol_m3=(1.0,) * count, source_mol_m3_s=epsilon,
            )
            for value in rising.final.concentrations_mol_m3:
                self.assertAlmostEqual(value, 1.4, delta=1e-9)
            initial = tuple(1.0 + (i % 3) for i in range(count))
            closed = solve_transient_diffusion(
                **common, initial_mol_m3=initial, source_mol_m3_s=0.0,
            )
            before = sum(e * c for e, c in zip(epsilon, initial)) / count
            after = sum(e * c for e, c in zip(epsilon, closed.final.concentrations_mol_m3)) / count
            self.assertAlmostEqual(before, after, delta=1e-9)
            self.assertGreaterEqual(min(closed.final.concentrations_mol_m3), min(initial))
            self.assertLessEqual(max(closed.final.concentrations_mol_m3), max(initial))
            self.assertLess(max(map(abs, closed.step_balances_mol_s)), 1e-8)
            self.assertLess(max(map(abs, rising.step_balances_mol_s)), 1e-8)
            # Bulk-volume disappearance k=ε gives uniform dc/dt=-c.
            decay = solve_transient_diffusion(
                **common, initial_mol_m3=(1.0,) * count,
                source_mol_m3_s=0.0, reaction_rate_s1=epsilon,
            )
            for value in decay.final.concentrations_mol_m3:
                self.assertAlmostEqual(value, (1 / 1.1) ** 4, delta=1e-9)

    def test_porous_storage_rejects_invalid_porosity_and_sources(self):
        common = dict(
            lengths_m=(1.0,), cells=(2,), diffusivity_m2_s=1.0,
            initial_mol_m3=(1.0, 1.0), boundary_mol_m3=lambda time, point: 1.0,
            time_step_s=0.1, steps=1,
        )
        for invalid in (0, -1, 1.1, True, float("nan"), float("inf"), (0.5,), (0.5, 0)):
            with self.subTest(porosity=invalid), self.assertRaises(ValueError):
                solve_transient_diffusion(**common, source_mol_m3_s=0.0, porosity=invalid)
        for invalid in ((1.0,), (0.0, float("nan")), (True, 0.0)):
            with self.subTest(source=invalid), self.assertRaises(ValueError):
                solve_transient_diffusion(**common, source_mol_m3_s=invalid)
        for invalid in ((0.1,), (0.1, -1), (0.1, float("inf")), True):
            with self.subTest(storage=invalid), self.assertRaises(ValueError):
                solve_stationary_diffusion(
                    lengths_m=(1.0,), cells=(2,), diffusivity_m2_s=1.0,
                    source_mol_m3_s=0.0, boundary_mol_m3=lambda point: 1.0,
                    storage_rate_s1=invalid,
                )

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

    def test_axis_aligned_anisotropic_affine_solution_in_one_two_three_dimensions(self):
        for dimension in (1, 2, 3):
            with self.subTest(dimension=dimension):
                axis_diffusivity = tuple(1e-9 * (axis + 1) for axis in range(dimension))
                result = solve_stationary_diffusion(
                    lengths_m=(1.0,) * dimension,
                    cells=(6,) * dimension,
                    diffusivity_m2_s=axis_diffusivity,
                    source_mol_m3_s=0.0,
                    boundary_mol_m3=lambda point: 1.0
                    + sum((axis + 1) * position for axis, position in enumerate(point)),
                )
                strides = tuple(math.prod(result.shape[axis + 1 :]) for axis in range(dimension))
                for index, concentration in enumerate(result.concentrations_mol_m3):
                    expected = 1.0 + sum(
                        (axis + 1) * ((index // stride % result.shape[axis] + 0.5) / result.shape[axis])
                        for axis, stride in enumerate(strides)
                    )
                    self.assertAlmostEqual(concentration, expected, delta=1e-8)
                self.assertLess(abs(result.global_balance_mol_s), 1e-15)

    def test_anisotropic_manufactured_source_refines_in_two_and_three_dimensions(self):
        for dimension, levels in ((2, (8, 16, 32)), (3, (4, 8, 12))):
            axis_diffusivity = tuple(1e-9 * (axis + 1) for axis in range(dimension))
            source = 2 * math.fsum(axis_diffusivity)

            def exact(point):
                return math.fsum(position * (1 - position) for position in point)

            errors = []
            for n in levels:
                result = solve_stationary_diffusion(
                    lengths_m=(1.0,) * dimension,
                    cells=(n,) * dimension,
                    diffusivity_m2_s=axis_diffusivity,
                    source_mol_m3_s=source,
                    boundary_mol_m3=exact,
                )
                strides = tuple(math.prod(result.shape[axis + 1 :]) for axis in range(dimension))
                error = max(
                    abs(value - exact(tuple(
                        (index // stride % n + 0.5) / n
                        for stride in strides
                    )))
                    for index, value in enumerate(result.concentrations_mol_m3)
                )
                errors.append(error)
                self.assertLess(result.relative_residual, 1e-9)
                self.assertLess(abs(result.global_balance_mol_s), 1e-15)
            self.assertLess(errors[1], errors[0] / 2)
            self.assertLess(errors[2], errors[1] / 2)

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

    def test_prescribed_zero_flux_boundaries_close_steady_and_transient_balances(self):
        for dimension, n in ((1, 6), (2, 4), (3, 3)):
            count = n**dimension
            rates = tuple(0.2 + 0.001 * index for index in range(count))
            concentration = 1.5
            steady = solve_stationary_diffusion(
                lengths_m=(1.0,) * dimension,
                cells=(n,) * dimension,
                diffusivity_m2_s=(1e-9,) * dimension,
                source_mol_m3_s=tuple(rate * concentration for rate in rates),
                reaction_rate_s1=rates,
                boundary_mol_m3=lambda _point: concentration,
                boundary_diffusive_flux_mol_m2_s=lambda _point: 0.0,
            )
            self.assertTrue(all(abs(value - concentration) < 1e-9 for value in steady.concentrations_mol_m3))
            self.assertLess(abs(steady.global_balance_mol_s), 1e-15)

            time_step = 0.1
            transient_rates = (0.4,) * count
            transient = solve_transient_diffusion(
                lengths_m=(1.0,) * dimension,
                cells=(n,) * dimension,
                diffusivity_m2_s=(1e-9,) * dimension,
                source_mol_m3_s=0.0,
                initial_mol_m3=(concentration,) * count,
                boundary_mol_m3=lambda _time, _point: 0.0,
                boundary_diffusive_flux_mol_m2_s=lambda _time, _point: 0.0,
                time_step_s=time_step,
                steps=3,
                reaction_rate_s1=transient_rates,
            )
            expected = tuple(concentration / (1 + rate * time_step) ** 3 for rate in transient_rates)
            for actual, target in zip(transient.final.concentrations_mol_m3, expected):
                self.assertAlmostEqual(actual, target, delta=1e-9)
            self.assertLess(max(abs(value) for value in transient.step_balances_mol_s), 1e-14)

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
            {"diffusivity_m2_s": (1e-9, 1e-9, 1e-9)},
            {"diffusivity_m2_s": (1e-9, 0.0)},
            {"advection_velocity_m_s": (1.0,)},
            {"advection_velocity_m_s": (1.0, float("nan"))},
            {"reaction_rate_s1": -1.0},
            {"reaction_rate_s1": float("nan")},
            {"reaction_rate_s1": (0.1,) * 15},
            {"reaction_rate_s1": (0.1,) * 15 + (-0.1,)},
            {"boundary_diffusive_flux_mol_m2_s": lambda _: float("nan")},
            {"boundary_mol_m3": lambda _: float("inf")},
        ):
            with self.subTest(changed=changed):
                with self.assertRaises(ValueError):
                    solve_stationary_diffusion(**(base | changed))
        with self.assertRaisesRegex(ValueError, "reaction, storage or advective anchor"):
            solve_stationary_diffusion(**(base | {
                "boundary_diffusive_flux_mol_m2_s": lambda _point: 0.0,
            }))
        with self.assertRaisesRegex(ValueError, "finite"):
            solve_stationary_diffusion(**(base | {
                "reaction_rate_s1": 0.5,
                "boundary_diffusive_flux_mol_m2_s": lambda _point: float("nan"),
            }))
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
