"""Bounded, conservative orthogonal-grid transport verification kernel.

EQ-SP-001 restricted to isothermal, single-species transport:
    div(u c - D grad(c)) + k c = R.

Faces select Dirichlet concentration or prescribed outward diffusive flux. Optional constant velocity uses
first-order upwind fluxes. This module is deliberately isolated from case
admission: fixture coefficients and boundaries are not product data. It
supplies a reproducible 1D/2D/3D numerical baseline, not cell physics.
"""

from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Callable


class DiffusionConvergenceError(RuntimeError):
    """The bounded linear solve did not meet its declared residual tolerance."""


class NegativeConcentrationError(RuntimeError):
    """A concentration solve produced an inadmissible negative state."""


@dataclass(frozen=True)
class DiffusionResult:
    concentrations_mol_m3: tuple[float, ...]
    shape: tuple[int, ...]
    iterations: int
    relative_residual: float
    global_balance_mol_s: float


@dataclass(frozen=True)
class TransientDiffusionResult:
    final: DiffusionResult
    time_s: float
    steps: int
    step_balances_mol_s: tuple[float, ...]


def _dot(left: list[float], right: list[float]) -> float:
    return math.fsum(a * b for a, b in zip(left, right))


def _solve_bicgstab(
    apply: Callable[[list[float]], list[float]],
    rhs: list[float],
    diagonal: list[float],
    *,
    relative_tolerance: float,
    max_iterations: int,
) -> tuple[list[float], int]:
    """Solve a bounded nonsymmetric system using right Jacobi preconditioning."""
    count = len(rhs)
    scale = max(abs(value) for value in rhs)
    solution = [0.0] * count
    residual = rhs.copy()
    shadow = residual.copy()
    direction = [0.0] * count
    applied_direction = [0.0] * count
    rho_previous = alpha = omega = 1.0
    for iteration in range(1, max_iterations + 1):
        rho = _dot(shadow, residual)
        if not math.isfinite(rho) or abs(rho) <= 1e-300 or abs(omega) <= 1e-300:
            raise DiffusionConvergenceError("Advection-diffusion iteration broke down")
        beta = (rho / rho_previous) * (alpha / omega)
        direction = [r + beta * (p - omega * v) for r, p, v in zip(residual, direction, applied_direction)]
        preconditioned = [direction[i] / diagonal[i] for i in range(count)]
        applied_direction = apply(preconditioned)
        denominator = _dot(shadow, applied_direction)
        if not math.isfinite(denominator) or abs(denominator) <= 1e-300:
            raise DiffusionConvergenceError("Advection-diffusion iteration broke down")
        alpha = rho / denominator
        intermediate = [r - alpha * v for r, v in zip(residual, applied_direction)]
        if max(abs(value) for value in intermediate) / scale <= relative_tolerance:
            solution = [x + alpha * p for x, p in zip(solution, preconditioned)]
            return solution, iteration
        preconditioned_intermediate = [intermediate[i] / diagonal[i] for i in range(count)]
        applied_intermediate = apply(preconditioned_intermediate)
        norm_squared = _dot(applied_intermediate, applied_intermediate)
        if not math.isfinite(norm_squared) or norm_squared <= 1e-300:
            raise DiffusionConvergenceError("Advection-diffusion iteration broke down")
        omega = _dot(applied_intermediate, intermediate) / norm_squared
        if not math.isfinite(omega) or abs(omega) <= 1e-300:
            raise DiffusionConvergenceError("Advection-diffusion iteration broke down")
        solution = [x + alpha * p + omega * q for x, p, q in zip(solution, preconditioned, preconditioned_intermediate)]
        residual = [s - omega * t for s, t in zip(intermediate, applied_intermediate)]
        if max(abs(value) for value in residual) / scale <= relative_tolerance:
            return solution, iteration
        rho_previous = rho
    raise DiffusionConvergenceError("Advection-diffusion residual exceeded the iteration budget")


