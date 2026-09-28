"""Bounded, conservative orthogonal-grid diffusion verification kernel.

EQ-SP-001 restricted to steady, isothermal, single-species diffusion:
    div(-D grad(c)) = R.

All faces have declared Dirichlet values. This module is deliberately isolated
from case admission: fixture coefficients and boundaries are not product data.
It supplies a reproducible 1D/2D/3D numerical baseline, not cell physics.
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


def _dot(left: list[float], right: list[float]) -> float:
    return math.fsum(a * b for a, b in zip(left, right))


def solve_stationary_diffusion(
    *,
    lengths_m: tuple[float, ...],
    cells: tuple[int, ...],
    diffusivity_m2_s: float,
    source_mol_m3_s: float,
    boundary_mol_m3: Callable[[tuple[float, ...]], float],
    relative_tolerance: float = 1e-10,
    max_iterations: int | None = None,
) -> DiffusionResult:
    """Solve a bounded cell-centred finite-volume diffusion fixture.

    Positive source creates species; positive outward flux removes it. Each
    internal face uses one identical conductance in both adjacent balances.
    The returned integrated residual sums the physical boundary flux minus
    the source over the whole domain, in mol/s for the declared geometry.
    """
    dimension = len(cells)
    if dimension not in (1, 2, 3) or len(lengths_m) != dimension:
        raise ValueError("Matching one-, two- or three-dimensional axes are required")
    if any(type(n) is not int or n < 2 or n > 64 for n in cells):
        raise ValueError("Every axis requires between 2 and 64 finite volumes")
    count = math.prod(cells)
    if count > 4096:
        raise ValueError("Verification mesh exceeds the 4096-cell bound")
    values = (*lengths_m, diffusivity_m2_s, source_mol_m3_s, relative_tolerance)
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in values):
        raise ValueError("Lengths, diffusivity, source and tolerance must be finite")
    if any(length <= 0 for length in lengths_m) or diffusivity_m2_s <= 0:
        raise ValueError("Lengths and diffusivity must be positive")
    if not 0 < relative_tolerance <= 1e-4:
        raise ValueError("Relative tolerance must lie in (0, 1e-4]")
    if max_iterations is None:
        max_iterations = 4 * count
    if type(max_iterations) is not int or not 1 <= max_iterations <= 16_384:
        raise ValueError("Iteration budget must be between 1 and 16384")
    if not callable(boundary_mol_m3):
        raise ValueError("Every face needs a boundary-value function")

    spacing = tuple(length / n for length, n in zip(lengths_m, cells))
    if any(step == 0 for step in spacing):
        raise ValueError("Grid spacing underflows floating-point resolution")
    strides = tuple(math.prod(cells[axis + 1 :]) for axis in range(dimension))
    volume = math.prod(spacing)
    if volume == 0 or not math.isfinite(volume):
        raise ValueError("Cell volume is not numerically representable")
    diagonal = [0.0] * count
    rhs = [source_mol_m3_s] * count
    neighbors: list[list[tuple[int, float]]] = [[] for _ in range(count)]
    boundary_faces: list[tuple[int, float, float]] = []

    for index in range(count):
        coordinates = tuple(index // stride % n for stride, n in zip(strides, cells))
        centre = tuple((i + 0.5) * step for i, step in zip(coordinates, spacing))
        for axis, (i, n, stride, step) in enumerate(zip(coordinates, cells, strides, spacing)):
            conductance = diffusivity_m2_s / (step * step)
            for side in (-1, 1):
                adjacent = i + side
                if 0 <= adjacent < n:
                    diagonal[index] += conductance
                    neighbors[index].append((index + side * stride, conductance))
                else:
                    face = list(centre)
                    face[axis] = 0.0 if side == -1 else lengths_m[axis]
                    value = boundary_mol_m3(tuple(face))
                    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
                        raise ValueError("Boundary concentration must be finite and nonnegative")
                    face_conductance = 2 * conductance
                    diagonal[index] += face_conductance
                    rhs[index] += face_conductance * value
                    boundary_faces.append((index, face_conductance, float(value)))

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
        raise DiffusionConvergenceError("True diffusion residual exceeds tolerance")
    magnitude = max(max(abs(value) for value in solution), 1e-30)
    if min(solution) < -relative_tolerance * magnitude:
        raise NegativeConcentrationError("Diffusion yielded a negative concentration")
    if any(not math.isfinite(value) for value in solution):
        raise DiffusionConvergenceError("Diffusion yielded nonfinite concentrations")

    outward_flux = math.fsum(
        coefficient * (solution[index] - value) * volume
        for index, coefficient, value in boundary_faces
    )
    global_balance = outward_flux - source_mol_m3_s * volume * count
    return DiffusionResult(tuple(solution), cells, iterations, relative_residual, global_balance)
