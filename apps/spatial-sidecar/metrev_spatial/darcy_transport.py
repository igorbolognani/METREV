"""Compatibility entry point for the Darcy neutral transport component."""
from .scalar_transport import PlanarScalarTransportResult, solve_planar_scalar_transport

PlanarDarcyTransportResult = PlanarScalarTransportResult


def solve_planar_darcy_transport(mesh_data, *, darcy_velocity, **parameters):
    return solve_planar_scalar_transport(mesh_data, velocity=darcy_velocity, **parameters)