def solve_stationary_diffusion(
    *,
    lengths_m: tuple[float, ...],
    cells: tuple[int, ...],
    diffusivity_m2_s: float | tuple[float, ...],
    source_mol_m3_s: float | tuple[float, ...],
    boundary_mol_m3: Callable[[tuple[float, ...]], float],
    boundary_diffusive_flux_mol_m2_s: Callable[[tuple[float, ...]], float | None] | None = None,
    reaction_rate_s1: float | tuple[float, ...] = 0.0,
    advection_velocity_m_s: tuple[float, ...] | None = None,
    relative_tolerance: float = 1e-10,
    max_iterations: int | None = None,
    storage_rate_s1: float = 0.0,
) -> DiffusionResult:
    """Solve a bounded cell-centred finite-volume diffusion/transport fixture.

    Diffusivity is scalar isotropic, one isotropic value per cell, or one
    constant diagonal-tensor coefficient per grid axis. Positive source
    creates species; the optional first-order term ``k*c`` consumes it.
    Positive outward flux removes it. An optional prescribed diffusive flux
    replaces the Dirichlet diffusion condition on faces where it returns a
    number; returning None selects Dirichlet on that face. The
    concentration callback remains the trace for any advective inflow.
    Each internal face uses equal-and-opposite diffusive and upwind advective fluxes.
    The returned integrated balance includes physical boundary flux, storage
    and first-order consumption minus source over the whole domain, in mol/s
    for the declared geometry.
    """
    dimension = len(cells)
    if dimension not in (1, 2, 3) or len(lengths_m) != dimension:
        raise ValueError("Matching one-, two- or three-dimensional axes are required")
    if any(type(n) is not int or n < 2 or n > 64 for n in cells):
        raise ValueError("Every axis requires between 2 and 64 finite volumes")
    count = math.prod(cells)
    if count > 4096:
        raise ValueError("Verification mesh exceeds the 4096-cell bound")
    if advection_velocity_m_s is None:
        velocity = (0.0,) * dimension
    elif len(advection_velocity_m_s) == dimension:
        velocity = advection_velocity_m_s
    else:
        raise ValueError("One advection velocity is required for every axis")
    if isinstance(diffusivity_m2_s, tuple):
        if len(diffusivity_m2_s) == count:
            # Preserve the existing cellwise-isotropic input form.
            diffusivities = diffusivity_m2_s
            axis_diffusivities = [diffusivities] * dimension
        elif len(diffusivity_m2_s) == dimension:
            # A dimension-length tuple declares diagonal tensor coefficients.
            diffusivities = tuple(diffusivity_m2_s)
            axis_diffusivities = [
                (diffusivity_m2_s[axis],) * count for axis in range(dimension)
            ]
        else:
            raise ValueError("Supply one diffusivity per cell or one per spatial axis")
    else:
        diffusivities = (diffusivity_m2_s,) * count
        axis_diffusivities = [diffusivities] * dimension
    values = (*lengths_m, *diffusivities, *velocity, storage_rate_s1, relative_tolerance)
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in values):
        raise ValueError("Lengths, diffusivity, source and tolerance must be finite")
    if any(length <= 0 for length in lengths_m) or any(
        value <= 0 for values_by_axis in axis_diffusivities for value in values_by_axis
    ):
        raise ValueError("Lengths and diffusivity must be positive")
    if not 0 < relative_tolerance <= 1e-4:
        raise ValueError("Relative tolerance must lie in (0, 1e-4]")
    if storage_rate_s1 < 0:
        raise ValueError("Storage coefficient must be nonnegative")
    if isinstance(source_mol_m3_s, tuple):
        if len(source_mol_m3_s) != count:
            raise ValueError("One source value is required for every cell")
        source_values = list(source_mol_m3_s)
    else:
        source_values = [source_mol_m3_s] * count
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in source_values):
        raise ValueError("Every source value must be finite")
    if isinstance(reaction_rate_s1, tuple):
        if len(reaction_rate_s1) != count:
            raise ValueError("One reaction rate is required for every cell")
        reaction_rates = list(reaction_rate_s1)
    else:
        reaction_rates = [reaction_rate_s1] * count
    if any(
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or not math.isfinite(value)
        or value < 0
        for value in reaction_rates
    ):
        raise ValueError("Every first-order reaction rate must be finite and nonnegative")
    if max_iterations is None:
        max_iterations = 4 * count
    if type(max_iterations) is not int or not 1 <= max_iterations <= 16_384:
        raise ValueError("Iteration budget must be between 1 and 16384")
    if not callable(boundary_mol_m3):
        raise ValueError("Every face needs a boundary-value function")
    if boundary_diffusive_flux_mol_m2_s is not None and not callable(boundary_diffusive_flux_mol_m2_s):
        raise ValueError("Prescribed diffusive boundary flux must be callable")

    spacing = tuple(length / n for length, n in zip(lengths_m, cells))
    if any(step == 0 for step in spacing):
        raise ValueError("Grid spacing underflows floating-point resolution")
    strides = tuple(math.prod(cells[axis + 1 :]) for axis in range(dimension))
    volume = math.prod(spacing)
    if volume == 0 or not math.isfinite(volume):
        raise ValueError("Cell volume is not numerically representable")
    diagonal = [storage_rate_s1 + reaction_rates[index] for index in range(count)]
    rhs = source_values.copy()
    neighbors: list[list[tuple[int, float]]] = [[] for _ in range(count)]
    boundary_faces: list[tuple[int, float, float]] = []
    prescribed_diffusive_fluxes: list[tuple[float, float]] = []
    boundary_advective_fluxes: list[tuple[int, float, float | None, float]] = []

    for index in range(count):
        coordinates = tuple(index // stride % n for stride, n in zip(strides, cells))
        centre = tuple((i + 0.5) * step for i, step in zip(coordinates, spacing))
        for axis, (i, n, stride, step) in enumerate(zip(coordinates, cells, strides, spacing)):
            boundary_conductance = axis_diffusivities[axis][index] / (step * step)
            for side in (-1, 1):
                adjacent = i + side
                if 0 <= adjacent < n:
                    other = index + side * stride
                    # Series resistance across two half cells. The same
                    # coefficient is assembled on both sides of the face.
                    left, right = axis_diffusivities[axis][index], axis_diffusivities[axis][other]
                    conductance = (2 * left * right / (left + right)) / (step * step)
                    diagonal[index] += conductance
                    neighbors[index].append((other, conductance))
                    normal_velocity = side * velocity[axis]
                    if normal_velocity >= 0:
                        diagonal[index] += normal_velocity / step
                    else:
                        neighbors[index].append((other, -normal_velocity / step))
                else:
                    face = list(centre)
                    face[axis] = 0.0 if side == -1 else lengths_m[axis]
                    value = boundary_mol_m3(tuple(face))
                    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
                        raise ValueError("Boundary concentration must be finite and nonnegative")
                    prescribed_flux = (
                        None if boundary_diffusive_flux_mol_m2_s is None
                        else boundary_diffusive_flux_mol_m2_s(tuple(face))
                    )
                    if prescribed_flux is None:
                        face_conductance = 2 * boundary_conductance
                        diagonal[index] += face_conductance
                        rhs[index] += face_conductance * value
                        boundary_faces.append((index, face_conductance, float(value)))
                    else:
                        if (
                            isinstance(prescribed_flux, bool)
                            or not isinstance(prescribed_flux, (int, float))
                            or not math.isfinite(prescribed_flux)
                        ):
                            raise ValueError("Prescribed outward diffusive flux must be finite")
                        rhs[index] -= prescribed_flux / step
                        prescribed_diffusive_fluxes.append((float(prescribed_flux), volume / step))
                    normal_velocity = side * velocity[axis]
                    if normal_velocity >= 0:
                        # Advective outflow uses the cell state; only inflow
                        # takes its trace from the declared boundary value.
                        diagonal[index] += normal_velocity / step
                        boundary_advective_fluxes.append((index, normal_velocity, None, volume / step))
                    else:
                        rhs[index] -= normal_velocity * value / step
                        boundary_advective_fluxes.append((index, normal_velocity, float(value), volume / step))

    # Decide anchoring from assembled faces, not merely callback presence.
    if (
        not boundary_faces
        and storage_rate_s1 == 0
        and not any(rate > 0 for rate in reaction_rates)
        and not any(component != 0 for component in velocity)
    ):
        raise ValueError("Steady all-flux diffusion requires a reaction, storage or advective anchor")

    if any(not math.isfinite(value) or value <= 0 for value in diagonal) or any(
        not math.isfinite(value) for value in rhs
    ):
        raise ValueError("Assembled diffusion operator is not finite")

    def apply(vector: list[float]) -> list[float]:
        return [
            diagonal[i] * vector[i]
            - math.fsum(coefficient * vector[j] for j, coefficient in neighbors[i])
            for i in range(count)
        ]

    solution = [0.0] * count
    residual = rhs.copy()
    scale = max(abs(value) for value in rhs)
    if scale == 0:
        return DiffusionResult(tuple(solution), cells, 0, 0.0, 0.0)
    if any(component != 0 for component in velocity):
        solution, iterations = _solve_bicgstab(
            apply,
            rhs,
            diagonal,
            relative_tolerance=relative_tolerance,
            max_iterations=max_iterations,
        )
    else:
        preconditioned = [residual[i] / diagonal[i] for i in range(count)]
        direction = preconditioned.copy()
        old_product = _dot(residual, preconditioned)
        iterations = 0
        for iteration in range(1, max_iterations + 1):
            applied = apply(direction)
            denominator = _dot(direction, applied)
            if not math.isfinite(denominator) or denominator <= 0:
                raise DiffusionConvergenceError("Diffusion operator lost positive definiteness")
            alpha = old_product / denominator
            solution = [u + alpha * p for u, p in zip(solution, direction)]
            residual = [r - alpha * a for r, a in zip(residual, applied)]
            iterations = iteration
            if max(abs(value) for value in residual) / scale <= relative_tolerance:
                break
            preconditioned = [residual[i] / diagonal[i] for i in range(count)]
            new_product = _dot(residual, preconditioned)
            direction = [z + new_product / old_product * p for z, p in zip(preconditioned, direction)]
            old_product = new_product
        else:
            raise DiffusionConvergenceError("Diffusion residual exceeded the iteration budget")

    # Re-evaluate the true residual; the recursive CG residual can drift.
    true_residual = [b - a for b, a in zip(rhs, apply(solution))]
    relative_residual = max(abs(value) for value in true_residual) / scale
    if relative_residual > relative_tolerance:
        raise DiffusionConvergenceError("True transport residual exceeds tolerance")
    magnitude = max(max(abs(value) for value in solution), 1e-30)
    if min(solution) < -relative_tolerance * magnitude:
        raise NegativeConcentrationError("Diffusion yielded a negative concentration")
    if any(not math.isfinite(value) for value in solution):
        raise DiffusionConvergenceError("Diffusion yielded nonfinite concentrations")

    outward_flux = math.fsum(
        coefficient * (solution[index] - value) * volume
        for index, coefficient, value in boundary_faces
    )
    outward_flux += math.fsum(flux * area for flux, area in prescribed_diffusive_fluxes)
    outward_flux += math.fsum(
        normal_velocity * (solution[index] if value is None else value) * area
        for index, normal_velocity, value, area in boundary_advective_fluxes
    )
    global_balance = (
        outward_flux
        + storage_rate_s1 * math.fsum(solution) * volume
        + math.fsum(rate * value for rate, value in zip(reaction_rates, solution)) * volume
        - math.fsum(source_values) * volume
    )
    return DiffusionResult(tuple(solution), cells, iterations, relative_residual, global_balance)


def solve_transient_diffusion(
    *,
    lengths_m: tuple[float, ...],
    cells: tuple[int, ...],
    diffusivity_m2_s: float | tuple[float, ...],
    source_mol_m3_s: float,
    initial_mol_m3: tuple[float, ...],
    boundary_mol_m3: Callable[[float, tuple[float, ...]], float],
    time_step_s: float,
    steps: int,
    boundary_diffusive_flux_mol_m2_s: Callable[[float, tuple[float, ...]], float | None] | None = None,
    reaction_rate_s1: float | tuple[float, ...] = 0.0,
    advection_velocity_m_s: tuple[float, ...] | None = None,
    relative_tolerance: float = 1e-10,
) -> TransientDiffusionResult:
    """Implicit-Euler fixture for ∂c/∂t + div(u c - D grad(c)) + k c = R.

    The new state appears on every boundary, transport and first-order
    reaction term; each balance includes storage, reaction and boundary flux.
    """
    count = math.prod(cells)
    if len(initial_mol_m3) != count or any(
        isinstance(value, bool) or not isinstance(value, (int, float))
        or not math.isfinite(value) or value < 0 for value in initial_mol_m3
    ):
        raise ValueError("Every cell needs a finite, nonnegative initial concentration")
    if isinstance(time_step_s, bool) or not isinstance(time_step_s, (int, float)) or not math.isfinite(time_step_s) or time_step_s <= 0:
        raise ValueError("Time step must be finite and positive")
    if type(steps) is not int or not 1 <= steps <= 200:
        raise ValueError("Transient verification requires 1 to 200 steps")
    if not callable(boundary_mol_m3):
        raise ValueError("A time-dependent boundary function is required")
    if boundary_diffusive_flux_mol_m2_s is not None and not callable(boundary_diffusive_flux_mol_m2_s):
        raise ValueError("Time-dependent diffusive boundary flux must be callable")
    if isinstance(source_mol_m3_s, bool) or not isinstance(source_mol_m3_s, (int, float)) or not math.isfinite(source_mol_m3_s):
        raise ValueError("Transient source must be finite")
    storage = 1 / time_step_s
    if not math.isfinite(storage):
        raise ValueError("Time step yields an unrepresentable storage coefficient")
    state = initial_mol_m3
    balances = []
    for step in range(1, steps + 1):
        time = step * time_step_s
        if not math.isfinite(time):
            raise ValueError("Elapsed time is not finite")
        result = solve_stationary_diffusion(
            lengths_m=lengths_m,
            cells=cells,
            diffusivity_m2_s=diffusivity_m2_s,
            source_mol_m3_s=tuple(source_mol_m3_s + value * storage for value in state),
            boundary_diffusive_flux_mol_m2_s=(
                None
                if boundary_diffusive_flux_mol_m2_s is None
                else lambda point: boundary_diffusive_flux_mol_m2_s(time, point)
            ),
            reaction_rate_s1=reaction_rate_s1,
            storage_rate_s1=storage,
            boundary_mol_m3=lambda point: boundary_mol_m3(time, point),
            advection_velocity_m_s=advection_velocity_m_s,
            relative_tolerance=relative_tolerance,
        )
        state = result.concentrations_mol_m3
        balances.append(result.global_balance_mol_s)
    return TransientDiffusionResult(result, steps * time_step_s, steps, tuple(balances))
